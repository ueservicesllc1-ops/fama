import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

/**
 * POST /api/member/push-subscription
 * Registra o actualiza la suscripción Web Push del dispositivo del miembro autenticado.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyMemberRequest(request);
    if (!authResult.authorized || !authResult.uid) {
      return NextResponse.json({ error: authResult.error || 'No autorizado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.subscription || !body.subscription.endpoint) {
      return NextResponse.json(
        { error: 'Formato de suscripción inválido. Se requiere endpoint.' },
        { status: 400 }
      );
    }

    const { endpoint, keys } = body.subscription;
    // Generar un id hash o usar el hash del endpoint
    const subId = Buffer.from(endpoint).toString('base64url').slice(-40);

    const subscriptionDoc = {
      userId: authResult.uid,
      endpoint,
      keys: {
        p256dh: keys?.p256dh || '',
        auth: keys?.auth || '',
      },
      userAgent: request.headers.get('user-agent') || 'Desconocido',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Guardar en subcolección users/{uid}/push_subscriptions/{subId}
    await db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .doc(authResult.uid)
      .collection('push_subscriptions')
      .doc(subId)
      .set(subscriptionDoc, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Suscripción Web Push registrada con éxito para este dispositivo.',
      subscriptionId: subId,
    });
  } catch (error) {
    console.error('[API push-subscription POST] Error:', error);
    return NextResponse.json({ error: 'Error interno al registrar suscripción push.' }, { status: 500 });
  }
}

/**
 * DELETE /api/member/push-subscription
 * Elimina la suscripción del dispositivo para el miembro autenticado.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyMemberRequest(request);
    if (!authResult.authorized || !authResult.uid) {
      return NextResponse.json({ error: authResult.error || 'No autorizado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 503 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.endpoint) {
      return NextResponse.json({ error: 'Se requiere endpoint para cancelar suscripción.' }, { status: 400 });
    }

    const subId = Buffer.from(body.endpoint).toString('base64url').slice(-40);

    await db
      .collection(FIRESTORE_COLLECTIONS.USERS)
      .doc(authResult.uid)
      .collection('push_subscriptions')
      .doc(subId)
      .delete();

    return NextResponse.json({
      success: true,
      message: 'Suscripción Web Push desactivada para este dispositivo.',
    });
  } catch (error) {
    console.error('[API push-subscription DELETE] Error:', error);
    return NextResponse.json({ error: 'Error interno al cancelar suscripción push.' }, { status: 500 });
  }
}
