/**
 * FAMA — Helper de Autorización y Permisos de Atención Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Control de acceso estricto y confidencial para el módulo pastoral.
 * Respeta el principio de menor privilegio: no todos los administradores
 * tienen acceso pastoral por defecto, únicamente el rol 'pastor' o
 * administradores con la concesión explícita 'pastoralAccess === true'.
 */

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserProfile } from '@/types/models';

export interface PastoralAuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  pastoralAccess?: boolean;
  error?: string;
  status: number;
}

/**
 * Verificación en el servidor (API Routes) para operaciones pastorales
 */
export async function verifyPastoralStaffRequest(request: NextRequest): Promise<PastoralAuthResult> {
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

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return {
      authorized: false,
      error: 'Token de acceso no proporcionado.',
      status: 401,
    };
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

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
    const pastoralAccess = userData?.pastoralAccess === true;

    // Regla de negocio ETAPA 10:
    // El rol 'pastor' tiene acceso pastoral nato.
    // El rol 'admin' sólo si tiene la concesión pastoralAccess explícita.
    const isAuthorized = role === 'pastor' || (role === 'admin' && pastoralAccess);

    if (!isAuthorized) {
      return {
        authorized: false,
        error: 'Acceso denegado: Esta sección es confidencial y requiere rol de Pastor o permiso pastoral concedido.',
        status: 403,
      };
    }

    const displayName =
      userData?.displayName || decoded.name || decoded.email?.split('@')[0] || 'Personal Pastoral';

    return {
      authorized: true,
      uid,
      email: decoded.email,
      displayName,
      role,
      pastoralAccess,
      status: 200,
    };
  } catch {
    return {
      authorized: false,
      error: 'Token inválido o sesión expirada.',
      status: 401,
    };
  }
}

/**
 * Verificación en el cliente para mostrar / ocultar vistas o botones
 */
export function canAccessPastoral(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'pastor') return true;
  if (profile.role === 'admin' && profile.pastoralAccess === true) return true;
  return false;
}
