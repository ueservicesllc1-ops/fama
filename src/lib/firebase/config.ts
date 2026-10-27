/**
 * FAMA - Inicialización Oficial de Firebase Client SDK
 * Proyecto: fama-db35d
 *
 * Expone las instancias de Firebase App, Authentication y Cloud Firestore
 * conectadas a los servicios reales de Firebase.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Valida si las variables de entorno de Firebase están presentes.
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.authDomain
  );
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (typeof window !== 'undefined' || isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig as Record<string, string>);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error('[Firebase] Error al inicializar el SDK del cliente:', error);
  }
}

export { app, auth, db };

export const getFirebaseStatus = () => {
  const configured = isFirebaseConfigured();
  return {
    isConfigured: configured,
    message: configured
      ? "Firebase está conectado al proyecto real fama-db35d."
      : "Firebase requiere las variables de entorno NEXT_PUBLIC_FIREBASE_* en .env.local.",
  };
};
