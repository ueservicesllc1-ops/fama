/**
 * FAMA — Endpoint Seguro del Centro de Notificaciones del Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación de miembro.
 * Estricto aislamiento por usuario (cada miembro solo accede a sus avisos).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { AppNotification } from '@/types/models';

export async function GET(request: NextRequest) {
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
      .get();

    const notifications: AppNotification[] = [];
    let unreadCount = 0;

    snap.forEach((doc) => {
      const data = doc.data() as AppNotification;
      const notif: AppNotification = { ...data, id: doc.id };
      notifications.push(notif);
      if (!notif.read) {
        unreadCount += 1;
      }
    });

    // Ordenar por fecha descendente
    notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    });
  } catch (error: unknown) {
    console.error('Error al consultar notificaciones del usuario:', error);
    return NextResponse.json(
      { error: 'Error al consultar notificaciones en Firestore.' },
      { status: 500 }
    );
  }
}
