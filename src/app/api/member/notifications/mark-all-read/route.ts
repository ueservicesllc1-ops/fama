/**
 * FAMA — Endpoint Seguro para Marcar Todas las Notificaciones como Leídas
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

export async function POST(request: NextRequest) {
  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', authCheck.uid)
      .where('read', '==', false)
      .get();

    if (snap.empty) {
      return NextResponse.json({
        success: true,
        message: 'No hay notificaciones pendientes por leer.',
        updatedCount: 0,
      });
    }

    const batch = db.batch();
    const nowIso = new Date().toISOString();

    snap.forEach((doc) => {
      batch.update(doc.ref, {
        read: true,
        readAt: nowIso,
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Se marcaron ${snap.size} notificaciones como leídas.`,
      updatedCount: snap.size,
    });
  } catch (error: unknown) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    return NextResponse.json(
      { error: 'Error al actualizar notificaciones en Firestore.' },
      { status: 500 }
    );
  }
}
