/**
 * FAMA — Cancelación de Solicitud Pastoral por el Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación de miembro.
 * Solo permite al solicitante cancelar su propia solicitud pendiente, en revisión o reprogramada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { PastoralCareRequest, PastoralAuditEntry, AppNotification } from '@/types/models';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const docRef = db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'La solicitud no existe.' }, { status: 404 });
    }

    const data = docSnap.data() as PastoralCareRequest;

    // 1. Estricto control de propiedad: solo el miembro dueño puede cancelar
    if (data.userId !== authCheck.uid) {
      return NextResponse.json(
        { error: 'No tienes autorización para cancelar esta solicitud ajena.' },
        { status: 403 }
      );
    }

    // 2. Comprobar estado: solo cancelable si no está completada o ya cancelada
    const cancellableStatuses = ['pending', 'in_review', 'reschedule_proposed'];
    if (!cancellableStatuses.includes(data.status)) {
      return NextResponse.json(
        { error: `No se puede cancelar una solicitud con estado actual: ${data.status}.` },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason =
      typeof body.cancelReason === 'string' && body.cancelReason.trim().length > 0
        ? body.cancelReason.trim().slice(0, 300)
        : 'Cancelada por el solicitante';

    const now = new Date().toISOString();

    const auditEntry: PastoralAuditEntry = {
      action: 'cancelada',
      performedByUid: authCheck.uid,
      performedByName: authCheck.name || 'Miembro',
      performedByRole: 'member',
      timestamp: now,
      noteSummary: 'Solicitud cancelada por el solicitante.',
    };

    const currentAudit = Array.isArray(data.auditLog) ? data.auditLog : [];

    await docRef.update({
      status: 'cancelled',
      cancelledAt: now,
      cancelReason: reason,
      updatedAt: now,
      auditLog: [...currentAudit, auditEntry],
    });

    // Notificación discreta de confirmación al miembro
    if (data.memberNotificationOptIn !== false) {
      const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
      const notif: AppNotification = {
        id: notifRef.id,
        userId: authCheck.uid,
        title: 'Solicitud Pastoral Cancelada',
        message: `Tu solicitud pastoral (#${id.slice(-5).toUpperCase()}) ha sido cancelada conforme a tu solicitud.`,
        category: 'pastoral',
        relatedUrl: '/perfil?tab=pastoral',
        read: false,
        createdAt: now,
      };
      await notifRef.set(notif);
    }

    return NextResponse.json({
      success: true,
      message: 'La solicitud ha sido cancelada correctamente.',
    });
  } catch (error: unknown) {
    console.error('[PastoralCancelAPI] Error cancelando solicitud:', error);
    return NextResponse.json(
      { error: 'Error al cancelar la solicitud pastoral.' },
      { status: 500 }
    );
  }
}
