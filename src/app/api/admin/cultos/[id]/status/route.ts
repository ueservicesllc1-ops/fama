import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { getStreamingAdapter } from '@/lib/streaming';
import { Culto, TransmissionState } from '@/types/models';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { id } = await context.params;
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, youtubeVideoId, youtubeUrl } = body as {
      action: 'preparar' | 'consultar_senial' | 'iniciar' | 'finalizar' | 'cancelar' | 'actualizar_youtube';
      youtubeVideoId?: string;
      youtubeUrl?: string;
    };

    const docRef = db.collection(FIRESTORE_COLLECTIONS.CULTOS).doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Culto no encontrado' }, { status: 404 });
    }

    const currentCulto = snap.data() as Culto;
    const adapter = getStreamingAdapter();
    const nowIso = new Date().toISOString();

    const updates: Partial<Culto> = {};

    switch (action) {
      case 'actualizar_youtube': {
        const cleanId = youtubeVideoId ? String(youtubeVideoId).trim() : null;
        updates.youtubeVideoId = cleanId || undefined;
        updates.youtubeUrl = youtubeUrl ? String(youtubeUrl).trim() : undefined;
        if (cleanId) {
          updates.streamingProvider = 'youtube';
          updates.transmissionStatus = 'conectando';
          updates.isStatusVerified = true;
          updates.thumbnailUrl = `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`;
        }
        break;
      }

      case 'preparar': {
        updates.status = 'preparando_transmision';

        // Si ya cuenta con ID de YouTube
        if (currentCulto.youtubeVideoId || youtubeVideoId) {
          const ytId = currentCulto.youtubeVideoId || youtubeVideoId;
          updates.streamingProvider = 'youtube';
          updates.transmissionStatus = 'conectando';
          updates.isStatusVerified = true;
          if (ytId) {
            updates.thumbnailUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
          }
        } else {
          updates.streamingProvider = adapter.providerId;

          if (adapter.isConfigured() && adapter.createLiveStream) {
            try {
              const streamInfo = await adapter.createLiveStream(id, currentCulto.title);
              updates.streamingReferenceId = streamInfo.providerStreamId;
              updates.streamPlaybackUrl = streamInfo.playback.playbackUrl;
              updates.transmissionStatus = 'conectando';
              updates.isStatusVerified = true;
            } catch (streamErr: unknown) {
              const msg = streamErr instanceof Error ? streamErr.message : 'Error creando stream';
              updates.transmissionStatus = 'error';
              updates.isStatusVerified = false;
              return NextResponse.json(
                { error: `Fallo al configurar stream con el proveedor: ${msg}` },
                { status: 500 }
              );
            }
          } else {
            // Proveedor no configurado
            updates.transmissionStatus = 'no_configurado';
            updates.isStatusVerified = false;
          }
        }
        break;
      }

      case 'consultar_senial': {
        if (currentCulto.youtubeVideoId) {
          return NextResponse.json({
            isConfigured: true,
            provider: 'youtube',
            status: 'conectando',
            isStatusVerified: true,
            message: `Transmisión vinculada a YouTube Live (ID: ${currentCulto.youtubeVideoId}). La señal se emite desde OBS Studio a YouTube.`,
          });
        }

        if (!currentCulto.streamingReferenceId || !adapter.isConfigured()) {
          return NextResponse.json({
            isConfigured: adapter.isConfigured(),
            status: currentCulto.transmissionStatus || 'no_configurado',
            isStatusVerified: false,
            message: adapter.isConfigured()
              ? 'El culto aún no cuenta con ID de transmisión asignado.'
              : 'Proveedor de streaming no configurado.',
          });
        }

        const realStatus = await adapter.queryLiveStatus(currentCulto.streamingReferenceId);
        updates.transmissionStatus = realStatus.status as TransmissionState;
        updates.isStatusVerified = true;

        if (realStatus.isLive) {
          updates.status = 'en_vivo';
        }
        break;
      }

      case 'iniciar': {
        updates.status = 'en_vivo';
        updates.actualStartTime = nowIso;

        if (currentCulto.youtubeVideoId) {
          updates.streamingProvider = 'youtube';
          updates.transmissionStatus = 'transmitiendo';
          updates.isStatusVerified = true;
        } else if (currentCulto.streamingReferenceId && adapter.isConfigured()) {
          const liveCheck = await adapter.queryLiveStatus(currentCulto.streamingReferenceId);
          updates.isStatusVerified = liveCheck.isLive;
          updates.transmissionStatus = liveCheck.status as TransmissionState;
        } else {
          updates.isStatusVerified = false;
          updates.transmissionStatus = 'conectando';
        }
        break;
      }

      case 'finalizar': {
        updates.status = 'finalizado';
        updates.actualEndTime = nowIso;
        updates.transmissionStatus = 'desconectado';

        // Si es de YouTube, la grabación queda disponible en YouTube bajo el mismo video ID
        if (currentCulto.youtubeVideoId) {
          updates.recordingStatus = 'disponible';
        } else if (currentCulto.streamingReferenceId && adapter.isConfigured() && adapter.getRecordingInfo) {
          const recInfo = await adapter.getRecordingInfo(currentCulto.streamingReferenceId);
          if (recInfo) {
            updates.recordingId = recInfo.recordingId;
            updates.recordingStatus = recInfo.status;
          } else {
            updates.recordingStatus = 'pendiente';
          }
        }
        break;
      }

      case 'cancelar': {
        updates.status = 'cancelado';
        updates.transmissionStatus = 'inactivo';
        break;
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      action,
      updates,
      message: `Culto actualizado con la acción '${action}'.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar estado del culto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
