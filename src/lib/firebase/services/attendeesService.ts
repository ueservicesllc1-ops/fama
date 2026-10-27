/**
 * FAMA - Servicio de Asistentes y Presencia Real en el Auditorio (275 Butacas)
 * Proyecto: fama-db35d
 *
 * Gestiona la asignación atómica de butacas en las 3 naves para usuarios reales autenticados,
 * el latido de presencia (heartbeat) y la liberación de butacas al desconectarse.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';
import { ALL_DIGITAL_SEATS, NaveId } from '@/data/auditorium275';

export interface RealAttendee {
  uid: string;
  displayName: string;
  photoURL?: string;
  seatId: string;
  seatRow: number;
  seatNumber: number;
  nave?: NaveId;
  seatCode?: string;
  cultoId: string;
  isOnline: boolean;
  isHandRaised: boolean;
  handRaisedAt?: string | null;
  lastHeartbeat: Timestamp | string | null;
  joinedAt: string;
}

/** Tiempo máximo de inactividad antes de considerar la butaca libre (2 minutos) */
const HEARTBEAT_TIMEOUT_MS = 2 * 60 * 1000;

export function isAttendeeActive(att: RealAttendee): boolean {
  if (!att.isOnline) return false;
  if (!att.lastHeartbeat) return false;
  let hbMillis: number;
  if (att.lastHeartbeat instanceof Timestamp) {
    hbMillis = att.lastHeartbeat.toMillis();
  } else if (typeof att.lastHeartbeat === 'string') {
    hbMillis = new Date(att.lastHeartbeat).getTime();
  } else {
    return false;
  }
  return Date.now() - hbMillis < HEARTBEAT_TIMEOUT_MS;
}

/**
 * Asigna una butaca disponible de manera atómica a un usuario autenticado
 * dentro del aforo de 275 plazas distribuidas en las tres naves.
 */
export async function assignSeatToUser(
  cultoId: string,
  user: { uid: string; displayName: string; photoURL?: string }
): Promise<RealAttendee | null> {
  if (!db) return null;

  const attendeeDocRef = doc(db, FIRESTORE_COLLECTIONS.ATTENDEES, `${cultoId}_${user.uid}`);

  try {
    const assigned = await runTransaction(db, async (transaction) => {
      // 1. Verificar si el usuario ya tiene un asiento asignado
      const existingSnap = await transaction.get(attendeeDocRef);
      if (existingSnap.exists()) {
        const data = existingSnap.data() as RealAttendee;
        transaction.update(attendeeDocRef, {
          isOnline: true,
          lastHeartbeat: serverTimestamp(),
          displayName: user.displayName || data.displayName,
          photoURL: user.photoURL || data.photoURL || null,
        });
        return { ...data, isOnline: true };
      }

      // 2. Obtener los asientos ocupados actualmente
      const q = query(
        collection(db!, FIRESTORE_COLLECTIONS.ATTENDEES),
        where('cultoId', '==', cultoId),
        where('isOnline', '==', true)
      );
      const activeSnaps = await getDocs(q);
      const occupiedSeatIds = new Set<string>();

      activeSnaps.forEach((docSnap) => {
        const att = docSnap.data() as RealAttendee;
        if (isAttendeeActive(att)) {
          occupiedSeatIds.add(att.seatId);
        }
      });

      // 3. Buscar la primera butaca libre disponible entre las 275 plazas
      const freeSlot = ALL_DIGITAL_SEATS.find((slot) => !occupiedSeatIds.has(slot.id));
      if (!freeSlot) {
        throw new Error(
          'El auditorio virtual ha alcanzado su capacidad máxima (275 participantes conectados).'
        );
      }

      const newAttendee: RealAttendee = {
        uid: user.uid,
        displayName: user.displayName || 'Miembro FAMA',
        photoURL: user.photoURL || undefined,
        seatId: freeSlot.id,
        seatRow: freeSlot.row,
        seatNumber: freeSlot.col,
        nave: freeSlot.nave,
        seatCode: freeSlot.seatCode,
        cultoId,
        isOnline: true,
        isHandRaised: false,
        handRaisedAt: null,
        lastHeartbeat: null,
        joinedAt: new Date().toISOString(),
      };

      transaction.set(attendeeDocRef, {
        ...newAttendee,
        lastHeartbeat: serverTimestamp(),
      });

      return newAttendee;
    });

    return assigned;
  } catch (err) {
    console.error('[AttendeesService] Error al asignar butaca:', err);
    throw err;
  }
}

/**
 * Envía el pulso de presencia (heartbeat) periódico para mantener la butaca ocupada.
 */
export async function sendHeartbeat(cultoId: string, uid: string): Promise<void> {
  if (!db) return;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.ATTENDEES, `${cultoId}_${uid}`);
  try {
    await setDoc(docRef, { lastHeartbeat: serverTimestamp(), isOnline: true }, { merge: true });
  } catch (err) {
    console.error('[AttendeesService] Error enviando heartbeat:', err);
  }
}

/**
 * Libera la butaca cuando el usuario abandona el culto o cierra la ventana.
 */
export async function releaseSeat(cultoId: string, uid: string): Promise<void> {
  if (!db) return;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.ATTENDEES, `${cultoId}_${uid}`);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[AttendeesService] Error al liberar butaca:', err);
  }
}

/**
 * Cambia el estado de mano levantada del participante en su butaca.
 */
export async function toggleHand(cultoId: string, uid: string, isRaised: boolean): Promise<void> {
  if (!db) return;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.ATTENDEES, `${cultoId}_${uid}`);
  try {
    await setDoc(
      docRef,
      {
        isHandRaised: isRaised,
        handRaisedAt: isRaised ? new Date().toISOString() : null,
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[AttendeesService] Error al cambiar estado de mano:', err);
  }
}

/**
 * Suscripción en tiempo real a los asistentes del culto activo.
 */
export function subscribeToCultoAttendees(
  cultoId: string,
  onUpdate: (attendees: RealAttendee[]) => void
): () => void {
  if (!db) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.ATTENDEES),
    where('cultoId', '==', cultoId),
    where('isOnline', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list: RealAttendee[] = [];
      snapshot.forEach((d) => {
        const att = d.data() as RealAttendee;
        if (isAttendeeActive(att)) {
          list.push(att);
        }
      });
      onUpdate(list);
    },
    (err) => {
      console.error('[AttendeesService] Error en suscripción a asistentes:', err);
      onUpdate([]);
    }
  );
}
