/**
 * FAMA - Servicio de Reacciones en Tiempo Real
 * Proyecto: fama-db35d
 *
 * Registra y sincroniza reacciones reales emitidas por usuarios conectados.
 * NO GENERA REACCIONES FICTICIAS O ARTIFICIALES.
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

export interface RealReaction {
  id: string;
  cultoId: string;
  userId: string;
  emoji: string;
  createdAt: Timestamp | string | null;
  leftPercent: number; // Posición horizontal en pantalla
}

const userLastReactionTime = new Map<string, number>();

export async function sendRealReaction(
  cultoId: string,
  user: { uid: string },
  emoji: string
): Promise<void> {
  if (!db) return;

  // Límite de frecuencia: máximo 1 reacción cada 800ms por usuario
  const now = Date.now();
  const lastTime = userLastReactionTime.get(user.uid) || 0;
  if (now - lastTime < 800) return;
  userLastReactionTime.set(user.uid, now);

  const leftPercent = 25 + Math.random() * 50;

  try {
    await addDoc(collection(db, FIRESTORE_COLLECTIONS.REACTIONS), {
      cultoId,
      userId: user.uid,
      emoji,
      leftPercent,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('[ReactionsService] Error al emitir reacción:', err);
  }
}

export function subscribeToRealReactions(
  cultoId: string,
  onNewReaction: (reaction: RealReaction) => void
): () => void {
  if (!db) return () => {};

  // Solo escuchar reacciones emitidas en los últimos segundos
  const q = query(
    collection(db, FIRESTORE_COLLECTIONS.REACTIONS),
    where('cultoId', '==', cultoId),
    orderBy('createdAt', 'desc'),
    limit(15)
  );

  let initialLoad = true;

  return onSnapshot(
    q,
    (snapshot) => {
      // Ignorar el snapshot inicial para no disparar reacciones viejas acumuladas
      if (initialLoad) {
        initialLoad = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const d = change.doc.data();
          onNewReaction({
            id: change.doc.id,
            cultoId: d.cultoId,
            userId: d.userId,
            emoji: d.emoji,
            createdAt: d.createdAt,
            leftPercent: d.leftPercent || 50,
          });
        }
      });
    },
    (err) => {
      console.error('[ReactionsService] Error en suscripción a reacciones:', err);
    }
  );
}
