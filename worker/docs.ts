/** Penyimpanan dokumen JSON di tabel `docs` (D1). */
import type { Doc } from './env';

export interface Filter {
  field: string;
  value: string | number | boolean | null;
}

const FIELD_RE = /^[A-Za-z0-9_]{1,64}$/;
export const COLLECTION_RE = /^[a-z_]{1,64}$/;

function clientIdOf(collection: string, id: string, data: Doc): string | null {
  if (collection === 'clients') return id;
  return typeof data.clientId === 'string' ? data.clientId : null;
}

export async function getDoc(db: D1Database, collection: string, id: string): Promise<Doc | null> {
  const row = await db
    .prepare('SELECT data FROM docs WHERE collection = ? AND id = ?')
    .bind(collection, id)
    .first<{ data: string }>();
  return row ? (JSON.parse(row.data) as Doc) : null;
}

export async function putDoc(db: D1Database, collection: string, id: string, data: Doc): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO docs (collection, id, client_id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (collection, id) DO UPDATE SET
         client_id = excluded.client_id, data = excluded.data, updated_at = excluded.updated_at`
    )
    .bind(collection, id, clientIdOf(collection, id, data), JSON.stringify(data), now, now)
    .run();
}

export async function deleteDoc(db: D1Database, collection: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM docs WHERE collection = ? AND id = ?').bind(collection, id).run();
}

/**
 * Cari dokumen dengan filter kesamaan (field == nilai).
 * onlyClientId: batasi ke data milik satu klien (dipakai untuk akun klien).
 */
export async function queryDocs(
  db: D1Database,
  collection: string,
  filters: Filter[],
  onlyClientId?: string,
  latest?: number
): Promise<{ id: string; data: Doc }[]> {
  let sql = 'SELECT id, data FROM docs WHERE collection = ?';
  const params: unknown[] = [collection];
  if (onlyClientId !== undefined) {
    sql += ' AND client_id = ?';
    params.push(onlyClientId);
  }
  for (const f of filters) {
    if (!FIELD_RE.test(f.field)) throw new Error(`Nama field tidak valid: ${f.field}`);
    if (f.value === null) {
      sql += ` AND json_extract(data, '$.${f.field}') IS NULL`;
    } else {
      sql += ` AND json_extract(data, '$.${f.field}') = ?`;
      params.push(typeof f.value === 'boolean' ? (f.value ? 1 : 0) : f.value);
    }
  }
  // latest = ambil N dokumen terbaru saja (mis. log aktivitas).
  sql += latest ? ` ORDER BY created_at DESC, id DESC LIMIT ${Math.min(Math.max(1, Math.floor(latest)), 1000)}` : ' ORDER BY created_at, id LIMIT 5000';
  const { results } = await db
    .prepare(sql)
    .bind(...params)
    .all<{ id: string; data: string }>();
  return results.map((r) => ({ id: r.id, data: JSON.parse(r.data) as Doc }));
}
