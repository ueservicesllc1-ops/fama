/**
 * FAMA — Endpoint Administrativo para Aprobar o Rechazar Solicitudes
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID de solicitud requerido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status, type } = body; // status: 'approved' | 'rejected', type: 'group' | 'ministry'

    if (!status || (status !== 'approved' && status !== 'rejected' && status !== 'pending')) {
      return NextResponse.json({ error: 'Estado no válido.' }, { status: 400 });
    }

    const collectionName =
      type === 'ministry'
        ? FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS
        : FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS;

    const appRef = db.collection(collectionName).doc(id);
    const doc = await appRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Solicitud no encontrada.' }, { status: 404 });
    }

    const currentData = doc.data()!;
    if (currentData.status === status) {
      return NextResponse.json({
        success: true,
        application: { id: doc.id, ...currentData },
        message: `La solicitud ya se encontraba ${status === 'approved' ? 'aprobada' : 'rechazada'}.`,
      });
    }

    const nowIso = new Date().toISOString();
    const reviewer = authCheck.email || authCheck.uid || 'admin';

    await appRef.update({
      status,
      updatedAt: nowIso,
      reviewedAt: nowIso,
      reviewedBy: reviewer,
    });

    // Enviar notificación por correo al miembro si tiene correo registrado
    const applicantEmail = currentData.userEmail || currentData.applicantEmail;
    const applicantName = currentData.userName || currentData.applicantName || 'Hermano(a)';
    const targetName = currentData.targetName || currentData.groupName || currentData.ministryName || 'Comunidad FAMA';

    if (applicantEmail && (status === 'approved' || status === 'rejected')) {
      try {
        const { sendApplicationDecisionEmail } = await import('@/lib/email/gmailService');
        await sendApplicationDecisionEmail({
          applicantName,
          applicantEmail,
          type: type === 'ministry' ? 'ministry' : 'group',
          targetName,
          status,
          reviewedBy: reviewer,
        });
        await appRef.update({ decisionNotificationSentAt: nowIso });
      } catch (emailErr) {
        console.warn('[AdminAppStatusAPI] No se pudo enviar correo de notificación:', emailErr);
      }
    }

    const updated = await appRef.get();
    return NextResponse.json({
      success: true,
      application: { id: updated.id, ...updated.data() },
      message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} correctamente${applicantEmail ? ' y notificada por correo.' : '.'}`,
    });
  } catch (error) {
    console.error('[AdminAppStatusAPI] Error actualizando solicitud:', error);
    return NextResponse.json({ error: 'Error al actualizar solicitud.' }, { status: 500 });
  }
}
