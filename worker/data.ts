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
import { Doc, Env, Profile, isActive, isClient, isOwner, isTeam, ownerEmail } from './env';
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

// ---- Hak akses per peran di dalam tim (least privilege) ----
// Data yang tidak boleh dibaca peran tertentu.
const ROLE_READ_DENY: Record<string, Set<string>> = {
  // Tim konten cukup melihat nama klien & izin studi kasus, bukan catatan internal / angka keuangan.
  tim_konten: new Set(['session_internals', 'diagnoses', 'kpis', 'enrollments', 'documents']),
  staf_operasional: new Set(['session_internals']),
};
// Data yang hanya boleh diubah peran tertentu (selain Owner).
const WRITE_ROLES: Record<string, string[]> = {
  programs: [], // khusus Owner
  clients: ['konsultan', 'consultant', 'tim_grup', 'staf_operasional'],
  sessions: ['konsultan', 'consultant', 'tim_grup'],
  session_internals: ['konsultan', 'consultant', 'tim_grup'],
  diagnoses: ['konsultan', 'consultant'],
  kpis: ['konsultan', 'consultant'],
  enrollments: ['konsultan', 'consultant', 'staf_operasional'],
  client_consultants: ['konsultan', 'consultant', 'staf_operasional'],
  documents: ['konsultan', 'consultant', 'tim_grup', 'staf_operasional'],
};
// Hapus data penting: khusus Owner.
const OWNER_ONLY_DELETE = new Set(['clients', 'programs', 'groups', 'enrollments', 'client_consultants']);

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  konsultan: 'Konsultan',
  consultant: 'Konsultan',
  tim_grup: 'Tim Grup',
  tim_konten: 'Tim Konten',
  staf_operasional: 'Staf Operasional',
  klien: 'Klien',
  client: 'Klien',
};

const TEAM_ROLE_LIST = ['owner', 'konsultan', 'consultant', 'tim_grup', 'tim_konten', 'staf_operasional'];
const isTeamProfile = (d: Doc | null) => !!d && TEAM_ROLE_LIST.includes(d.role);

export function canRead(me: Profile, collection: string, id: string, doc: Doc | null): boolean {
  if (collection === 'users') {
    // Klien hanya boleh melihat profilnya sendiri dan profil tim Nexus (bukan klien lain).
    if (id === me.id) return true;
    if (!isActive(me)) return false;
    return isTeam(me) || isTeamProfile(doc);
  }
  if (isTeam(me) && !isOwner(me) && ROLE_READ_DENY[me.role]?.has(collection)) return false;
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

  if (isTeam(me)) {
    if (!KNOWN.has(collection)) return false;
    if (isOwner(me)) return true;
    if (ROLE_READ_DENY[me.role]?.has(collection)) return false;
    if (!after && OWNER_ONLY_DELETE.has(collection)) return false;
    const allowed = WRITE_ROLES[collection];
    return !allowed || allowed.includes(me.role);
  }

  if (isClient(me) && me.clientId && CLIENT_UPDATABLE.has(collection) && after) {
    const mine = (d: Doc | null) => !!d && docClientId(collection, id, d) === me.clientId;
    if (before) return mine(before) && mine(after);
    return CLIENT_CREATABLE.has(collection) && mine(after);
  }

  return false;
}

/**
 * Owner utama (email OWNER_EMAIL) dilindungi: owner lain tidak boleh menghapus,
 * menonaktifkan, menurunkan peran, atau mengganti email akun tersebut.
 * Owner utama juga tidak bisa menurunkan / menghapus dirinya sendiri secara tidak sengaja.
 */
export function protectPrimaryOwner(env: Env, me: Profile, id: string, before: Doc | null, after: Doc | null) {
  if (!before || String(before.email || '').toLowerCase() !== ownerEmail(env)) return;
  if (!after) throw new HttpError(403, 'Akun Owner utama tidak dapat dihapus.');
  const locked = ['role', 'status', 'email'];
  const changed = changedKeys(before, after).filter((k) => locked.includes(k));
  if (changed.length) {
    throw new HttpError(403, 'Peran, status, dan email Owner utama tidak dapat diubah.');
  }
  if (me.id !== id && changedKeys(before, after).length > 0) {
    throw new HttpError(403, 'Profil Owner utama hanya dapat diubah oleh pemiliknya sendiri.');
  }
}

/**
 * Absen & to-do harian:
 * - Anggota tim hanya boleh mengisi absen miliknya sendiri. Owner boleh mengoreksi absen siapa pun.
 *   Pengecualian: menambah tawaran bantuan (helpOffers) di absen rekan.
 * - Jam masuk (morningCheckinAt) & jam pulang (eveningCheckoutAt) dicap jam server dan
 *   tidak bisa diubah setelah terisi (kecuali oleh Owner).
 * - To-do: anggota tim hanya mengelola to-do miliknya. Hanya Owner yang dapat menugaskan
 *   to-do ke orang lain. To-do dari Owner tidak bisa dihapus / dipindah pemiliknya oleh penerima.
 */
export function applyDailyRules(me: Profile, collection: string, before: Doc | null, after: Doc | null): Doc | null {
  if (isOwner(me)) {
    if (collection === 'team_checkins' && after) return stampCheckin(before, after, after.userId === me.id);
    return after;
  }
  const ownerOf = (d: Doc | null) => (d ? d.userId : undefined);

  if (collection === 'team_checkins') {
    if (before && ownerOf(before) !== me.id) {
      // Hanya boleh menambah tawaran bantuan di absen rekan.
      if (!after) throw new HttpError(403, 'Tidak dapat menghapus absen rekan.');
      const changed = changedKeys(before, after);
      if (!changed.every((k) => k === 'helpOffers' || k === 'updatedAt')) {
        throw new HttpError(403, 'Absen hanya dapat diisi oleh pemiliknya.');
      }
      return after;
    }
    if (!after) throw new HttpError(403, 'Absen tidak dapat dihapus.');
    if (ownerOf(after) !== me.id) throw new HttpError(403, 'Absen hanya dapat diisi oleh pemiliknya.');
    return stampCheckin(before, after, true);
  }

  // plan_items
  if (before && ownerOf(before) !== me.id && before.assignedById !== me.id) {
    throw new HttpError(403, 'To-do ini milik orang lain.');
  }
  if (after) {
    if (ownerOf(after) !== me.id) throw new HttpError(403, 'Hanya Owner yang dapat menugaskan to-do ke orang lain.');
    const assignedByOther = (d: Doc | null) => !!d?.assignedById && d.assignedById !== me.id;
    if (!before && assignedByOther(after)) throw new HttpError(403, 'Data penugasan tidak valid.');
    if (before && assignedByOther(before)) {
      const allowed = ['status', 'completedAt', 'updatedAt', 'date', 'note'];
      if (!changedKeys(before, after).every((k) => allowed.includes(k))) {
        throw new HttpError(403, 'To-do dari Owner hanya dapat diperbarui statusnya.');
      }
    }
  } else if (before && before.assignedById && before.assignedById !== me.id) {
    throw new HttpError(403, 'To-do dari Owner tidak dapat dihapus.');
  }
  return after;
}

function stampCheckin(before: Doc | null, after: Doc, isSelf: boolean): Doc {
  if (!isSelf) return after; // koreksi oleh Owner untuk absen orang lain: apa adanya
  const now = new Date().toISOString();
  const out = { ...after };
  for (const field of ['morningCheckinAt', 'eveningCheckoutAt']) {
    if (before?.[field]) out[field] = before[field]; // sudah terisi: tidak bisa diubah
    else if (out[field]) out[field] = now; // baru diisi: pakai jam server
  }
  return out;
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
    if (isTeam(me) && !isOwner(me) && ROLE_READ_DENY[me.role]?.has(collection)) {
      throw new HttpError(403, 'Akses ditolak untuk peran Anda.');
    }
    if (collection === 'users') {
      if (!isActive(me)) {
        const self = await getDoc(db, 'users', me.id);
        return json({ docs: self ? [{ id: me.id, data: self }] : [] });
      }
      if (!isTeam(me)) {
        // Klien: hanya tim Nexus + dirinya sendiri.
        const all = await queryDocs(db, 'users', filters);
        return json({ docs: all.filter((d) => d.id === me.id || isTeamProfile(d.data)) });
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
    if (collection === 'users') protectPrimaryOwner(env, me, id!, before, after);
    if (collection === 'team_checkins' || collection === 'plan_items') {
      after = applyDailyRules(me, collection, before, after)!;
    }
    if (collection === 'activity_log' && !before) {
      // Pelaku log dicatat server dari akun yang login — tidak bisa dipalsukan.
      after = {
        ...after,
        action: String(after.action || 'Aktivitas').slice(0, 200),
        details: String(after.details || '').slice(0, 2000),
        actorId: me.id,
        actorName: me.displayName || me.email,
        actorRole: ROLE_LABELS[me.role] || me.role,
        createdAt: new Date().toISOString(),
        ...(isClient(me) ? { clientId: me.clientId } : {}),
      };
    }

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
    if (collection === 'users') protectPrimaryOwner(env, me, id!, before, null);
    if (collection === 'team_checkins' || collection === 'plan_items') {
      applyDailyRules(me, collection, before, null);
    }
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
