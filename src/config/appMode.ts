/**
 * Mode aplikasi.
 *
 * DEMO_MODE = true  -> login simulasi tanpa password, pemilih akun demo, dan data contoh
 *                      (hanya untuk uji coba lokal, JANGAN dipakai di produksi).
 * DEMO_MODE = false -> (default) login asli via Firebase Auth, tanpa data contoh.
 *
 * Aktifkan dengan VITE_DEMO_MODE=true saat build/dev.
 */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

/** Email owner utama. Harus sama dengan yang ada di firestore.rules. */
export const OWNER_EMAIL = 'ahmadfadlitaufik@gmail.com';

export function isOwnerEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === OWNER_EMAIL;
}
