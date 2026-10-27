import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { Recording, RecordingVisibility } from '@/types/models';

export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      title,
      preacher,
      category,
      date,
      durationMinutes,
      durationFormatted,
      description,
      b2FileKey,
      youtubeVideoId,
      youtubeUrl,
      status,
      visibility,
    } = body;

    if (!title || !preacher || !date) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: título, predicador o fecha.' },
        { status: 400 }
      );
    }

    const { extractYouTubeVideoId } = await import('@/lib/streaming/youtubeUtils');
    const cleanYtId = extractYouTubeVideoId(youtubeVideoId || youtubeUrl || '') || undefined;

    const docRef = db.collection(FIRESTORE_COLLECTIONS.RECORDINGS).doc();

    const newRecording: Partial<Recording> = {
      id: docRef.id,
      title: String(title).trim(),
      preacher: String(preacher).trim(),
      category: category || 'Domingos',
      date: String(date),
      durationMinutes: Number(durationMinutes) || 60,
      durationFormatted: String(durationFormatted || '1h'),
      description: String(description || '').trim(),
      thumbnailUrl: cleanYtId
        ? `https://img.youtube.com/vi/${cleanYtId}/hqdefault.jpg`
        : '/images/auditorium_stage_clean.jpg',
      youtubeVideoId: cleanYtId,
      youtubeUrl: youtubeUrl ? String(youtubeUrl).trim() : cleanYtId ? `https://www.youtube.com/watch?v=${cleanYtId}` : undefined,
      b2FileKey: b2FileKey ? String(b2FileKey).trim() : undefined,
      status: status || (cleanYtId || b2FileKey ? 'disponible' : 'pendiente'),
      visibility: (visibility as RecordingVisibility) || 'publica',
      publishedAt: new Date().toISOString(),
      viewsCount: 0,
    };

    await docRef.set(newRecording);

    return NextResponse.json({
      success: true,
      recording: newRecording,
      message: 'Grabación registrada exitosamente.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
