/**
 * FAMA - Verificación de Autorización para Operaciones de Administrador en Servidor
 *
 * USO EXCLUSIVO EN EL SERVIDOR (API Routes).
 */

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from './admin';
import { FIRESTORE_COLLECTIONS } from './firestore';

export interface AdminAuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  error?: string;
  status: number;
}

export async function verifyAdminRequest(request: NextRequest): Promise<AdminAuthResult> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  if (!auth || !db) {
    return {
      authorized: false,
      error: 'Firebase Admin SDK no está configurado en el servidor.',
      status: 500,
    };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: 'Cabecera de autorización ausente o inválida.',
      status: 401,
    };
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return {
      authorized: false,
      error: 'Token de acceso no proporcionado.',
      status: 401,
    };
  }

  try {
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Verificar en Firestore si el usuario tiene rol 'admin'
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get();
    if (!userDoc.exists) {
      return {
        authorized: false,
        error: 'Usuario no registrado en el sistema.',
        status: 403,
      };
    }

    const userData = userDoc.data();
    const role = userData?.role || decoded.role;

    if (role !== 'admin' && role !== 'pastor') {
      return {
        authorized: false,
        error: 'Acceso denegado: Se requieren privilegios de Administrador o Pastor.',
        status: 403,
      };
    }

    const userDisplayName = userData?.displayName || decoded.name || decoded.email?.split('@')[0] || 'Administrador';

    return {
      authorized: true,
      uid,
      email: decoded.email,
      displayName: userDisplayName,
      role,
      status: 200,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Token inválido o expirado';
    return {
      authorized: false,
      error: msg,
      status: 401,
    };
  }
}
