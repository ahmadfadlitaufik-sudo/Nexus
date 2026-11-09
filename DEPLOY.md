# Deploy Nexus Client Hub ke Cloudflare

Semua berjalan di Cloudflare, tanpa Firebase:

| Bagian | Teknologi | Lokasi kode |
|---|---|---|
| Tampilan web | React (hasil `vite build`) sebagai *static assets* | `src/` |
| Server / API | Cloudflare Worker | `worker/` |
| Database | Cloudflare **D1** (SQLite) | `migrations/` |
| Login | Email + kata sandi (sesi cookie), opsional Google | `worker/auth.ts`, `worker/google.ts` |
| AI ringkasan sesi | Gemini API | `worker/ai.ts` |

---

## Langkah 1 — Database D1 ✅ sudah dibuat

Database `nexus-db` (region APAC) sudah dibuat dan tabelnya sudah terpasang.
ID-nya sudah tercatat di `wrangler.jsonc`, jadi tidak perlu langkah apa pun.

## Langkah 2 — Atur rahasia (secrets)

Di Cloudflare Dashboard → *Workers & Pages* → `nexus-client-hub` → *Settings* → *Variables and Secrets*
(atau lewat `npx wrangler secret put NAMA`):

| Nama | Wajib? | Isi |
|---|---|---|
| `OWNER_SETUP_CODE` | Ya | Kode rahasia buatan Anda sendiri, dipakai sekali untuk membuat akun Owner |
| `GEMINI_API_KEY` | Untuk fitur AI | API key Gemini |
| `GOOGLE_CLIENT_ID` | Opsional | Untuk tombol "Masuk dengan Google" |
| `GOOGLE_CLIENT_SECRET` | Opsional | Untuk tombol "Masuk dengan Google" |

## Langkah 3 — Deploy

**Cara A: Hubungkan GitHub (otomatis setiap push)**
1. Cloudflare Dashboard → *Workers & Pages* → *Create* → *Import a repository* → pilih repo `Nexus`.
2. Build command: `npm run build`
3. Deploy command: `npx wrangler deploy && npx wrangler d1 migrations apply nexus-db --remote`

**Cara B: Dari komputer sendiri**
```bash
npm run deploy
```

Aplikasi akan tersedia di `https://nexus-client-hub.<nama-akun>.workers.dev`.
Untuk domain sendiri: Worker → *Settings* → *Domains & Routes* → *Add Custom Domain*.

## Langkah 4 — Buat akun Owner

1. Buka aplikasi → **Daftar Akun Baru**.
2. Isi email `ahmadfadlitaufik@gmail.com`, kata sandi (minimal 8 karakter), dan
   **Kode Setup Owner** (= isi `OWNER_SETUP_CODE`).
3. Akun Owner langsung aktif. Setelah itu kode setup tidak diperlukan lagi.

## Cara menambah tim & klien

- **Diundang Owner** (disarankan):
  1. Owner → *Pengaturan Tim & Akses* → isi nama, email, peran (dan bisnis klien bila perannya Klien) → simpan.
  2. Klik **Tautan Akun** pada baris pengguna tersebut. Tautan otomatis tersalin.
  3. Kirim tautan ke orangnya (misalnya via WhatsApp). Mereka membuat kata sandi sendiri, lalu langsung masuk.
     Tautan berlaku 7 hari dan hanya bisa dipakai sekali.
- **Daftar sendiri**: lewat menu *Daftar Akun Baru*. Status *Menunggu Persetujuan* sampai Owner menyetujui di menu *Approval Pendaftaran*.
- **Lupa kata sandi**: Owner membuat **Tautan Akun** baru untuk pengguna tersebut (aplikasi belum mengirim email otomatis).

## Login Google (opsional)

1. Google Cloud Console → *APIs & Services* → *Credentials* → *Create credentials* → *OAuth client ID* → *Web application*.
2. *Authorized redirect URIs*: `https://<domain-anda>/api/auth/google/callback`
   (contoh: `https://nexus-client-hub.<nama-akun>.workers.dev/api/auth/google/callback`).
3. Simpan Client ID & Client Secret sebagai secret `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`.
4. Tombol "Akun Google Resmi" otomatis muncul di halaman login.

Pengguna Google yang emailnya sudah diundang Owner otomatis tertaut ke profil undangannya.
Email Owner yang masuk dengan Google otomatis menjadi Owner (email sudah diverifikasi Google).

## Pengembangan lokal

```bash
cp .dev.vars.example .dev.vars
```
```bash
npm run db:migrate:local
```
```bash
npm run dev
```

Buka http://localhost:5173. Worker dan database D1 lokal berjalan otomatis lewat Vite.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Jalankan aplikasi + Worker + D1 lokal |
| `npm run lint` | Cek tipe TypeScript (aplikasi + worker) |
| `npm run deploy` | Build, deploy Worker, lalu terapkan migrasi D1 |
| `VITE_DEMO_MODE=true npm run dev` | Mode demo dengan akun & data contoh. **Jangan untuk produksi** |

## Keamanan yang sudah diterapkan

- Kata sandi di-hash (PBKDF2-SHA256, 100.000 iterasi). Tidak pernah disimpan dalam bentuk asli.
- Sesi berupa cookie `HttpOnly`, `Secure`, `SameSite=Lax`, berlaku 30 hari. Yang disimpan di database hanya hash token.
- Login dibatasi 10 percobaan salah per 15 menit per email.
- Semua akses data diperiksa di Worker (`worker/data.ts`):
  - Klien hanya melihat data bisnisnya sendiri.
  - Catatan internal sesi hanya untuk tim.
  - Hanya Owner yang dapat mengubah peran/status pengguna.
- Fitur AI hanya untuk tim internal yang sudah login.
