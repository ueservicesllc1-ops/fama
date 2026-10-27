/**
 * FAMA - Servicio de Solicitudes de Palabra (Levantar la Mano)
 * Proyecto: fama-db35d
 *
 * Registra solicitudes reales para hablar durante el culto en Cloud Firestore.
 * NOTA: El audio bidireccional WebRTC está pendiente de proveedor externo.
 * No se finge transmisión de audio.
 */

import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';
import { toggleHand } from './attendeesService';

export type HandRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface HandRequest {
  id: string;
  cultoId: string;
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  status: HandRequestStatus;
  requestedAt: Timestamp | string | null;
  reviewedAt?: Timestamp | string | null;
  reviewedBy?: string;
  audioBridgeAvailable: boolean; // Indica con honestidad técnica si WebRTC está activo
}

export async function submitHandRequest(
  cultoId: string,
  user: { uid: string; displayName: string; photoURL?: string }
): Promise<void> {
  if (!db) throw new Error('Base de datos no inicializada.');

  const docId = `${cultoId}_${user.uid}`;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.HAND_REQUESTS, docId);

  await setDoc(docRef, {
    cultoId,
    userId: user.uid,
    userName: user.displayName || 'Miembro FAMA',
    userPhotoUrl: user.photoURL || null,
    status: 'pending',
    requestedAt: serverTimestamp(),
    audioBridgeAvailable: false, // Honestidad: WebRTC no conectado aún
  });

  // Reflejar la mano levantada sobre su butaca en el auditorio
  await toggleHand(cultoId, user.uid, true);
}

export async function cancelHandRequest(cultoId: string, uid: string): Promise<void> {
  if (!db) return;

  const docId = `${cultoId}_${uid}`;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.HAND_REQUESTS, docId);

  await updateDoc(docRef, {
    status: 'cancelled',
  });

  // Bajar la mano en su butaca
  await toggleHand(cultoId, uid, false);
}

export function subscribeToUserHandStatus(
  cultoId: string,
  uid: string,
  onUpdate: (status: HandRequest | null) => void
): () => void {
  if (!db) {
    onUpdate(null);
    return () => {};
  }

  const docId = `${cultoId}_${uid}`;
  const docRef = doc(db, FIRESTORE_COLLECTIONS.HAND_REQUESTS, docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const d = snapshot.data();
        onUpdate({
          id: snapshot.id,
          cultoId: d.cultoId,
          userId: d.userId,
          userName: d.userName,
          userPhotoUrl: d.userPhotoUrl || undefined,
          status: d.status,
          requestedAt: d.requestedAt,
          reviewedAt: d.reviewedAt,
          reviewedBy: d.reviewedBy,
          audioBridgeAvailable: d.audioBridgeAvailable,
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('[HandsService] Error en suscripción:', err);
      onUpdate(null);
    }
  );
}
