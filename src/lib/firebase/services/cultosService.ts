/**
 * FAMA - Servicio de Cultos y Transmisiones
 * Proyecto: fama-db35d
 *
 * Administra el estado real de los cultos en Cloud Firestore.
 * No declara transmisiones "EN VIVO" si no existe una sesión activa real en la base de datos.
 */

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';
import { Culto } from '@/types/models';

export async function getLiveOrUpcomingCulto(): Promise<Culto | null> {
  // En el cliente, priorizar la consulta al servidor respaldada por Admin SDK
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/public/content?type=culto');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.culto) {
          return data.culto as Culto;
        }
        if (data.success && data.culto === null) {
          return null;
        }
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return null;

  try {
    // 1. Buscar si hay un culto EN VIVO
    const qLive = query(
      collection(db, FIRESTORE_COLLECTIONS.CULTOS),
      where('status', '==', 'en_vivo'),
      limit(1)
    );
    const liveSnap = await getDocs(qLive);
    if (!liveSnap.empty) {
      const d = liveSnap.docs[0];
      return { id: d.id, ...d.data() } as Culto;
    }

    // 2. Si no hay en vivo, buscar el próximo culto programado
    const qUpcoming = query(
      collection(db, FIRESTORE_COLLECTIONS.CULTOS),
      where('status', '==', 'programado'),
      orderBy('scheduledStartTime', 'asc'),
      limit(1)
    );
    const upSnap = await getDocs(qUpcoming);
    if (!upSnap.empty) {
      const d = upSnap.docs[0];
      return { id: d.id, ...d.data() } as Culto;
    }

    return null;
  } catch (err) {
    console.warn('[CultosService] No se pudo consultar culto desde Firestore cliente:', err);
    return null;
  }
}

export function subscribeToActiveCulto(
  onUpdate: (culto: Culto | null) => void
): () => void {
  if (!db) {
    onUpdate(null);
    return () => {};
  }

  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.CULTOS),
      where('status', '==', 'en_vivo'),
      limit(1)
    );

    return onSnapshot(
      q,
      async (snapshot) => {
        if (!snapshot.empty) {
          const d = snapshot.docs[0];
          onUpdate({ id: d.id, ...d.data() } as Culto);
        } else {
          // Si no hay en vivo, consultar el próximo programado
          const upcoming = await getLiveOrUpcomingCulto();
          onUpdate(upcoming);
        }
      },
      (err) => {
        console.warn('[CultosService] Suscripción en vivo no disponible (permisos):', err?.message);
        // Fallback mediante consulta al servidor
        getLiveOrUpcomingCulto().then((c) => onUpdate(c));
      }
    );
  } catch (err) {
    console.warn('[CultosService] Error iniciando listener de cultos:', err);
    getLiveOrUpcomingCulto().then((c) => onUpdate(c));
    return () => {};
  }
}
