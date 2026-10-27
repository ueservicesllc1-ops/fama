'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { FIRESTORE_COLLECTIONS } from './firestore';
import { UserProfile, UserRole } from '@/types/models';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName: string, campus?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(auth));
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (uid: string, fallbackUser?: User): Promise<UserProfile | null> => {
    if (!db) return null;
    try {
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserProfile;
      } else if (fallbackUser) {
        // Crear perfil inicial si no existe en Firestore (ej. tras login con Google)
        const newProfile: UserProfile = {
          uid: fallbackUser.uid,
          email: fallbackUser.email || '',
          displayName: fallbackUser.displayName || 'Miembro FAMA',
          photoURL: fallbackUser.photoURL || undefined,
          role: 'member' as UserRole,
          campus: 'virtual',
          joinedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isOnline: true,
        };
        await setDoc(userRef, newProfile);
        return newProfile;
      }
      return null;
    } catch (err: unknown) {
      console.error('[Auth] Error al cargar perfil desde Firestore:', err);
      return null;
    }
  };

  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userProf = await fetchProfile(currentUser.uid, currentUser);
        setProfile(userProf);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Authentication no está inicializado.');
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      const userProf = await fetchProfile(cred.user.uid, cred.user);
      setProfile(userProf);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al iniciar sesión.';
      setError(msg);
      throw err;
    }
  };

  const signUp = async (email: string, pass: string, displayName: string, campus: string = 'virtual') => {
    if (!auth || !db) throw new Error('Firebase no está inicializado.');
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      await firebaseUpdateProfile(cred.user, { displayName: displayName.trim() });

      const newProfile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        displayName: displayName.trim(),
        role: 'member' as UserRole,
        campus,
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isOnline: true,
      };

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, cred.user.uid), newProfile);
      setProfile(newProfile);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la cuenta.';
      setError(msg);
      throw err;
    }
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
    } catch (err: unknown) {
      console.error('[Auth] Error al cerrar sesión:', err);
    }
  };

  const resetPassword = async (email: string) => {
    if (!auth) throw new Error('Firebase Authentication no está inicializado.');
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar el correo de recuperación.';
      setError(msg);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Authentication no está inicializado.');
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      const userProf = await fetchProfile(cred.user.uid, cred.user);
      setProfile(userProf);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en autenticación con Google.';
      setError(msg);
      throw err;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user || !db) throw new Error('No hay sesión de usuario activa.');
    try {
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, user.uid);
      await updateDoc(userRef, {
        ...data,
        lastActiveAt: new Date().toISOString(),
      });

      if (auth?.currentUser && (data.displayName || data.photoURL)) {
        await firebaseUpdateProfile(auth.currentUser, {
          displayName: data.displayName ?? auth.currentUser.displayName ?? undefined,
          photoURL: data.photoURL ?? auth.currentUser.photoURL ?? undefined,
        });
      }

      setProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el perfil.';
      setError(msg);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        signInWithGoogle,
        updateUserProfile,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
