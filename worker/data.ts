/**
 * API data umum: POST /api/data  { op, collection, id?, filters?, data?, merge? }
 *
 * Aturan akses (pengganti firestore.rules):
 * - Wajib login. Akun "pending"/"rejected" hanya bisa membaca profilnya sendiri & menulis log aktivitas.
 * - Tim internal (owner, konsultan, tim grup, tim konten, staf) membaca & menulis data operasional.
 * - Klien hanya melihat data dengan clientId miliknya, dan hanya boleh mengubah
 *   status tugas, persetujuan konten, dan penilaian sesi miliknya.
 * - Catatan internal sesi (session_internals) khusus tim.
 * - Hanya Owner yang dapat membuat, mengubah peran/status, atau menghapus pengguna.
 */
import { HttpError, json, readJson } from './http';
import { Doc, Env, Profile, isActive, isClient, isOwner, isTeam } from './env';
import { COLLECTION_RE, Filter, deleteDoc, getDoc, putDoc, queryDocs } from './docs';

const TEAM_ONLY = new Set([
  'session_internals',
  'client_consultants',
  'group_attendance',
  'session_audits',
  'team_checkins',
  'plan_items',
  'pending_registrations',
]);

// Dapat dibaca klien bila clientId cocok.
const CLIENT_SCOPED = new Set([
  'clients',
  'sessions',
  'tasks',
  'feedback',
  'content_consents',
  'enrollments',
  'diagnoses',
  'roadmap_items',
  'kpis',
  'documents',
  'group_members',
  'activity_log',
]);

// Katalog yang boleh dibaca semua pengguna aktif.
const ACTIVE_READ = new Set(['programs', 'groups', 'group_announcements', 'content_items']);

// Koleksi yang boleh diubah klien (untuk data miliknya sendiri).
const CLIENT_UPDATABLE = new Set(['tasks', 'content_consents', 'feedback']);
const CLIENT_CREATABLE = new Set(['feedback']);

const SELF_EDITABLE_USER_FIELDS = new Set(['avatarUrl', 'displayName', 'phone', 'updatedAt']);

const KNOWN = new Set([...TEAM_ONLY, ...CLIENT_SCOPED, ...ACTIVE_READ, 'users']);

function docClientId(collection: string, id: string, doc: Doc | null): string | undefined {
  if (!doc) return undefined;
  if (collection === 'clients') return id;
  return typeof doc.clientId === 'string' ? doc.clientId : undefined;
}

function changedKeys(before: Doc, after: Doc): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

export function canRead(me: Profile, collection: string, id: string, doc: Doc | null): boolean {
  if (collection === 'users') return isActive(me) || id === me.id;
  if (TEAM_ONLY.has(collection)) return isTeam(me);
  if (ACTIVE_READ.has(collection)) return isActive(me);
  if (CLIENT_SCOPED.has(collection)) {
    if (isTeam(me)) return true;
    if (!isClient(me) || !me.clientId) return false;
    // Dokumen belum ada: izinkan cek keberadaan hanya untuk id clients miliknya sendiri.
    if (!doc) return collection === 'clients' && id === me.clientId;
    return docClientId(collection, id, doc) === me.clientId;
  }
  return false;
}

export function canWrite(
  me: Profile,
  collection: string,
  id: string,
  before: Doc | null,
  after: Doc | null
): boolean {
  if (collection === 'users') {
    if (isOwner(me)) return true;
    // Pengguna hanya boleh mengubah data dasar profilnya sendiri.
    if (id === me.id && before && after) {
      return changedKeys(before, after).every((k) => SELF_EDITABLE_USER_FIELDS.has(k));
    }
    return false;
  }

  if (collection === 'activity_log') {
    // Log hanya bisa ditambah oleh siapa pun yang login; ubah/hapus khusus owner.
    return before ? isOwner(me) : !!after;
  }

  if (isTeam(me)) return KNOWN.has(collection);

  if (isClient(me) && me.clientId && CLIENT_UPDATABLE.has(collection) && after) {
    const mine = (d: Doc | null) => !!d && docClientId(collection, id, d) === me.clientId;
    if (before) return mine(before) && mine(after);
    return CLIENT_CREATABLE.has(collection) && mine(after);
  }

  return false;
}

/** Nilai khusus dari klien: { "__delete": true } = hapus field (seperti deleteField()). */
function applyPatch(base: Doc, patch: Doc): Doc {
  const out: Doc = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && (v as Doc).__delete === true) {
      delete out[k];
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

interface DataRequest {
  op: 'get' | 'query' | 'set' | 'update' | 'delete';
  collection: string;
  id?: string;
  filters?: Filter[];
  data?: Doc;
  merge?: boolean;
}

export async function handleData(request: Request, env: Env, me: Profile | null): Promise<Response> {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  if (!me) throw new HttpError(401, 'Silakan login terlebih dahulu.');

  const body = await readJson<DataRequest>(request);
  const { op, collection } = body;
  if (!COLLECTION_RE.test(collection || '') || !KNOWN.has(collection)) {
    throw new HttpError(403, `Koleksi tidak diizinkan: ${collection}`);
  }
  const id = body.id;
  if (op !== 'query' && (typeof id !== 'string' || !id || id.length > 200 || id.includes('/'))) {
    throw new HttpError(400, 'ID dokumen tidak valid.');
  }
  const db = env.DB;

  if (op === 'get') {
    const doc = await getDoc(db, collection, id!);
    if (!canRead(me, collection, id!, doc)) throw new HttpError(403, 'Akses ditolak.');
    return json({ exists: !!doc, data: doc });
  }

  if (op === 'query') {
    const filters = Array.isArray(body.filters) ? body.filters : [];
    let onlyClientId: string | undefined;
    if (collection === 'users') {
      if (!isActive(me)) {
        const self = await getDoc(db, 'users', me.id);
        return json({ docs: self ? [{ id: me.id, data: self }] : [] });
      }
    } else if (TEAM_ONLY.has(collection)) {
      if (!isTeam(me)) throw new HttpError(403, 'Akses ditolak.');
    } else if (ACTIVE_READ.has(collection)) {
      if (!isActive(me)) throw new HttpError(403, 'Akses ditolak.');
    } else if (CLIENT_SCOPED.has(collection)) {
      if (!isTeam(me)) {
        if (!isClient(me)) throw new HttpError(403, 'Akses ditolak.');
        onlyClientId = me.clientId || '__none__';
      }
    }
    const docs = await queryDocs(db, collection, filters, onlyClientId);
    return json({ docs });
  }

  if (op === 'set' || op === 'update') {
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      throw new HttpError(400, 'Data tidak valid.');
    }
    const before = await getDoc(db, collection, id!);
    if (op === 'update' && !before) throw new HttpError(404, 'Dokumen tidak ditemukan.');
    const base = op === 'update' || body.merge ? before || {} : {};
    let after = applyPatch(base, body.data);
    if (collection === 'users') {
      after = { ...after, id: id! };
      if (typeof after.email === 'string') after.email = after.email.trim().toLowerCase();
    }
    if (!canWrite(me, collection, id!, before, after)) throw new HttpError(403, 'Akses ditolak.');

    if (collection === 'users' && after.email && after.email !== before?.email) {
      // Satu email hanya untuk satu pengguna.
      const same = await queryDocs(db, 'users', [{ field: 'email', value: after.email }]);
      if (same.some((d) => d.id !== id)) {
        throw new HttpError(409, `Email ${after.email} sudah dipakai pengguna lain.`);
      }
    }

    if (collection === 'users' && before && after.email !== before.email) {
      // Email login ikut berubah bila profil sudah punya akun.
      try {
        await db
          .prepare('UPDATE accounts SET email = ?, updated_at = ? WHERE user_id = ?')
          .bind(after.email, new Date().toISOString(), id)
          .run();
      } catch {
        throw new HttpError(409, 'Email tersebut sudah dipakai akun lain.');
      }
    }
    await putDoc(db, collection, id!, after);
    return json({ ok: true });
  }

  if (op === 'delete') {
    const before = await getDoc(db, collection, id!);
    if (!before) return json({ ok: true });
    if (!canWrite(me, collection, id!, before, null)) throw new HttpError(403, 'Akses ditolak.');
    await deleteDoc(db, collection, id!);
    if (collection === 'users') {
      // Hapus juga akun login & sesi milik pengguna tersebut.
      await db.batch([
        db.prepare('DELETE FROM accounts WHERE user_id = ?').bind(id),
        db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
        db.prepare('DELETE FROM password_links WHERE user_id = ?').bind(id),
      ]);
    }
    return json({ ok: true });
  }

  throw new HttpError(400, 'Operasi tidak dikenal.');
}
