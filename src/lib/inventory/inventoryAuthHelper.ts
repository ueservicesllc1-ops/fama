/**
 * FAMA — Helper de Servidor para Autenticación, Permisos y Protección Financiera de Inventario
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR (API Route Handlers).
 */

import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserProfile, InventoryItem, ResourceMaintenance } from '@/types/models';

export interface InventoryAuthResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  profile?: UserProfile | null;
  canManage: boolean;
  canViewFinancials: boolean;
  error?: string;
}

/**
 * Valida el token Bearer del encabezado y recupera el perfil del usuario desde Firestore.
 * Verifica privilegios de gestión de inventario y acceso a datos financieros restringidos.
 */
export async function verifyInventoryRequest(
  request: NextRequest,
  requireManagePrivilege = false
): Promise<InventoryAuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      canManage: false,
      canViewFinancials: false,
      error: 'Token de autenticación no proporcionado o formato inválido.',
    };
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return {
      authenticated: false,
      canManage: false,
      canViewFinancials: false,
      error: 'Token vacío.',
    };
  }

  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return {
      authenticated: false,
      canManage: false,
      canViewFinancials: false,
      error: 'Servicio de autenticación no disponible en el servidor.',
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    const db = getAdminFirestore();
    let profile: UserProfile | null = null;

    if (db) {
      const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get();
      if (userDoc.exists) {
        profile = { uid, ...userDoc.data() } as UserProfile;
      }
    }

    const isAdmin = profile?.role === 'admin';
    const hasInventoryAccess = profile?.inventoryAccess === true;
    const canManage = isAdmin || hasInventoryAccess;
    const canViewFinancials = isAdmin;

    if (requireManagePrivilege && !canManage) {
      return {
        authenticated: true,
        uid,
        email,
        profile,
        canManage: false,
        canViewFinancials: false,
        error: 'Permisos insuficientes. Se requiere rol de Administrador o Encargado de Inventario.',
      };
    }

    return {
      authenticated: true,
      uid,
      email,
      profile,
      canManage,
      canViewFinancials,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al verificar credenciales';
    return {
      authenticated: false,
      canManage: false,
      canViewFinancials: false,
      error: msg,
    };
  }
}

/**
 * Sanitiza los datos de un recurso de inventario eliminando los costos de adquisición
 * si el usuario no tiene permisos financieros explícitos (solo administradores).
 */
export function sanitizeItemFinancials<T extends InventoryItem | InventoryItem[]>(
  items: T,
  canView: boolean
): T {
  if (canView) return items;

  if (Array.isArray(items)) {
    return items.map((item) => {
      const copy = { ...item };
      delete copy.acquisitionCost;
      return copy;
    }) as T;
  }

  const copy = { ...(items as InventoryItem) };
  delete copy.acquisitionCost;
  return copy as T;
}

/**
 * Sanitiza los datos de mantenimiento eliminando los costos de reparación
 * si el usuario no tiene autorización financiera.
 */
export function sanitizeMaintenanceFinancials<
  T extends ResourceMaintenance | ResourceMaintenance[]
>(records: T, canView: boolean): T {
  if (canView) return records;

  if (Array.isArray(records)) {
    return records.map((rec) => {
      const copy = { ...rec };
      delete copy.repairCost;
      return copy;
    }) as T;
  }

  const copy = { ...(records as ResourceMaintenance) };
  delete copy.repairCost;
  return copy as T;
}

/**
 * Emite una notificación interna en la colección 'notifications'
 * con mecanismo de deduplicación mediante clave única opcional.
 */
export async function sendInventoryNotification(params: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  deduplicationKey?: string;
}) {
  const db = getAdminFirestore();
  if (!db) return;

  try {
    if (params.deduplicationKey) {
      const existing = await db
        .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS)
        .where('deduplicationKey', '==', params.deduplicationKey)
        .limit(1)
        .get();

      if (!existing.empty) {
        // Ya se envió un aviso equivalente, evitar duplicación
        return;
      }
    }

    await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || '/perfil?tab=prestamos',
      deduplicationKey: params.deduplicationKey || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[INVENTORY_NOTIFICATION] Error no bloqueante al registrar notificación:', err);
  }
}
