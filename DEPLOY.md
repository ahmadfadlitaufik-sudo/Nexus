# Deploy Nexust Client Hub ke Cloudflare

Aplikasi berjalan sebagai **satu Cloudflare Worker**:
- Halaman web (hasil `vite build` di folder `dist/`) dilayani sebagai *static assets*.
- Endpoint `/api/*` (ringkasan AI Gemini) dijalankan oleh `worker/index.ts`.
- Database & login tetap memakai **Firebase** (Firestore + Authentication).

---

## Langkah 1 — Siapkan Firebase (wajib, sekali saja)

1. **Aktifkan metode login** di Firebase Console → *Authentication* → *Sign-in method*:
   - **Email/Password** → Enable.
   - **Google** → Enable.
2. **Izinkan domain Cloudflare** di *Authentication* → *Settings* → *Authorized domains* → *Add domain*:
   - `nexus-client-hub.<nama-akun>.workers.dev` (muncul setelah deploy pertama), dan
   - domain sendiri jika dipakai (misal `hub.nexusacademy.id`).
   Tanpa ini, login Google akan gagal dengan pesan *unauthorized-domain*.
3. **Pasang aturan keamanan Firestore** (`firestore.rules`):
   ```bash
   npx firebase-tools login
   ```
   ```bash
   npx firebase-tools deploy --only firestore:rules
   ```
   Atau salin isi `firestore.rules` ke Firebase Console → *Firestore Database* → database
   `ai-studio-nexustgrowthpart-…` → tab *Rules* → *Publish*.

> ⚠️ Aturan lama mengizinkan **siapa pun di internet** membaca & mengubah semua data.
> Pasang aturan baru **sebelum** aplikasi dibuka untuk umum.

## Langkah 2 — Deploy ke Cloudflare

Cara A — **Hubungkan GitHub (otomatis setiap push)**
1. Cloudflare Dashboard → *Workers & Pages* → *Create* → *Import a repository*.
2. Pilih repo `Nexus`, branch produksi (misal `main`).
3. Build command: `bun run build` (atau `npm run build`) · Deploy command: `npx wrangler deploy`.
4. Setelah dibuat: *Settings* → *Variables and Secrets* → tambah **Secret** `GEMINI_API_KEY`.

Cara B — **Dari komputer sendiri**
```bash
npm install
```
```bash
npx wrangler login
```
```bash
npx wrangler secret put GEMINI_API_KEY
```
```bash
npm run deploy
```

Setelah deploy, aplikasi ada di `https://nexus-client-hub.<nama-akun>.workers.dev`.
Domain sendiri: Worker → *Settings* → *Domains & Routes* → *Add Custom Domain*.

## Langkah 3 — Login pertama sebagai Owner

1. Buka aplikasi → **Akun Google Resmi** dengan `ahmadfadlitaufik@gmail.com`.
2. Akun owner otomatis aktif (ditautkan ke profil owner yang sudah ada bila ada).
3. Anggota tim / klien:
   - **Diundang Owner** (menu Pengaturan Tim): mereka login dengan Google atau daftar
     email+password memakai **email yang sama**, lalu verifikasi email → otomatis tertaut.
   - **Daftar sendiri**: status *Menunggu Persetujuan* sampai Owner menyetujui.

## Data contoh (seed) di Firestore

Database lama kemungkinan masih berisi **data contoh** dari AI Studio (Kopi Senja, Budi Santoso, dll.).
Aplikasi tidak lagi menulis data contoh di mode produksi, tetapi data lama tidak dihapus otomatis.
Hapus lewat Firebase Console bila tidak diperlukan.

## Pengembangan lokal

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server lokal (Express + Vite) di http://localhost:3000 — butuh `.env` |
| `npm run cf:dev` | Simulasi Cloudflare lokal — butuh `.dev.vars` |
| `VITE_DEMO_MODE=true npm run dev` | Mode demo: pemilih akun & data contoh, **jangan untuk produksi** |
| `npm run lint` | Cek tipe TypeScript (aplikasi + worker) |

## Variabel

| Nama | Di mana | Keterangan |
|---|---|---|
| `GEMINI_API_KEY` | Secret Cloudflare / `.env` | Wajib untuk fitur ringkasan AI |
| `GEMINI_MODEL` | `wrangler.jsonc` → `vars` | Model Gemini (default `gemini-3.8-flash`) |
| `FIREBASE_PROJECT_ID` | `wrangler.jsonc` → `vars` | Untuk verifikasi token login di endpoint AI |
| `VITE_DEMO_MODE` | saat build | `true` = mode demo; kosongkan di produksi |
