import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { registerNewAccount, seedInitialDatabaseIfEmpty, getAllUsers } from '../services/db';
import { SEED_USERS } from '../data/seedData';
import { DEMO_MODE } from '../config/appMode';
import { clearStoreCache } from '../services/store';

type RegistrationData = Omit<UserProfile, 'id' | 'createdAt'> & {
  rawPassword?: string;
  /** Hanya untuk membuat akun owner pertama (email owner). */
  setupCode?: string;
};

interface AuthContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  /** Login Google tersedia bila GOOGLE_CLIENT_ID/SECRET diatur di Cloudflare. */
  googleEnabled: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerAccount: (data: RegistrationData) => Promise<UserProfile>;
  /** Info tautan aktivasi / atur ulang kata sandi (?akun=...). */
  getPasswordLinkInfo: (token: string) => Promise<{ email: string; displayName?: string }>;
  setPasswordWithLink: (token: string, password: string) => Promise<void>;
  /** Owner: buat tautan aktivasi akun / atur ulang kata sandi untuk pengguna. */
  createPasswordLink: (userId: string) => Promise<{ url: string; expiresInDays: number; email: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateAvatar: (newAvatarUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  // Pemilih akun simulasi — HANYA aktif saat DEMO_MODE.
  switchDemoRole: (roleOrUserId: string) => Promise<void>;
  availableDemoUsers: UserProfile[];
  refreshDemoUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'nexus_active_user_id';

async function api<T = any>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Permintaan gagal (${res.status}).`);
  return json as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [availableDemoUsers, setAvailableDemoUsers] = useState<UserProfile[]>(
    DEMO_MODE ? SEED_USERS : []
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (DEMO_MODE) {
        try {
          await seedInitialDatabaseIfEmpty();
        } catch (err) {
          console.warn('DB initialization check:', err);
        }
      }
      try {
        const me = await api<{ user: UserProfile | null; googleEnabled: boolean }>('/api/auth/me');
        if (!isMounted) return;
        setGoogleEnabled(!!me.googleEnabled);
        if (me.user) {
          setUserProfile(me.user);
        } else if (DEMO_MODE) {
          const activeId = localStorage.getItem(DEMO_STORAGE_KEY);
          setUserProfile(SEED_USERS.find((u) => u.id === activeId) || null);
        }
      } catch (err) {
        console.warn('Gagal memeriksa sesi login:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Daftar pengguna (untuk notifikasi pendaftar baru, dll.) dimuat setelah login.
  useEffect(() => {
    if (DEMO_MODE) return;
    if (userProfile && userProfile.status !== 'pending' && userProfile.status !== 'rejected') {
      getAllUsers()
        .then((users) => setAvailableDemoUsers(users))
        .catch(() => setAvailableDemoUsers([]));
    } else {
      setAvailableDemoUsers([]);
    }
  }, [userProfile?.id, userProfile?.status]);

  const loginWithGoogle = async () => {
    window.location.href = '/api/auth/google/start';
  };

  const refreshDemoUsers = async () => {
    try {
      const users = await getAllUsers();
      if (users && users.length > 0) setAvailableDemoUsers(users);
    } catch (err) {
      console.warn('Failed to refresh users:', err);
    }
  };

  const refreshCurrentUser = async () => {
    if (DEMO_MODE) return;
    try {
      const me = await api<{ user: UserProfile | null }>('/api/auth/me');
      if (me.user) setUserProfile(me.user);
    } catch (err) {
      console.warn('Failed to refresh current user:', err);
    }
  };

  const registerAccount = async (data: RegistrationData): Promise<UserProfile> => {
    if (DEMO_MODE) {
      const newUser = await registerNewAccount(data);
      await refreshDemoUsers();
      return newUser;
    }
    const { rawPassword, setupCode, ...profile } = data;
    const res = await api<{ user: UserProfile }>('/api/auth/register', {
      ...profile,
      password: rawPassword || '',
      setupCode,
    });
    return res.user;
  };

  /** Dipanggil setelah layar "pendaftaran berhasil" agar aplikasi masuk ke sesi baru. */
  const loginWithEmail = async (email: string, pass: string) => {
    if (DEMO_MODE) {
      const normalized = email.trim().toLowerCase();
      const matchedUser = SEED_USERS.find((u) => u.email.toLowerCase() === normalized);
      if (matchedUser) {
        setUserProfile(matchedUser);
        localStorage.setItem(DEMO_STORAGE_KEY, matchedUser.id);
        return;
      }
    }
    const res = await api<{ user: UserProfile }>('/api/auth/login', { email: email.trim(), password: pass });
    clearStoreCache();
    setUserProfile(res.user);
  };

  const getPasswordLinkInfo = (token: string) =>
    api<{ email: string; displayName?: string }>('/api/auth/password-link/info', { token });

  const setPasswordWithLink = async (token: string, password: string) => {
    const res = await api<{ user: UserProfile }>('/api/auth/set-password', { token, password });
    clearStoreCache();
    setUserProfile(res.user);
  };

  const createPasswordLink = (userId: string) =>
    api<{ url: string; expiresInDays: number; email: string }>('/api/auth/password-link', { userId });

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api('/api/auth/change-password', { currentPassword, newPassword });
  };

  const switchDemoRole = async (roleOrUserId: string) => {
    if (!DEMO_MODE) return;
    const pool = availableDemoUsers.length > 0 ? availableDemoUsers : SEED_USERS;
    const targetUser =
      pool.find((u) => u.id === roleOrUserId) || pool.find((u) => u.role === roleOrUserId);
    if (targetUser) {
      setUserProfile(targetUser);
      localStorage.setItem(DEMO_STORAGE_KEY, targetUser.id);
    }
  };

  const updateAvatar = async (newAvatarUrl: string) => {
    if (!userProfile) return;
    try {
      const { updateUserProfile, logActivity } = await import('../services/db');
      await updateUserProfile(
        userProfile.id,
        { avatarUrl: newAvatarUrl },
        userProfile.displayName,
        userProfile.role
      );

      setUserProfile({ ...userProfile, avatarUrl: newAvatarUrl });
      setAvailableDemoUsers((prev) =>
        prev.map((u) => (u.id === userProfile.id ? { ...u, avatarUrl: newAvatarUrl } : u))
      );

      await logActivity({
        action: 'Ganti Foto Avatar Pengguna',
        actorName: userProfile.displayName,
        actorRole:
          userProfile.role === 'owner'
            ? 'Owner / BOD'
            : userProfile.role === 'client' || userProfile.role === 'klien'
            ? 'Klien UKM'
            : 'Tim Nexus',
        details: `${userProfile.displayName} (${userProfile.role}) memperbarui foto profil avatar ke gambar baru.`,
      });
    } catch (err) {
      console.error('Failed to update avatar:', err);
      throw err;
    }
  };

  const logout = async () => {
    clearStoreCache();
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setUserProfile(null);
    try {
      await api('/api/auth/logout', {});
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userProfile,
        loading,
        googleEnabled,
        loginWithGoogle,
        loginWithEmail,
        registerAccount,
        getPasswordLinkInfo,
        setPasswordWithLink,
        createPasswordLink,
        changePassword,
        refreshCurrentUser,
        updateAvatar,
        logout,
        switchDemoRole,
        availableDemoUsers,
        refreshDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
