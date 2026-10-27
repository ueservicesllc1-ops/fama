import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { getStreamingAdapter } from '@/lib/streaming';
import { Culto } from '@/types/models';

export async function GET(
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
    const docSnap = await db.collection(FIRESTORE_COLLECTIONS.CULTOS).doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Culto no encontrado' }, { status: 404 });
    }

    const culto = docSnap.data() as Culto;
    const adapter = getStreamingAdapter();

    if (!adapter.isConfigured()) {
      return NextResponse.json({
        isConfigured: false,
        error: 'El proveedor de streaming no está configurado en el servidor.',
        help: adapter.getConfigurationHelp(),
      });
    }

    return NextResponse.json({
      isConfigured: true,
      provider: adapter.providerId,
      providerName: adapter.name,
      streamingReferenceId: culto.streamingReferenceId,
      playbackUrl: culto.streamPlaybackUrl,
      transmissionStatus: culto.transmissionStatus,
      isStatusVerified: culto.isStatusVerified,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
