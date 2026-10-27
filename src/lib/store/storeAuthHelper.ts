/**
 * FAMA STORE — Helper de Autorización y Servidor
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVER API ROUTES.
 */

import { NextRequest } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { isDevAuthAllowed, ADMIN_SDK_UNAVAILABLE_ERROR } from '@/lib/firebase/devAuth';
import { UserProfile, StoreProduct, StoreAuditEntry } from '@/types/models';

export interface StoreAuthResult {
  authenticated: boolean;
  uid?: string;
  email?: string;
  profile?: UserProfile | null;
  canManage: boolean;
  canViewFinancials: boolean;
  error?: string;
}

/**
 * Valida la autenticación de la petición y verifica permisos administrativos
 * sobre la tienda oficial de RENACER CHURCH.
 */
export async function verifyStoreAdminRequest(
  request: NextRequest,
  requireManagePrivilege = true
): Promise<StoreAuthResult> {
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
    const devStoreAccess = request.headers.get('x-dev-store-access') === 'true';

    const isAdmin = devRole === 'admin';
    const canManage = isAdmin || devStoreAccess;
    const canViewFinancials = isAdmin;

    if (requireManagePrivilege && !canManage) {
      return {
        authenticated: true,
        uid: devUid,
        canManage: false,
        canViewFinancials: false,
        error: 'Privilegios administrativos de FAMA Store requeridos.',
      };
    }

    return {
      authenticated: true,
      uid: devUid,
      email: 'admin.store@renacer.church',
      canManage,
      canViewFinancials,
    };
  }

  let idToken = '';
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.split('Bearer ')[1].trim();
  } else {
    const sessionCookie = request.cookies.get('session')?.value;
    if (sessionCookie) idToken = sessionCookie;
  }

  if (!idToken) {
    if (!requireManagePrivilege) {
      return {
        authenticated: false,
        canManage: false,
        canViewFinancials: false,
      };
    }
    return {
      authenticated: false,
      canManage: false,
      canViewFinancials: false,
      error: 'Token de autenticación requerido para operaciones administrativas.',
    };
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get();
    let profile: UserProfile | null = null;
    if (userDoc.exists) {
      profile = { uid, ...userDoc.data() } as UserProfile;
    }

    const isAdmin = profile?.role === 'admin' || profile?.role === 'pastor';
    const canManage = isAdmin || profile?.storeAccess === true;
    const canViewFinancials = isAdmin;

    if (requireManagePrivilege && !canManage) {
      return {
        authenticated: true,
        uid,
        email,
        profile,
        canManage: false,
        canViewFinancials: false,
        error: 'No tienes autorización asignada para gestionar la tienda o pedidos.',
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
 * Sanitiza los datos de los productos eliminando el costo de adquisición interno
 * si el usuario no tiene permisos financieros de nivel administrador.
 */
export function sanitizeProductFinancials<T extends StoreProduct | StoreProduct[]>(
  products: T,
  canView: boolean
): T {
  if (canView) return products;

  const sanitizeSingle = (item: StoreProduct): StoreProduct => {
    const copy: Record<string, unknown> & StoreProduct = { ...item };
    delete copy.costPrice;
    delete copy.internalCost;
    delete copy.supplier;
    delete copy.internalNotes;
    if (Array.isArray(copy.variants)) {
      copy.variants = copy.variants.map((v) => {
        const vCopy: Record<string, unknown> = { ...v };
        delete vCopy.cost;
        delete vCopy.costPrice;
        return vCopy as unknown as typeof v;
      });
    }
    return copy;
  };

  if (Array.isArray(products)) {
    return products.map((p) => sanitizeSingle(p)) as T;
  }

  return sanitizeSingle(products as StoreProduct) as T;
}

/**
 * Emite una notificación interna al cliente sobre el estado de su pedido.
 */
export async function sendStoreNotification(params: {
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

      if (!existing.empty) return;
    }

    await db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).add({
      userId: params.userId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || '/perfil?tab=pedidos',
      deduplicationKey: params.deduplicationKey || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Error al emitir notificación de pedido:', e);
  }
}

/**
 * Crea una entrada de auditoría para trazabilidad de pedidos y catálogo.
 */
export function createStoreAuditEntry(
  userUid: string,
  userName: string,
  action: string,
  details: string
): StoreAuditEntry {
  return {
    timestamp: new Date().toISOString(),
    userUid,
    userName,
    action,
    details,
  };
}
