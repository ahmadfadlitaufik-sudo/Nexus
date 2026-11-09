import React, { useState } from 'react';

const COLORS = ['#00236f', '#0051d5', '#0e7490', '#047857', '#7c3aed', '#b45309', '#be123c', '#334155'];

function initials(name?: string): string {
  const parts = (name || '').replace(/[,.].*$/, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function colorFor(name?: string): string {
  let h = 0;
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

/**
 * Foto profil pengguna. Bila belum ada foto (atau gagal dimuat), tampil inisial nama
 * berwarna — tanpa memanggil layanan gambar pihak ketiga.
 */
export const UserAvatar: React.FC<{
  name?: string;
  url?: string | null;
  className?: string;
}> = ({ name, url, className = 'w-9 h-9 rounded-full' }) => {
  const [failed, setFailed] = useState(false);
  const usable = !!url && !failed && !/ui-avatars\.com/.test(url);
  if (usable) {
    return (
      <img
        src={url!}
        alt={name || ''}
        onError={() => setFailed(true)}
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={name || 'Pengguna'}
      className={`${className} inline-flex items-center justify-center text-white font-bold select-none shrink-0`}
      style={{ backgroundColor: colorFor(name), fontSize: '0.8em' }}
    >
      <span className="text-[0.85rem] leading-none">{initials(name)}</span>
    </span>
  );
};
