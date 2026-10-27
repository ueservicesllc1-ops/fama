/**
 * FAMA - Servicio de Peticiones de Oración Reales
 * Proyecto: fama-db35d
 *
 * Persistencia en Cloud Firestore con soporte estricto de anonimato
 * y registro anti-duplicados para la acción "He orado".
 * En el navegador utiliza la API del servidor (Admin SDK) como canal prioritario
 * para evitar interrupciones por restricciones de reglas remotas.
 */

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  increment,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';

/** Obtiene el ID token de la sesión actual (si existe) para autenticar llamadas a la API. */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {
    // Sin sesión válida: la petición se envía como visitante
  }
  return headers;
}

export interface RealPrayerRequest {
  id: string;
  userId?: string | null;
  authorName: string;
  isAnonymous: boolean;
  category: 'Salud' | 'Familia' | 'Finanzas' | 'Espiritual' | 'Agradecimiento';
  requestText: string;
  prayersCount: number;
  prayedByUsers: string[];
  createdAt: Timestamp | string | null;
}

export async function submitPrayerRequest(params: {
  category: 'Salud' | 'Familia' | 'Finanzas' | 'Espiritual' | 'Agradecimiento';
  requestText: string;
  isAnonymous: boolean;
  authorName?: string;
  user?: { uid: string; displayName?: string } | null;
}): Promise<string> {
  const trimmed = params.requestText.trim();
  if (!trimmed) throw new Error('El motivo de oración no puede estar vacío.');

  // Priorizar endpoint de servidor para garantizar persistencia fiable
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/community/prayer', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          category: params.category,
          requestText: trimmed,
          isAnonymous: params.isAnonymous,
          authorName: params.authorName || params.user?.displayName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.id) {
        return data.id;
      }
      // Rechazo explícito del servidor (validación, sesión, límite de tasa): no eludir con fallback
      if (res.status >= 400 && res.status < 500) {
        throw new Error(data.error || 'No se pudo guardar la petición de oración.');
      }
    } catch (err) {
      if (err instanceof Error && err.message !== 'Failed to fetch' && !(err instanceof TypeError) && !(err instanceof SyntaxError)) {
        throw err;
      }
      // Continuar con fallback cliente si falla la red
    }
  }

  if (!db) throw new Error('Base de datos no inicializada.');

  const isAnon = params.isAnonymous;
  const nameToSave = isAnon ? 'Hermano(a) en la Fe (Anónimo)' : (params.authorName || params.user?.displayName || 'Miembro FAMA');
  const uidToSave = isAnon ? null : (params.user?.uid || null);

  const docRef = await addDoc(collection(db, FIRESTORE_COLLECTIONS.PRAYER_REQUESTS), {
    userId: uidToSave,
    authorName: nameToSave,
    isAnonymous: isAnon,
    category: params.category,
    requestText: trimmed,
    prayersCount: 0,
    prayedByUsers: [],
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Registra un "He orado" real. Si el usuario ya oró, no duplica el conteo.
 */
export async function prayForRequest(requestId: string, uid: string): Promise<boolean> {
  if (!uid || !requestId) return false;

  // Priorizar endpoint de servidor para persistencia segura
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/community/prayer', {
        method: 'PATCH',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return true;
      }
      if (res.status >= 400 && res.status < 500) {
        return false;
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return false;

  const docRef = doc(db, FIRESTORE_COLLECTIONS.PRAYER_REQUESTS, requestId);
  try {
    await updateDoc(docRef, {
      prayersCount: increment(1),
      prayedByUsers: arrayUnion(uid),
    });
    return true;
  } catch (err) {
    console.warn('[PrayerService] No se pudo registrar oración en cliente:', err);
    return false;
  }
}

export function subscribeToPrayerRequests(
  onUpdate: (requests: RealPrayerRequest[]) => void
): () => void {
  let isSubscribed = true;

  // Carga inicial y respaldo periódico mediante API de servidor
  const fetchFromServer = async () => {
    try {
      const res = await fetch('/api/public/content?type=prayers');
      if (res.ok) {
        const data = await res.json();
        if (isSubscribed && data.success && Array.isArray(data.prayers)) {
          onUpdate(data.prayers as RealPrayerRequest[]);
        }
      }
    } catch {
      // Silenciar errores de red periódicos
    }
  };

  if (typeof window !== 'undefined') {
    fetchFromServer();
  }

  // Intervalo de actualización periódica si la suscripción directa no está habilitada
  const intervalId = setInterval(() => {
    if (isSubscribed) fetchFromServer();
  }, 30000);

  if (!db) {
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }

  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.PRAYER_REQUESTS),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    const unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        if (!isSubscribed) return;
        const list: RealPrayerRequest[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: data.userId,
            authorName: data.authorName,
            isAnonymous: data.isAnonymous,
            category: data.category,
            requestText: data.requestText,
            prayersCount: data.prayersCount || 0,
            prayedByUsers: data.prayedByUsers || [],
            createdAt: data.createdAt,
          });
        });
        onUpdate(list);
      },
      (err) => {
        // En caso de que las reglas de la base de datos restrinjan el snapshot anónimo,
        // se usa el respaldo del servidor y se emite únicamente como advertencia controlada
        console.warn('[PrayerService] Suscripción directa restringida por reglas remotas, operando con respaldo del servidor:', err.message);
      }
    );

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      unsubFirestore();
    };
  } catch (err) {
    console.warn('[PrayerService] Fallback a sondeo de servidor:', err);
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }
}
