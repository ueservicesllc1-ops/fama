/**
 * FAMA — Helper de Autorización y Lógica de Servidor para Instalaciones y Mantenimiento
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVER API ROUTES.
 */

import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { isDevAuthAllowed, ADMIN_SDK_UNAVAILABLE_ERROR } from '@/lib/firebase/devAuth';
import {
  UserProfile,
  MaintenanceTicket,
  FacilityAuditEntry,
} from '@/types/models';

export interface FacilityAuthResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  profile?: UserProfile | null;
  canManage: boolean;
  canViewFinancials: boolean;
  error?: string;
}

/**
 * Valida la autenticación de la petición y calcula los privilegios operativos
 * sobre el módulo de instalaciones físicas y mantenimiento.
 */
export async function verifyFacilityRequest(
  request: NextRequest,
  requireManagePrivilege = false
): Promise<FacilityAuthResult> {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  if (!auth || !db) {
    // Sin credenciales de servicio: denegar salvo modo desarrollo explícito
    if (!isDevAuthAllowed()) {
      return {
        authenticated: false,
        canManage: false,
        canViewFinancials: false,
        error: ADMIN_SDK_UNAVAILABLE_ERROR,
      };
    }
    const devUid = request.headers.get('x-dev-user-uid') || 'mock-admin-uid';
    const devRole = request.headers.get('x-dev-user-role') || 'admin';
    const devFacilityAccess = request.headers.get('x-dev-facility-access') === 'true';

    const isAdmin = devRole === 'admin';
    const canManage = isAdmin || devFacilityAccess;
    const canViewFinancials = isAdmin;

    if (requireManagePrivilege && !canManage) {
      return {
        authenticated: true,
        uid: devUid,
        canManage: false,
        canViewFinancials: false,
        error: 'Privilegios de gestión de instalaciones requeridos.',
      };
    }

    return {
      authenticated: true,
      uid: devUid,
      email: 'admin@renacer.church',
      canManage,
      canViewFinancials,
    };
  }

  // 1. Extraer token de cabecera Authorization o cookie de sesión
  let idToken = '';
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.split('Bearer ')[1].trim();
  } else {
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) idToken = sessionCookie;
  }

  if (!idToken) {
    return {
      authenticated: false,
      canManage: false,
      canViewFinancials: false,
      error: 'Token de autenticación ausente.',
    };
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // Consultar el perfil del usuario en Firestore
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get();
    let profile: UserProfile | null = null;
    if (userDoc.exists) {
      profile = { uid, ...userDoc.data() } as UserProfile;
    }

    const isAdmin = profile?.role === 'admin';
    const canManage = isAdmin || profile?.facilityAccess === true;
    const canViewFinancials = isAdmin; // Costos financieros restringidos estrictamente a administradores

    if (requireManagePrivilege && !canManage) {
      return {
        authenticated: true,
        uid,
        email,
        profile,
        canManage: false,
        canViewFinancials: false,
        error: 'No posees permisos asignados para administrar instalaciones y reparaciones.',
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
 * Sanitiza los datos de solicitudes de mantenimiento eliminando los costos
 * (estimatedCost, actualCost, unitCost de repuestos) si el usuario no tiene rol administrador.
 */
export function sanitizeTicketFinancials<T extends MaintenanceTicket | MaintenanceTicket[]>(
  tickets: T,
  canView: boolean
): T {
  if (canView) return tickets;

  const sanitizeSingle = (ticket: MaintenanceTicket): MaintenanceTicket => {
    const copy = { ...ticket };
    delete copy.estimatedCost;
    delete copy.actualCost;
    if (copy.materials && Array.isArray(copy.materials)) {
      copy.materials = copy.materials.map((m) => {
        const mCopy = { ...m };
        delete mCopy.unitCost;
        return mCopy;
      });
    }
    return copy;
  };

  if (Array.isArray(tickets)) {
    return tickets.map((t) => sanitizeSingle(t)) as T;
  }

  return sanitizeSingle(tickets as MaintenanceTicket) as T;
}

/**
 * Emite una notificación interna en la colección 'notifications'
 * con mecanismo de deduplicación opcional.
 */
export async function sendFacilityNotification(params: {
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
        return;
      }
    }

    await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || '/perfil?tab=mantenimiento',
      deduplicationKey: params.deduplicationKey || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error al emitir notificación de instalaciones:', e);
  }
}

/**
 * Crea una entrada de auditoría para trazabilidad de modificaciones en instalaciones y tareas
 */
export function createFacilityAuditEntry(
  userUid: string,
  userName: string,
  action: string,
  details: string
): FacilityAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    userUid,
    userName,
    action,
    details,
  };
}
