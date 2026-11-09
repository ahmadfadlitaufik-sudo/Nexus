/**
 * Klien database Cloudflare D1 dengan API yang meniru Firestore
 * (doc, collection, query, where, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField).
 * Semua permintaan dikirim ke Worker (POST /api/data) yang memeriksa hak akses.
 */

type Data = Record<string, any>;

/** Penanda "database" agar signature mirip Firestore: doc(db, 'koleksi', id). */
export const db = { kind: 'cloudflare-d1' } as const;
type DbHandle = typeof db;

export interface DocumentReference {
  type: 'doc';
  collection: string;
  id: string;
}

export interface CollectionReference {
  type: 'collection';
  collection: string;
}

interface WhereConstraint {
  type: 'where';
  field: string;
  op: '==' | 'in';
  value: unknown;
}

interface LimitConstraint {
  type: 'limit';
  count: number;
}

export interface Query {
  type: 'query';
  collection: string;
  filters: WhereConstraint[];
  /** Ambil N dokumen terbaru saja. */
  limit?: number;
}

export class StoreError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export function doc(_db: DbHandle, collection: string, id: string): DocumentReference {
  return { type: 'doc', collection, id };
}

export function collection(_db: DbHandle, name: string): CollectionReference {
  return { type: 'collection', collection: name };
}

export function where(field: string, op: '==' | 'in', value: unknown): WhereConstraint {
  return { type: 'where', field, op, value };
}

/** Batasi ke N dokumen terbaru (urut waktu dibuat, terbaru dulu). */
export function limit(count: number): LimitConstraint {
  return { type: 'limit', count };
}

export function query(ref: CollectionReference, ...constraints: (WhereConstraint | LimitConstraint)[]): Query {
  const lim = constraints.find((c): c is LimitConstraint => c.type === 'limit');
  return {
    type: 'query',
    collection: ref.collection,
    filters: constraints.filter((c): c is WhereConstraint => c.type === 'where'),
    limit: lim?.count,
  };
}

/** Hapus sebuah field saat updateDoc / setDoc(merge). */
export function deleteField(): { __delete: true } {
  return { __delete: true };
}

function stripUndefined(value: any): any {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Data = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
}

// ---- Cache singkat di browser ----
// Permintaan baca yang sama dalam 30 detik memakai hasil yang sama (dan permintaan yang sedang
// berjalan dipakai bersama), sehingga data tidak diambil berulang saat pindah menu.
// Setiap penulisan ke sebuah koleksi menghapus cache koleksi tersebut.
const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { at: number; collection: string; promise: Promise<unknown> }>();

/** Kosongkan seluruh cache (dipanggil saat login/logout). */
export function clearStoreCache(): void {
  cache.clear();
}

function invalidate(collection: string): void {
  for (const [k, v] of cache) if (v.collection === collection) cache.delete(k);
}

async function cachedRead<T>(body: Data): Promise<T> {
  const key = JSON.stringify(body);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    // Salinan agar pemanggil tidak saling mengubah data yang sama.
    return structuredClone(await (hit.promise as Promise<T>));
  }
  const promise = request<T>(body);
  cache.set(key, { at: Date.now(), collection: body.collection, promise });
  try {
    return structuredClone(await promise);
  } catch (err) {
    cache.delete(key);
    throw err;
  }
}

async function call<T>(body: Data): Promise<T> {
  if (body.op === 'get' || body.op === 'query') return cachedRead<T>(body);
  try {
    return await request<T>(body);
  } finally {
    invalidate(body.collection);
  }
}

async function request<T>(body: Data): Promise<T> {
  const res = await fetch('/api/data', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StoreError(res.status, json.error || `Permintaan data gagal (${res.status}).`);
  }
  return json as T;
}

export interface DocumentSnapshot {
  id: string;
  ref: DocumentReference;
  exists(): boolean;
  data(): Data;
}

export interface QuerySnapshot {
  empty: boolean;
  size: number;
  docs: DocumentSnapshot[];
  forEach(cb: (d: DocumentSnapshot) => void): void;
}

function snapshot(collectionName: string, id: string, data: Data | null): DocumentSnapshot {
  const ref = { type: 'doc' as const, collection: collectionName, id };
  return {
    id,
    ref,
    exists: () => data !== null,
    data: () => (data === null ? (undefined as unknown as Data) : data),
  };
}

export async function getDoc(ref: DocumentReference): Promise<DocumentSnapshot> {
  const res = await call<{ exists: boolean; data: Data | null }>({
    op: 'get',
    collection: ref.collection,
    id: ref.id,
  });
  return snapshot(ref.collection, ref.id, res.exists ? res.data : null);
}

export async function getDocs(ref: CollectionReference | Query): Promise<QuerySnapshot> {
  const filters = ref.type === 'query' ? ref.filters : [];
  const equality = filters.filter((f) => f.op === '==');
  const inFilters = filters.filter((f) => f.op === 'in');

  const res = await call<{ docs: { id: string; data: Data }[] }>({
    op: 'query',
    collection: ref.collection,
    filters: equality.map((f) => ({ field: f.field, value: f.value })),
    ...(ref.type === 'query' && ref.limit ? { limit: ref.limit } : {}),
  });
  let rows = res.docs;
  // Filter 'in' diterapkan di browser (jarang dipakai).
  for (const f of inFilters) {
    const allowed = Array.isArray(f.value) ? f.value : [];
    rows = rows.filter((r) => allowed.includes(r.data?.[f.field]));
  }
  const docs = rows.map((r) => snapshot(ref.collection, r.id, r.data));
  return { empty: docs.length === 0, size: docs.length, docs, forEach: (cb) => docs.forEach(cb) };
}

export async function setDoc(ref: DocumentReference, data: Data, options?: { merge?: boolean }): Promise<void> {
  await call({
    op: 'set',
    collection: ref.collection,
    id: ref.id,
    data: stripUndefined(data),
    merge: !!options?.merge,
  });
}

export async function updateDoc(ref: DocumentReference, data: Data): Promise<void> {
  await call({ op: 'update', collection: ref.collection, id: ref.id, data: stripUndefined(data) });
}

export async function deleteDoc(ref: DocumentReference): Promise<void> {
  await call({ op: 'delete', collection: ref.collection, id: ref.id });
}
