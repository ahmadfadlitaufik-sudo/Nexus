import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile } from '../types';
import {
  getUserProfile,
  seedInitialDatabaseIfEmpty,
  getAllUsers,
  getAuthLinkedUserId,
  setAuthLink,
  findProfileByAuthEmail,
  deleteOwnPendingProfile,
  registerNewAccount,
} from '../services/db';
import { SEED_USERS } from '../data/seedData';
import { DEMO_MODE, isOwnerEmail } from '../config/appMode';

type RegistrationData = Omit<UserProfile, 'id' | 'createdAt'> & { rawPassword?: string };

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  /** true jika akun email/password belum diverifikasi lewat email. */
  needsEmailVerification: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerAccount: (data: RegistrationData) => Promise<UserProfile>;
  resendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updateAvatar: (newAvatarUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  // Pemilih akun simulasi — HANYA aktif saat DEMO_MODE.
  switchDemoRole: (roleOrUserId: string) => Promise<void>;
  availableDemoUsers: UserProfile[];
  refreshDemoUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'nexust_active_user_id';

function isPasswordAccount(user: User) {
  return user.providerData.some((p) => p.providerId === 'password');
}

/**
 * Cari / buat profil untuk akun Firebase yang sedang login.
 * Urutan: tautan auth_links -> profil undangan dengan email sama -> profil sendiri users/{uid}
 * -> buat profil baru berstatus "pending".
 */
async function resolveProfileForAuthUser(
  fbUser: User,
  registration: RegistrationData | null
): Promise<UserProfile> {
  const email = (fbUser.email || '').trim().toLowerCase();
  const linkedId = await getAuthLinkedUserId(fbUser.uid);

  // 1. Sudah tertaut ke profil undangan / data awal.
  if (linkedId && linkedId !== fbUser.uid) {
    const linked = await getUserProfile(linkedId);
    if (linked) return linked;
  }

  // 2. Email terverifikasi -> tautkan ke profil yang dibuat Owner (undangan) bila ada.
  if (fbUser.emailVerified && email) {
    const existing = await findProfileByAuthEmail(fbUser.email || email);
    if (existing && existing.id !== fbUser.uid) {
      await setAuthLink(fbUser.uid, existing.id, email);
      if (linkedId === fbUser.uid) {
        // Hapus profil pendaftaran ganda yang sempat dibuat sebelum verifikasi.
        await deleteOwnPendingProfile(fbUser.uid);
      }
      return existing;
    }
  }

  // 3. Profil milik sendiri (hasil pendaftaran mandiri).
  const own = await getUserProfile(fbUser.uid);
  if (own) {
    if (!linkedId) await setAuthLink(fbUser.uid, fbUser.uid, email);
    return own;
  }

  // 4. Profil baru.
  let profile: UserProfile;
  if (isOwnerEmail(email) && fbUser.emailVerified) {
    profile = {
      id: fbUser.uid,
      email,
      displayName: fbUser.displayName || 'Ahmad Fadli Taufik',
      role: 'owner',
      status: 'active',
      registrationCategory: 'bod',
      title: 'Founder & Managing Partner',
      avatarUrl: fbUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
    };
    const { saveUserProfile } = await import('../services/db');
    await saveUserProfile(profile);
  } else {
    // Pendaftar baru (form daftar atau Google pertama kali) selalu menunggu persetujuan Owner.
    profile = await registerNewAccount({
      ...(registration || {
        displayName: fbUser.displayName || email.split('@')[0] || 'Pengguna Nexust',
        role: 'konsultan',
        title: 'Calon Anggota Tim',
        registrationCategory: 'staff',
      }),
      id: fbUser.uid,
      email,
      avatarUrl: registration?.avatarUrl || fbUser.photoURL || undefined,
      status: 'pending',
    } as RegistrationData & { id: string });
  }
  await setAuthLink(fbUser.uid, fbUser.uid, email);
  return profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [availableDemoUsers, setAvailableDemoUsers] = useState<UserProfile[]>(
    DEMO_MODE ? SEED_USERS : []
  );

  // Data form pendaftaran yang menunggu akun Firebase selesai dibuat.
  const pendingRegistration = useRef<RegistrationData | null>(null);
  // Mencegah profil dibuat dua kali (listener + registerAccount berjalan bersamaan).
  const resolving = useRef<Map<string, Promise<UserProfile>>>(new Map());

  const loadProfile = (fbUser: User) => {
    let p = resolving.current.get(fbUser.uid);
    if (!p) {
      p = resolveProfileForAuthUser(fbUser, pendingRegistration.current).finally(() => {
        resolving.current.delete(fbUser.uid);
      });
      resolving.current.set(fbUser.uid, p);
    }
    return p;
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      if (DEMO_MODE) {
        try {
          await seedInitialDatabaseIfEmpty();
          const users = await getAllUsers();
          if (isMounted && users && users.length > 0) setAvailableDemoUsers(users);
        } catch (err) {
          console.warn('DB initialization check:', err);
        }
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        setCurrentUser(firebaseUser);

        if (firebaseUser) {
          if (isPasswordAccount(firebaseUser) && !firebaseUser.emailVerified) {
            // Akun email/password wajib verifikasi email sebelum bisa dipakai.
            setNeedsEmailVerification(true);
            setUserProfile(null);
          } else {
            setNeedsEmailVerification(false);
            try {
              const profile = await loadProfile(firebaseUser);
              if (isMounted) setUserProfile(profile);
            } catch (err) {
              console.warn('Error loading user profile:', err);
              if (isMounted) setUserProfile(null);
            }
          }
        } else {
          setNeedsEmailVerification(false);
          const activeId = DEMO_MODE ? localStorage.getItem(DEMO_STORAGE_KEY) : null;
          const found = activeId ? SEED_USERS.find((u) => u.id === activeId) : undefined;
          setUserProfile(found || null);
        }
        if (isMounted) setLoading(false);
      });
    }

    initAuth();
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // Di produksi, daftar pengguna (untuk notifikasi pendaftar baru, dll.) dimuat setelah login.
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
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
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
    if (!userProfile) return;
    try {
      const refreshed = await getUserProfile(userProfile.id);
      if (refreshed) setUserProfile(refreshed);
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
    const password = data.rawPassword || '';
    if (password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }
    const { rawPassword: _pw, ...profileData } = data;
    pendingRegistration.current = profileData;
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), password);
      await sendEmailVerification(cred.user);
      // Simpan data pendaftaran sekarang (status pending). Setelah email diverifikasi,
      // akun akan otomatis tertaut ke profil undangan Owner bila emailnya sama.
      const profile = await loadProfile(cred.user);
      return profile;
    } finally {
      pendingRegistration.current = null;
    }
  };

  const resendVerificationEmail = async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

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
    // Login asli: password diperiksa oleh Firebase Auth.
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    if (!cred.user.emailVerified) {
      // Token lama mungkin belum tahu bahwa email sudah diverifikasi.
      await cred.user.reload();
      if (auth.currentUser?.emailVerified) {
        await auth.currentUser.getIdToken(true);
        setNeedsEmailVerification(false);
        const profile = await loadProfile(auth.currentUser);
        setUserProfile(profile);
      }
    }
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

      const updatedProfile = { ...userProfile, avatarUrl: newAvatarUrl };
      setUserProfile(updatedProfile);
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
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setUserProfile(null);
      setNeedsEmailVerification(false);
      if (auth.currentUser) await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        needsEmailVerification,
        loginWithGoogle,
        loginWithEmail,
        registerAccount,
        resendVerificationEmail,
        resetPassword,
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
