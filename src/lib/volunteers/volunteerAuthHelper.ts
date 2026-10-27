/**
 * FAMA — Helper de Autorización en Servidor para Gestión de Voluntarios y Ministerios
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR (API Routes).
 * Aplica el principio de menor privilegio:
 *  - Los coordinadores solo administran ministerios donde han sido explícitamente designados.
 *  - Los responsables pastorales NO reciben permisos de coordinación automáticamente.
 */

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

export interface CoordinatorAuthResult {
  authorized: boolean;
  uid?: string;
  email?: string;
  displayName?: string;
  role?: string;
  isOverallAdmin: boolean;
  authorizedMinistries: string[]; // IDs de ministerios autorizados para este usuario
  error?: string;
  status: number;
}

export async function verifyCoordinatorRequest(
  request: NextRequest,
  requiredMinistryId?: string
): Promise<CoordinatorAuthResult> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  if (!auth || !db) {
    return {
      authorized: false,
      isOverallAdmin: false,
      authorizedMinistries: [],
      error: 'Firebase Admin SDK no está configurado en el servidor.',
      status: 500,
    };
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      isOverallAdmin: false,
      authorizedMinistries: [],
      error: 'Cabecera de autorización ausente o inválida.',
      status: 401,
    };
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return {
      authorized: false,
      isOverallAdmin: false,
      authorizedMinistries: [],
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
        isOverallAdmin: false,
        authorizedMinistries: [],
        error: 'Usuario no registrado en el sistema.',
        status: 403,
      };
    }

    const userData = userDoc.data();
    const role = userData?.role || decoded.role;
    const isOverallAdmin = role === 'admin';
    const displayName =
      userData?.displayName || decoded.name || decoded.email?.split('@')[0] || 'Coordinador';

    // Obtener todos los ministerios para verificar coordinaciones explícitas
    const minSnap = await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).get();
    const authorizedMinistries: string[] = [];

    minSnap.forEach((mDoc) => {
      const mData = mDoc.data();
      if (
        isOverallAdmin ||
        mData.leaderUid === uid ||
        (Array.isArray(mData.coordinators) && mData.coordinators.includes(uid))
      ) {
        authorizedMinistries.push(mDoc.id);
      }
    });

    // Si se especificó un ministerio requerido
    if (requiredMinistryId) {
      const canManage = isOverallAdmin || authorizedMinistries.includes(requiredMinistryId);
      if (!canManage) {
        return {
          authorized: false,
          uid,
          email: decoded.email,
          displayName,
          role,
          isOverallAdmin,
          authorizedMinistries,
          error: 'Acceso denegado: No tienes autorización para coordinar este ministerio.',
          status: 403,
        };
      }
    } else {
      // Para acceso general al panel de voluntarios
      if (!isOverallAdmin && authorizedMinistries.length === 0) {
        return {
          authorized: false,
          uid,
          email: decoded.email,
          displayName,
          role,
          isOverallAdmin,
          authorizedMinistries,
          error: 'Acceso denegado: No tienes asignada la coordinación de ningún ministerio.',
          status: 403,
        };
      }
    }

    return {
      authorized: true,
      uid,
      email: decoded.email,
      displayName,
      role,
      isOverallAdmin,
      authorizedMinistries,
      status: 200,
    };
  } catch {
    return {
      authorized: false,
      isOverallAdmin: false,
      authorizedMinistries: [],
      error: 'Token inválido o sesión expirada.',
      status: 401,
    };
  }
}
