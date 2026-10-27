import webpush from 'web-push';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

let vapidConfigured = false;

function initVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:renacermusic.ec@gmail.com';

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] VAPID keys no configuradas en el entorno.');
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error('[WebPush] Error al configurar VAPID:', err);
    return false;
  }
}

/**
 * Envía una notificación Web Push a un usuario específico (a todos sus dispositivos suscritos)
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!initVapid()) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  const db = getAdminFirestore();
  if (!db) return { sent: 0, failed: 0, cleaned: 0 };

  const subsSnap = await db
    .collection(FIRESTORE_COLLECTIONS.USERS)
    .doc(userId)
    .collection('push_subscriptions')
    .get();

  if (subsSnap.empty) {
    return { sent: 0, failed: 0, cleaned: 0 };
  }

  let sent = 0;
  let failed = 0;
  let cleaned = 0;

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/perfil?tab=notificaciones',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag || 'fama-notification',
  });

  const promises = subsSnap.docs.map(async (doc) => {
    const data = doc.data();
    if (!data.endpoint || !data.keys?.p256dh || !data.keys?.auth) {
      return;
    }

    const pushSubscription: webpush.PushSubscription = {
      endpoint: data.endpoint,
      keys: {
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payloadString);
      sent++;
    } catch (err: unknown) {
      failed++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // Si el endpoint expiró o fue revocado (404 o 410), limpiar la suscripción
      if (statusCode === 404 || statusCode === 410) {
        try {
          await doc.ref.delete();
          cleaned++;
          console.log(`[WebPush] Suscripción expirada eliminada: ${doc.id}`);
        } catch (cleanupErr) {
          console.warn('[WebPush] Error al limpiar suscripción:', cleanupErr);
        }
      } else {
        console.warn(`[WebPush] Error enviando a suscripción ${doc.id}:`, err);
      }
    }
  });

  await Promise.allSettled(promises);
  return { sent, failed, cleaned };
}

/**
 * Envía una notificación Web Push a múltiples usuarios por lotes controlados
 */
export async function sendPushBroadcast(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<{ totalSent: number; totalFailed: number; totalCleaned: number }> {
  if (!initVapid() || userIds.length === 0) {
    return { totalSent: 0, totalFailed: 0, totalCleaned: 0 };
  }

  let totalSent = 0;
  let totalFailed = 0;
  let totalCleaned = 0;

  // Lotes de 10 usuarios para control de concurrencia
  const BATCH_SIZE = 10;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const chunk = userIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      chunk.map((uid) => sendPushToUser(uid, payload))
    );

    for (const res of results) {
      totalSent += res.sent;
      totalFailed += res.failed;
      totalCleaned += res.cleaned;
    }
  }

  return { totalSent, totalFailed, totalCleaned };
}
