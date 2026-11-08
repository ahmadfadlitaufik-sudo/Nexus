import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile, UserRole } from '../types';
import { getUserProfile, saveUserProfile, seedInitialDatabaseIfEmpty, getAllUsers } from '../services/db';
import { SEED_USERS } from '../data/seedData';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerAccount: (data: Omit<UserProfile, 'id' | 'createdAt'> & { rawPassword?: string }) => Promise<UserProfile>;
  refreshCurrentUser: () => Promise<void>;
  updateAvatar: (newAvatarUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  // Quick role switcher for seamless evaluation of all 3 roles (Owner, Konsultan, Klien)
  switchDemoRole: (roleOrUserId: string) => Promise<void>;
  availableDemoUsers: UserProfile[];
  refreshDemoUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [availableDemoUsers, setAvailableDemoUsers] = useState<UserProfile[]>(SEED_USERS);

  // Initialize DB and Auth listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        await seedInitialDatabaseIfEmpty();
        const users = await getAllUsers();
        if (isMounted && users && users.length > 0) {
          setAvailableDemoUsers(users);
        }
      } catch (err) {
        console.warn('DB initialization check:', err);
      }

      // Check local storage for active demo user if offline/testing
      const savedDemoUserId = localStorage.getItem('nexust_active_user_id');
      if (savedDemoUserId) {
        const found = SEED_USERS.find((u) => u.id === savedDemoUserId);
        if (found && isMounted) {
          setUserProfile(found);
        }
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!isMounted) return;
        setCurrentUser(firebaseUser);

        if (firebaseUser) {
          // If real user is logged in via Firebase
          try {
            let profile = await getUserProfile(firebaseUser.uid);
            if (!profile) {
              // Check if email matches owner or any seed user
              const matchedSeed = SEED_USERS.find(
                (u) => u.email.toLowerCase() === (firebaseUser.email || '').toLowerCase()
              );

              const role: UserRole =
                matchedSeed?.role ||
                (firebaseUser.email === 'Ahmadfadlitaufik@gmail.com' ? 'owner' : 'consultant');

              profile = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || matchedSeed?.displayName || 'Pengguna Nexust',
                role,
                clientId: matchedSeed?.clientId,
                title: matchedSeed?.title || (role === 'owner' ? 'Managing Partner' : 'Konsultan'),
                avatarUrl: firebaseUser.photoURL || matchedSeed?.avatarUrl,
                createdAt: new Date().toISOString(),
              };
              await saveUserProfile(profile);
            }
            if (isMounted) {
              setUserProfile(profile);
              localStorage.setItem('nexust_active_user_id', profile.id);
            }
          } catch (err) {
            console.warn('Error loading user profile:', err);
          }
        } else {
          // If no Firebase user, check if we still have a local demo session
          const activeId = localStorage.getItem('nexust_active_user_id');
          if (activeId) {
            const found = SEED_USERS.find((u) => u.id === activeId);
            if (found && isMounted) {
              setUserProfile(found);
            }
          }
        }
        if (isMounted) setLoading(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }

    initAuth();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshDemoUsers = async () => {
    try {
      const users = await getAllUsers();
      if (users && users.length > 0) {
        setAvailableDemoUsers(users);
      }
    } catch (err) {
      console.warn('Failed to refresh demo users:', err);
    }
  };

  const refreshCurrentUser = async () => {
    if (!userProfile) return;
    try {
      const refreshed = await getUserProfile(userProfile.id);
      if (refreshed) {
        setUserProfile(refreshed);
      }
    } catch (err) {
      console.warn('Failed to refresh current user:', err);
    }
  };

  const registerAccount = async (
    data: Omit<UserProfile, 'id' | 'createdAt'> & { rawPassword?: string }
  ): Promise<UserProfile> => {
    setLoading(true);
    try {
      const { registerNewAccount } = await import('../services/db');
      const newUser = await registerNewAccount(data);
      await refreshDemoUsers();
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const normalized = email.trim().toLowerCase();
      // First check in-memory / seed users
      let matchedUser = SEED_USERS.find((u) => u.email.toLowerCase() === normalized);
      
      // If not in seed, check Firestore via getUserByEmail
      if (!matchedUser) {
        const { getUserByEmail } = await import('../services/db');
        const dbUser = await getUserByEmail(normalized);
        if (dbUser) {
          matchedUser = dbUser;
        }
      }

      if (matchedUser) {
        setUserProfile(matchedUser);
        localStorage.setItem('nexust_active_user_id', matchedUser.id);
        setLoading(false);
        return;
      }

      // Try Firebase auth as fallback
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Email sign-in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const switchDemoRole = async (roleOrUserId: string) => {
    setLoading(true);
    try {
      // Find by ID or by role in available users or SEED_USERS
      const pool = availableDemoUsers.length > 0 ? availableDemoUsers : SEED_USERS;
      let targetUser = pool.find((u) => u.id === roleOrUserId);
      if (!targetUser) {
        targetUser = pool.find((u) => u.role === roleOrUserId);
      }
      if (targetUser) {
        setUserProfile(targetUser);
        localStorage.setItem('nexust_active_user_id', targetUser.id);
      }
    } finally {
      setLoading(false);
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

      // Update in-memory state
      const updatedProfile = { ...userProfile, avatarUrl: newAvatarUrl };
      setUserProfile(updatedProfile);

      setAvailableDemoUsers((prev) =>
        prev.map((u) => (u.id === userProfile.id ? { ...u, avatarUrl: newAvatarUrl } : u))
      );

      // Log in ActivityLog
      await logActivity({
        action: 'Ganti Foto Avatar Pengguna',
        actorName: userProfile.displayName,
        actorRole:
          userProfile.role === 'owner'
            ? 'Owner / BOD'
            : userProfile.role === 'client'
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
    setLoading(true);
    try {
      localStorage.removeItem('nexust_active_user_id');
      setUserProfile(null);
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerAccount,
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
