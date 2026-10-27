/**
 * FAMA — Endpoint Seguro para Marcar Notificación como Leída
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere que el usuario sea el propietario exclusivo de la notificación.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { AppNotification } from '@/types/models';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { id } = await context.params;

  try {
    const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc(id);
    const snap = await notifRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Notificación no encontrada.' }, { status: 404 });
    }

    const data = snap.data() as AppNotification;

    // Validación de propiedad estricta
    if (data.userId !== authCheck.uid) {
      return NextResponse.json(
        { error: 'No tienes autorización para modificar esta notificación.' },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    await notifRef.update({
      read: true,
      readAt: nowIso,
    });

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída.',
      notification: { ...data, id, read: true, readAt: nowIso },
    });
  } catch (error: unknown) {
    console.error('Error al actualizar notificación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado de lectura en Firestore.' },
      { status: 500 }
    );
  }
}
