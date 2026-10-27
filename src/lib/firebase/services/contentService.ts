/**
 * FAMA - Servicio de Contenidos Congregacionales en Cloud Firestore
 * Proyecto: fama-db35d
 *
 * Consultas seguras y directas para grabaciones, eventos, galerías,
 * grupos y ministerios. En el cliente utiliza la API pública respaldada por
 * Firebase Admin SDK para garantizar acceso continuo sin errores de permisos.
 */

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';
import { Recording, ChurchEvent, Gallery, CommunityGroup, Ministry } from '@/types/models';

export async function fetchRecordingsFromFirestore(): Promise<Recording[]> {
  // En el cliente, consultar mediante el endpoint público respaldado por Admin SDK
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/public/content?type=recordings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.recordings)) {
          return data.recordings as Recording[];
        }
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return [];
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.RECORDINGS),
      orderBy('date', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const list: Recording[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Recording);
    });
    return list;
  } catch (err) {
    console.warn('[ContentService] No se pudieron cargar grabaciones desde Firestore cliente:', err);
    return [];
  }
}

export async function fetchEventsFromFirestore(): Promise<ChurchEvent[]> {
  // En el cliente, consultar mediante el endpoint público respaldado por Admin SDK
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/public/content?type=events');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.events)) {
          return data.events as ChurchEvent[];
        }
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return [];
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.EVENTS),
      orderBy('date', 'asc'),
      limit(30)
    );
    const snap = await getDocs(q);
    const list: ChurchEvent[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as ChurchEvent);
    });
    return list;
  } catch (err) {
    console.warn('[ContentService] No se pudieron cargar eventos desde Firestore cliente:', err);
    return [];
  }
}

export async function fetchGalleriesFromFirestore(): Promise<Gallery[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/public/content?type=galleries');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.galleries)) {
          return data.galleries as Gallery[];
        }
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return [];
  try {
    const q = query(
      collection(db, FIRESTORE_COLLECTIONS.GALLERIES),
      orderBy('date', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    const list: Gallery[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Gallery);
    });
    return list;
  } catch (err) {
    console.warn('[ContentService] No se pudieron cargar galerías desde Firestore cliente:', err);
    return [];
  }
}

export async function fetchGroupsFromFirestore(): Promise<CommunityGroup[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/public/content?type=groups');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.groups)) {
          return data.groups as CommunityGroup[];
        }
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.GROUPS));
    const list: CommunityGroup[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as CommunityGroup);
    });
    return list;
  } catch (err) {
    console.warn('[ContentService] No se pudieron cargar grupos desde Firestore cliente:', err);
    return [];
  }
}

export async function fetchMinistriesFromFirestore(): Promise<Ministry[]> {
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/public/content?type=ministries');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.ministries)) {
          return data.ministries as Ministry[];
        }
      }
    } catch {
      // Continuar con fallback directo
    }
  }

  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTIONS.MINISTRIES));
    const list: Ministry[] = [];
    snap.forEach((d) => {
      list.push({ id: d.id, ...d.data() } as Ministry);
    });
    return list;
  } catch (err) {
    console.warn('[ContentService] No se pudieron cargar ministerios desde Firestore cliente:', err);
    return [];
  }
}
