/**
 * FAMA - Servicio de Chat Real del Culto
 * Proyecto: fama-db35d
 *
 * Persistencia en Cloud Firestore para mensajes en tiempo real.
 * Incluye validación de longitud, filtro de mensajes vacíos y protección anti-spam.
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config';
import { FIRESTORE_COLLECTIONS } from '../firestore';

export interface RealChatMessage {
  id: string;
  cultoId: string;
  userId: string;
  senderName: string;
  senderPhotoUrl?: string;
  content: string;
  createdAt: Timestamp | string | null;
  status: 'active' | 'moderated' | 'flagged';
}

/** Cooldown mínimo de 1.5 segundos entre mensajes por usuario */
const userLastSentMap = new Map<string, number>();

export async function sendChatMessage(
  cultoId: string,
  user: { uid: string; displayName: string; photoURL?: string },
  content: string
): Promise<void> {
  if (!db) throw new Error('Base de datos no inicializada.');

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  if (trimmed.length > 400) {
    throw new Error('El mensaje excede el límite máximo de 400 caracteres.');
  }

  // Protección anti-spam
  const now = Date.now();
  const lastSent = userLastSentMap.get(user.uid) || 0;
  if (now - lastSent < 1500) {
    throw new Error('Por favor espera un momento antes de enviar otro mensaje.');
  }
  userLastSentMap.set(user.uid, now);

  const messagesRef = collection(db, FIRESTORE_COLLECTIONS.MESSAGES);
  await addDoc(messagesRef, {
    cultoId,
    userId: user.uid,
    senderName: user.displayName || 'Miembro FAMA',
    senderPhotoUrl: user.photoURL || null,
    content: trimmed,
    createdAt: serverTimestamp(),
    status: 'active',
  });
}

export function subscribeToChatMessages(
  cultoId: string,
  onMessages: (messages: RealChatMessage[]) => void
): () => void {
  if (!db) {
    onMessages([]);
    return () => {};
  }

  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.MESSAGES),
    where('cultoId', '==', cultoId),
    where('status', '==', 'active'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: RealChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        messages.push({
          id: docSnap.id,
          cultoId: d.cultoId,
          userId: d.userId,
          senderName: d.senderName,
          senderPhotoUrl: d.senderPhotoUrl || undefined,
          content: d.content,
          createdAt: d.createdAt,
          status: d.status,
        });
      });
      onMessages(messages);
    },
    (err) => {
      console.error('[ChatService] Error al recibir mensajes:', err);
      onMessages([]);
    }
  );
}
