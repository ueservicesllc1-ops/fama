import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { getStreamingAdapter } from '@/lib/streaming';
import { isB2Configured, transferStreamToB2 } from '@/lib/storage/b2Client';
import { Recording } from '@/types/models';
import { verifyStreamingWebhookSignature, isSafeDownloadUrl } from '@/lib/streaming/webhookSignature';

export async function POST(request: NextRequest) {
  // 1. Validar autenticidad del webhook mediante firma HMAC sobre el cuerpo crudo
  const webhookSecret = process.env.STREAMING_WEBHOOK_SECRET;
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (webhookSecret && !verifyStreamingWebhookSignature(webhookSecret, rawBody, request.headers)) {
    return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const adapter = getStreamingAdapter();

    // 2. Extraer evento mediante el adaptador configurado
    const event = adapter.handleWebhookEvent
      ? await adapter.handleWebhookEvent(payload, Object.fromEntries(request.headers))
      : {
          eventType: payload.type || payload.event || 'unknown',
          cultoId: payload.data?.passthrough || payload.data?.meta?.cultoId,
          statusUpdate: undefined,
          recordingUpdate: undefined,
        };

    if (!payload.id) {
      return NextResponse.json({ error: 'Evento sin identificador' }, { status: 400 });
    }
    const eventId = payload.id;

    // 3. Evitar procesar dos veces el mismo evento (Idempotencia en Firestore)
    const processedRef = db.collection('processed_webhooks').doc(String(eventId));
    const processedSnap = await processedRef.get();
    if (processedSnap.exists) {
      return NextResponse.json({ message: 'Evento ya procesado previamente.' }, { status: 200 });
    }

    await processedRef.set({
      receivedAt: new Date().toISOString(),
      eventType: event.eventType,
      payload,
    });

    // 4. Procesar actualización de grabación si está disponible
    if (event.recordingUpdate && event.recordingUpdate.downloadUrl) {
      const rec = event.recordingUpdate;
      const downloadUrl = rec.downloadUrl;
      const cultoId = event.cultoId || rec.providerStreamId;

      // Comprobar si Backblaze B2 está configurado para la transferencia
      if (isB2Configured() && downloadUrl && isSafeDownloadUrl(downloadUrl)) {
        const fileKey = `grabaciones/${new Date().getFullYear()}/culto-${cultoId}.mp4`;

        // Descargar flujo de video mediante streaming (sin volcar en memoria RAM)
        const downloadRes = await fetch(downloadUrl);
        if (downloadRes.ok && downloadRes.body) {
          const contentType = downloadRes.headers.get('content-type') || 'video/mp4';
          const contentLengthStr = downloadRes.headers.get('content-length');
          const contentLength = contentLengthStr ? parseInt(contentLengthStr, 10) : undefined;

          // Transferir directamente a Backblaze B2 bucket famaweb
          const transferResult = await transferStreamToB2(
            downloadRes.body,
            fileKey,
            contentType,
            contentLength
          );

          if (transferResult.success) {
            // 5. Registrar metadatos en Firestore collection 'recordings'
            const recDocRef = db.collection(FIRESTORE_COLLECTIONS.RECORDINGS).doc();
            const newRecording: Partial<Recording> = {
              id: recDocRef.id,
              cultoId,
              title: `Grabación de Culto - ${new Date().toLocaleDateString('es-ES')}`,
              preacher: 'Pastor Luis Uchubanda',
              date: new Date().toISOString().split('T')[0],
              durationMinutes: rec.durationSeconds ? Math.round(rec.durationSeconds / 60) : 60,
              durationFormatted: rec.durationSeconds
                ? `${Math.floor(rec.durationSeconds / 60)} min`
                : '1h',
              category: 'Domingos',
              description: 'Culto congregacional grabado automáticamente.',
              thumbnailUrl: '/images/auditorium_stage_clean.jpg',
              b2FileKey: fileKey,
              fileType: contentType,
              fileSize: contentLength,
              status: 'disponible',
              visibility: 'publica',
              publishedAt: new Date().toISOString(),
              providerId: rec.recordingId,
              viewsCount: 0,
            };

            await recDocRef.set(newRecording);

            // Actualizar referencia en el culto correspondiente
            if (cultoId) {
              const cultoRef = db.collection(FIRESTORE_COLLECTIONS.CULTOS).doc(cultoId);
              await cultoRef.update({
                recordingId: recDocRef.id,
                recordingStatus: 'disponible',
              }).catch(() => {});
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedEvent: event.eventType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error procesando webhook';
    console.error('[StreamingWebhook] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
