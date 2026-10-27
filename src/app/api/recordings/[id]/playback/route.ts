import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { generateB2SignedDownloadUrl, checkB2FileExists } from '@/lib/storage/b2Client';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { Recording } from '@/types/models';
import { extractYouTubeVideoId, buildYouTubeEmbedUrl } from '@/lib/streaming/youtubeUtils';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: 'Servicio de base de datos no disponible' },
      { status: 500 }
    );
  }

  try {
    const docRef = db.collection(FIRESTORE_COLLECTIONS.RECORDINGS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'Grabación no encontrada' },
        { status: 404 }
      );
    }

    const recording = docSnap.data() as Recording;

    // 1. Si la grabación está alojada en YouTube (nueva arquitectura sin costo B2)
    const ytId =
      recording.youtubeVideoId ||
      extractYouTubeVideoId(recording.youtubeUrl) ||
      extractYouTubeVideoId(recording.b2VideoUrl);

    if (ytId) {
      const embedUrl = buildYouTubeEmbedUrl(ytId, {
        autoplay: true,
        mute: false,
        controls: true,
      });

      return NextResponse.json({
        playbackType: 'youtube',
        youtubeVideoId: ytId,
        embedUrl,
        isSigned: false,
        status: recording.status || 'disponible',
      });
    }

    // 2. Si ya tiene una URL pública directa MP4/HLS
    if (recording.b2VideoUrl && !recording.b2FileKey) {
      return NextResponse.json({
        playbackType: 'direct',
        playbackUrl: recording.b2VideoUrl,
        isSigned: false,
        status: recording.status,
      });
    }

    // 3. Compatibilidad con grabaciones antiguas almacenadas en Backblaze B2
    if (recording.b2FileKey) {
      const fileInfo = await checkB2FileExists(recording.b2FileKey);
      if (!fileInfo.exists) {
        return NextResponse.json(
          {
            error: 'El archivo de video aún no se encuentra disponible en Backblaze B2',
            status: recording.status || 'procesando',
          },
          { status: 404 }
        );
      }

      // Generar URL prefirmada temporal con validez de 2 horas (7200s)
      const signedUrl = await generateB2SignedDownloadUrl(recording.b2FileKey, 7200);
      if (!signedUrl) {
        return NextResponse.json(
          { error: 'No se pudo generar la URL autorizada de reproducción' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        playbackType: 'b2_presigned',
        playbackUrl: signedUrl,
        isSigned: true,
        expiresInSeconds: 7200,
        status: recording.status,
      });
    }

    return NextResponse.json(
      {
        error: 'Esta grabación no cuenta con archivo multimedia asignado.',
        status: recording.status,
      },
      { status: 404 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
