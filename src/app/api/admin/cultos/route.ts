import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { Culto, CultoType } from '@/types/models';

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.CULTOS)
      .orderBy('scheduledStartTime', 'desc')
      .limit(50)
      .get();

    const cultos: Culto[] = [];
    snap.forEach((d) => {
      cultos.push({ id: d.id, ...d.data() } as Culto);
    });

    return NextResponse.json({ cultos });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar cultos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
      type,
      scheduledStartTime,
      scheduledEndTime,
      description,
      scriptureReference,
      seriesTitle,
      youtubeVideoId,
      youtubeUrl,
    } = body;

    if (!title || !preacher || !scheduledStartTime) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: título, predicador o fecha programada.' },
        { status: 400 }
      );
    }

    const newCultoRef = db.collection(FIRESTORE_COLLECTIONS.CULTOS).doc();

    const cleanYoutubeId = youtubeVideoId ? String(youtubeVideoId).trim() : undefined;
    const cleanYoutubeUrl = youtubeUrl ? String(youtubeUrl).trim() : undefined;

    const newCultoData: Partial<Culto> = {
      id: newCultoRef.id,
      title: String(title).trim(),
      preacher: String(preacher).trim(),
      type: (type as CultoType) || 'domingo_general',
      description: String(description || '').trim(),
      scriptureReference: String(scriptureReference || '').trim(),
      seriesTitle: String(seriesTitle || '').trim(),
      status: 'programado',
      transmissionStatus: cleanYoutubeId ? 'conectando' : 'no_configurado',
      streamingProvider: cleanYoutubeId ? 'youtube' : undefined,
      youtubeVideoId: cleanYoutubeId,
      youtubeUrl: cleanYoutubeUrl,
      scheduledStartTime: new Date(scheduledStartTime).toISOString(),
      scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime).toISOString() : undefined,
      thumbnailUrl: cleanYoutubeId
        ? `https://img.youtube.com/vi/${cleanYoutubeId}/hqdefault.jpg`
        : '/images/auditorium_stage_clean.jpg',
      viewerCount: 0,
      isStatusVerified: Boolean(cleanYoutubeId),
    };

    await newCultoRef.set(newCultoData);

    return NextResponse.json({
      success: true,
      culto: newCultoData,
      message: 'Culto programado exitosamente en Cloud Firestore.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al crear culto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
