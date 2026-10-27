/**
 * FAMA - Inicialización Oficial de Firebase Admin SDK
 * Proyecto: fama-db35d
 *
 * USO EXCLUSIVO EN EL SERVIDOR (Server Components, Server Actions, API Routes).
 * NUNCA importar en componentes con 'use client'.
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

export function getFirebaseAdminApp(): App | null {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Corregir escapes de saltos de línea en la clave privada si vienen como string
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

export function getAdminFirestore(): Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // Ya configurado en el ciclo de vida del singleton de Firestore
  }
  return db;
}

export function getAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  return getAuth(app);
}
