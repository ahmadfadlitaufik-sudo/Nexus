export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** Email owner utama. */
  OWNER_EMAIL?: string;
  /** Kode rahasia sekali pakai untuk membuat akun owner pertama dengan email + kata sandi. */
  OWNER_SETUP_CODE?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  /** Opsional: login dengan Google (OAuth client dari Google Cloud Console). */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export const DEFAULT_OWNER_EMAIL = 'ahmadfadlitaufik@gmail.com';

export function ownerEmail(env: Env): string {
  return (env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
}

export type Doc = Record<string, any>;

export interface Profile extends Doc {
  id: string;
  email: string;
  role: string;
  status?: string;
  clientId?: string;
}

export const TEAM_ROLES = ['owner', 'konsultan', 'consultant', 'tim_grup', 'tim_konten', 'staf_operasional'];
export const CLIENT_ROLES = ['klien', 'client'];

export function isActive(p: Profile | null | undefined): boolean {
  return !!p && p.status !== 'pending' && p.status !== 'rejected';
}

export function isOwner(p: Profile | null | undefined): boolean {
  return isActive(p) && p!.role === 'owner';
}

export function isTeam(p: Profile | null | undefined): boolean {
  return isActive(p) && TEAM_ROLES.includes(p!.role);
}

export function isClient(p: Profile | null | undefined): boolean {
  return isActive(p) && CLIENT_ROLES.includes(p!.role);
}
