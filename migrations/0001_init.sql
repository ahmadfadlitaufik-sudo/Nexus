-- Skema awal database Nexust Client Hub (Cloudflare D1 / SQLite).

-- Penyimpanan dokumen umum. Setiap "koleksi" aplikasi (clients, sessions, tasks, users, ...)
-- disimpan sebagai baris JSON. client_id diekstrak agar data per klien bisa difilter cepat.
CREATE TABLE IF NOT EXISTS docs (
  collection TEXT NOT NULL,
  id         TEXT NOT NULL,
  client_id  TEXT,
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_docs_client ON docs (collection, client_id);

-- Kredensial login. user_id = id profil di koleksi users.
CREATE TABLE IF NOT EXISTS accounts (
  user_id       TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_sub    TEXT UNIQUE,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Sesi login (cookie). Yang disimpan hanya hash token.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

-- Tautan sekali pakai untuk membuat / mengatur ulang kata sandi (dibuat Owner).
CREATE TABLE IF NOT EXISTS password_links (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at    INTEGER,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

-- Pembatas percobaan login (anti tebak kata sandi).
CREATE TABLE IF NOT EXISTS login_attempts (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
