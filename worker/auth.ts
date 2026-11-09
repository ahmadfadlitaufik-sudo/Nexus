/**
 * Sistem login Nexust Client Hub di Cloudflare (tanpa Firebase).
 *
 * - Kata sandi di-hash PBKDF2 (worker/crypto.ts); sesi berupa cookie HttpOnly.
 * - Pendaftaran mandiri selalu berstatus "pending" sampai disetujui Owner.
 * - Owner pertama: daftar dengan email owner + OWNER_SETUP_CODE (secret), atau login Google.
 * - Pengguna yang diundang Owner mengaktifkan akun lewat "tautan atur kata sandi" yang dibuat Owner
 *   (dibagikan manual, misalnya via WhatsApp). Tautan yang sama dipakai untuk lupa kata sandi.
 */
import { HttpError, cookie, getCookie, json, readJson } from './http';
import { Env, Profile, TEAM_ROLES, CLIENT_ROLES, isOwner, ownerEmail } from './env';
import { getDoc, putDoc, queryDocs } from './docs';
import { hashPassword, randomToken, sha256, verifyPassword } from './crypto';

export const SESSION_COOKIE = 'nx_session';
const SESSION_DAYS = 30;
const LINK_DAYS = 7;
const MIN_PASSWORD = 8;
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function checkPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Kata sandi minimal ${MIN_PASSWORD} karakter.`);
  }
  if (password.length > 200) throw new HttpError(400, 'Kata sandi terlalu panjang.');
  return password;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomToken(4)}`;
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  // Bandingkan hash agar waktu perbandingan tidak membocorkan isi kode.
  return (await sha256(a)) === (await sha256(b));
}

// ---------------- Sesi ----------------

export async function getSessionProfile(request: Request, env: Env): Promise<Profile | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare('SELECT user_id FROM sessions WHERE token_hash = ? AND expires_at > ?')
    .bind(await sha256(token), Date.now())
    .first<{ user_id: string }>();
  if (!row) return null;
  return (await getDoc(env.DB, 'users', row.user_id)) as Profile | null;
}

async function createSession(env: Env, request: Request, userId: string): Promise<string> {
  const token = randomToken(32);
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?').bind(userId, now),
    env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(
      await sha256(token),
      userId,
      now + SESSION_DAYS * 86400_000,
      now
    ),
  ]);
  return cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400, new URL(request.url).protocol === 'https:');
}

function clearSessionCookie(request: Request): string {
  return cookie(SESSION_COOKIE, '', 0, new URL(request.url).protocol === 'https:');
}

async function logActivity(env: Env, entry: Record<string, unknown>) {
  const id = newId('log');
  await putDoc(env.DB, 'activity_log', id, { ...entry, id, createdAt: new Date().toISOString() });
}

// ---------------- Pembatas percobaan login ----------------

async function checkRateLimit(env: Env, key: string) {
  const row = await env.DB.prepare('SELECT count, reset_at FROM login_attempts WHERE key = ?')
    .bind(key)
    .first<{ count: number; reset_at: number }>();
  if (row && row.reset_at > Date.now() && row.count >= MAX_ATTEMPTS) {
    throw new HttpError(429, 'Terlalu banyak percobaan masuk. Coba lagi 15 menit lagi.');
  }
}

async function recordFailure(env: Env, key: string) {
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO login_attempts (key, count, reset_at) VALUES (?, 1, ?)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN reset_at <= ? THEN 1 ELSE count + 1 END,
       reset_at = CASE WHEN reset_at <= ? THEN excluded.reset_at ELSE reset_at END`
  )
    .bind(key, now + ATTEMPT_WINDOW_MS, now, now)
    .run();
}

async function clearFailures(env: Env, key: string) {
  await env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(key).run();
}

// ---------------- Helper profil ----------------

async function findProfileByEmail(env: Env, email: string): Promise<Profile | null> {
  const docs = await queryDocs(env.DB, 'users', [{ field: 'email', value: email }]);
  return docs.length ? (docs[0].data as Profile) : null;
}

async function accountByEmail(env: Env, email: string) {
  return env.DB.prepare('SELECT user_id, password_hash, google_sub FROM accounts WHERE email = ?')
    .bind(email)
    .first<{ user_id: string; password_hash: string | null; google_sub: string | null }>();
}

async function insertAccount(
  env: Env,
  userId: string,
  email: string,
  fields: { passwordHash?: string | null; googleSub?: string | null }
) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO accounts (user_id, email, password_hash, google_sub, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(userId, email, fields.passwordHash ?? null, fields.googleSub ?? null, now, now)
    .run();
}

/** Ambil field profil yang boleh diisi sendiri saat mendaftar. */
function registrationFields(input: Record<string, unknown>) {
  const str = (v: unknown, max = 500) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined;
  const allowedRoles = [...TEAM_ROLES, ...CLIENT_ROLES];
  const role = typeof input.role === 'string' && allowedRoles.includes(input.role) ? input.role : 'konsultan';
  const category = ['bod', 'staff', 'client', 'klien'].includes(input.registrationCategory as string)
    ? (input.registrationCategory as string)
    : 'staff';
  return {
    displayName: str(input.displayName, 120),
    phone: str(input.phone, 40),
    role,
    title: str(input.title, 120),
    registrationCategory: category,
    companyName: str(input.companyName, 160),
    industry: str(input.industry, 120),
    city: str(input.city, 120),
    teamSize: str(input.teamSize, 60),
    programInterest: str(input.programInterest, 160),
    notes: str(input.notes, 2000),
    avatarUrl: str(input.avatarUrl, 1000),
  };
}

function withoutUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

function ownerProfile(id: string, email: string, displayName?: string, avatarUrl?: string): Profile {
  const now = new Date().toISOString();
  return withoutUndefined({
    id,
    email,
    displayName: displayName || 'Ahmad Fadli Taufik',
    role: 'owner',
    status: 'active',
    registrationCategory: 'bod',
    title: 'Founder & Managing Partner',
    avatarUrl,
    createdAt: now,
    updatedAt: now,
  }) as Profile;
}

// ---------------- Endpoint ----------------

async function register(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, any>>(request);
  const email = normEmail(body.email);
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Format email tidak valid.');
  const password = checkPassword(body.password);

  if (await accountByEmail(env, email)) {
    throw new HttpError(409, 'Email ini sudah terdaftar. Silakan masuk.');
  }
  const existing = await findProfileByEmail(env, email);
  const passwordHash = await hashPassword(password);
  let profile: Profile;

  if (email === ownerEmail(env)) {
    // Akun owner pertama wajib memakai kode setup rahasia.
    const code = typeof body.setupCode === 'string' ? body.setupCode.trim() : '';
    if (!env.OWNER_SETUP_CODE || !code || !(await safeEqual(code, env.OWNER_SETUP_CODE))) {
      throw new HttpError(403, 'Kode setup Owner salah atau belum diatur di Cloudflare (OWNER_SETUP_CODE).');
    }
    profile = existing
      ? ({ ...existing, role: 'owner', status: 'active' } as Profile)
      : ownerProfile(newId('owner'), email, registrationFields(body).displayName);
  } else if (existing) {
    // Profil dibuat Owner (undangan). Kepemilikan email tidak bisa dibuktikan di sini.
    throw new HttpError(
      409,
      'Email ini sudah diundang oleh Owner. Minta "tautan aktivasi akun" kepada Owner untuk membuat kata sandi.'
    );
  } else {
    const now = new Date().toISOString();
    profile = withoutUndefined({
      ...registrationFields(body),
      id: newId('user'),
      email,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }) as Profile;
    if (!profile.displayName) throw new HttpError(400, 'Nama lengkap wajib diisi.');
  }

  await putDoc(env.DB, 'users', profile.id, profile);
  await insertAccount(env, profile.id, email, { passwordHash });
  await logActivity(env, {
    action: 'Pendaftaran Akun Baru',
    actorName: profile.displayName,
    actorRole: String(profile.registrationCategory || profile.role).toUpperCase(),
    details: `Pengguna baru "${profile.displayName}" (${email}) mendaftar sebagai ${String(
      profile.registrationCategory || profile.role
    ).toUpperCase()}. Status: ${String(profile.status).toUpperCase()}.`,
  });

  const setCookie = await createSession(env, request, profile.id);
  return json({ user: profile }, 200, { 'Set-Cookie': setCookie });
}

async function login(request: Request, env: Env): Promise<Response> {
  const body = await readJson<Record<string, any>>(request);
  const email = normEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const limitKey = `login:${email}`;
  await checkRateLimit(env, limitKey);

  const account = email ? await accountByEmail(env, email) : null;
  const ok = await verifyPassword(password, account?.password_hash);
  if (!account || !ok) {
    await recordFailure(env, limitKey);
    throw new HttpError(401, 'Email atau kata sandi salah.');
  }
  const profile = (await getDoc(env.DB, 'users', account.user_id)) as Profile | null;
  if (!profile) throw new HttpError(401, 'Profil akun tidak ditemukan. Hubungi Owner.');
  await clearFailures(env, limitKey);

  const setCookie = await createSession(env, request, profile.id);
  return json({ user: profile }, 200, { 'Set-Cookie': setCookie });
}

async function logout(request: Request, env: Env): Promise<Response> {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  }
  return json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request) });
}

/** Owner membuat tautan untuk mengaktifkan akun undangan / mengatur ulang kata sandi. */
async function createPasswordLink(request: Request, env: Env, me: Profile | null): Promise<Response> {
  if (!isOwner(me)) throw new HttpError(403, 'Hanya Owner yang dapat membuat tautan akun.');
  const { userId } = await readJson<{ userId?: string }>(request);
  const target = userId ? ((await getDoc(env.DB, 'users', userId)) as Profile | null) : null;
  if (!target) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  // Tautan kata sandi untuk akun owner lain hanya boleh dibuat oleh Owner utama
  // (mencegah owner lain mengambil alih akun owner).
  if (target.role === 'owner' && target.id !== me!.id && normEmail(me!.email) !== ownerEmail(env)) {
    throw new HttpError(403, 'Tautan akun untuk sesama Owner hanya dapat dibuat oleh Owner utama.');
  }
  if (normEmail(target.email) === ownerEmail(env) && target.id !== me!.id) {
    throw new HttpError(403, 'Tautan akun Owner utama hanya dapat dibuat oleh Owner utama sendiri.');
  }
  if (!EMAIL_RE.test(normEmail(target.email))) {
    throw new HttpError(400, 'Pengguna ini belum memiliki email yang valid.');
  }
  const token = randomToken(32);
  const now = Date.now();
  await env.DB.prepare(
    'INSERT INTO password_links (token_hash, user_id, expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(await sha256(token), target.id, now + LINK_DAYS * 86400_000, me!.id, now)
    .run();
  const url = `${new URL(request.url).origin}/?akun=${encodeURIComponent(token)}`;
  return json({ url, expiresInDays: LINK_DAYS, email: target.email });
}

async function validLink(env: Env, token: unknown) {
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'Tautan tidak valid.');
  const row = await env.DB.prepare(
    'SELECT token_hash, user_id FROM password_links WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?'
  )
    .bind(await sha256(token), Date.now())
    .first<{ token_hash: string; user_id: string }>();
  if (!row) throw new HttpError(410, 'Tautan sudah dipakai atau kedaluwarsa. Minta tautan baru kepada Owner.');
  const profile = (await getDoc(env.DB, 'users', row.user_id)) as Profile | null;
  if (!profile) throw new HttpError(404, 'Pengguna tidak ditemukan.');
  return { row, profile };
}

async function passwordLinkInfo(request: Request, env: Env): Promise<Response> {
  const { token } = await readJson<{ token?: string }>(request);
  const { profile } = await validLink(env, token);
  return json({ email: profile.email, displayName: profile.displayName });
}

async function setPassword(request: Request, env: Env): Promise<Response> {
  const body = await readJson<{ token?: string; password?: string }>(request);
  const password = checkPassword(body.password);
  const { row, profile } = await validLink(env, body.token);
  const email = normEmail(profile.email);
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const existing = await env.DB.prepare('SELECT user_id FROM accounts WHERE user_id = ?')
    .bind(profile.id)
    .first();
  if (existing) {
    await env.DB.prepare('UPDATE accounts SET password_hash = ?, email = ?, updated_at = ? WHERE user_id = ?')
      .bind(passwordHash, email, now, profile.id)
      .run();
  } else {
    if (await accountByEmail(env, email)) {
      throw new HttpError(409, 'Email ini sudah dipakai akun lain.');
    }
    await insertAccount(env, profile.id, email, { passwordHash });
  }
  await env.DB.batch([
    env.DB.prepare('UPDATE password_links SET used_at = ? WHERE token_hash = ?').bind(Date.now(), row.token_hash),
    // Keluarkan semua sesi lama setelah kata sandi diganti.
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(profile.id),
  ]);
  const setCookie = await createSession(env, request, profile.id);
  return json({ user: profile }, 200, { 'Set-Cookie': setCookie });
}

async function changePassword(request: Request, env: Env, me: Profile | null): Promise<Response> {
  if (!me) throw new HttpError(401, 'Silakan login terlebih dahulu.');
  const body = await readJson<{ currentPassword?: string; newPassword?: string }>(request);
  const newPassword = checkPassword(body.newPassword);
  const account = await env.DB.prepare('SELECT password_hash FROM accounts WHERE user_id = ?')
    .bind(me.id)
    .first<{ password_hash: string | null }>();
  if (account?.password_hash && !(await verifyPassword(body.currentPassword || '', account.password_hash))) {
    throw new HttpError(401, 'Kata sandi lama salah.');
  }
  await env.DB.prepare('UPDATE accounts SET password_hash = ?, updated_at = ? WHERE user_id = ?')
    .bind(await hashPassword(newPassword), new Date().toISOString(), me.id)
    .run();
  return json({ ok: true });
}

// ---------------- Login Google (opsional) ----------------

export function googleEnabled(env: Env): boolean {
  return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** Dipanggil setelah Google memastikan email terverifikasi. */
export async function loginWithGoogleIdentity(
  request: Request,
  env: Env,
  identity: { sub: string; email: string; name?: string; picture?: string }
): Promise<string> {
  const email = normEmail(identity.email);
  let userId: string | null = null;

  const bySub = await env.DB.prepare('SELECT user_id FROM accounts WHERE google_sub = ?')
    .bind(identity.sub)
    .first<{ user_id: string }>();
  if (bySub) userId = bySub.user_id;

  if (!userId) {
    const byEmail = await accountByEmail(env, email);
    if (byEmail) {
      await env.DB.prepare('UPDATE accounts SET google_sub = ?, updated_at = ? WHERE user_id = ?')
        .bind(identity.sub, new Date().toISOString(), byEmail.user_id)
        .run();
      userId = byEmail.user_id;
    }
  }

  if (!userId) {
    // Email sudah diverifikasi Google -> aman menautkan ke profil undangan Owner.
    let profile = await findProfileByEmail(env, email);
    if (!profile) {
      const now = new Date().toISOString();
      profile =
        email === ownerEmail(env)
          ? ownerProfile(newId('owner'), email, identity.name, identity.picture)
          : (withoutUndefined({
              id: newId('user'),
              email,
              displayName: identity.name || email.split('@')[0],
              role: 'konsultan',
              title: 'Calon Anggota Tim',
              registrationCategory: 'staff',
              status: 'pending',
              avatarUrl: identity.picture,
              createdAt: now,
              updatedAt: now,
            }) as Profile);
      await putDoc(env.DB, 'users', profile.id, profile);
      if (profile.status === 'pending') {
        await logActivity(env, {
          action: 'Pendaftaran Akun Baru',
          actorName: profile.displayName,
          actorRole: 'STAFF',
          details: `Pengguna baru "${profile.displayName}" (${email}) masuk dengan Google. Status: PENDING.`,
        });
      }
    }
    await insertAccount(env, profile.id, email, { googleSub: identity.sub });
    userId = profile.id;
  }

  return createSession(env, request, userId);
}

// ---------------- Router ----------------

export async function handleAuth(
  request: Request,
  env: Env,
  path: string,
  me: Profile | null
): Promise<Response | null> {
  const isPost = request.method === 'POST';
  if (path === '/api/auth/me' && request.method === 'GET') {
    return json({ user: me, googleEnabled: googleEnabled(env) });
  }
  if (!isPost) return null;
  switch (path) {
    case '/api/auth/register':
      return register(request, env);
    case '/api/auth/login':
      return login(request, env);
    case '/api/auth/logout':
      return logout(request, env);
    case '/api/auth/password-link':
      return createPasswordLink(request, env, me);
    case '/api/auth/password-link/info':
      return passwordLinkInfo(request, env);
    case '/api/auth/set-password':
      return setPassword(request, env);
    case '/api/auth/change-password':
      return changePassword(request, env, me);
  }
  return null;
}
