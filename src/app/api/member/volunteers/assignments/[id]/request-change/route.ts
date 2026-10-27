/**
 * FAMA — Solicitud de Cambio de Horario de Servicio por el Voluntario
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Permite al voluntario solicitar un cambio de horario para una asignación asignada.
 * Envía una notificación interna al equipo de coordinación del ministerio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  ServiceAssignment,
  ShiftChangeRequest,
  ServiceAssignmentAuditEntry,
  AppNotification,
} from '@/types/models';

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
    const docRef = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Asignación de servicio no encontrada.' }, { status: 404 });
    }

    const current = docSnap.data() as ServiceAssignment;

    if (current.volunteerUid !== authCheck.uid) {
      return NextResponse.json(
        { error: 'No tienes autorización para gestionar asignaciones ajenas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 400) : '';
    const proposedAlternativeDate =
      typeof body.proposedAlternativeDate === 'string'
        ? body.proposedAlternativeDate.trim().slice(0, 30)
        : undefined;

    if (!reason) {
      return NextResponse.json(
        { error: 'Debe especificar el motivo de la solicitud de cambio de horario.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const changeRequestObj: ShiftChangeRequest = {
      requestedAt: now,
      reason,
      proposedAlternativeDate,
      status: 'pending',
    };

    const auditEntry: ServiceAssignmentAuditEntry = {
      action: 'cambio_solicitado',
      performedByUid: authCheck.uid,
      performedByName: authCheck.name || 'Voluntario',
      timestamp: now,
      details: `Solicitud de cambio de horario enviada: ${reason}`,
    };

    const currentAudit = Array.isArray(current.auditLog) ? current.auditLog : [];

    await docRef.update({
      changeRequested: changeRequestObj,
      updatedAt: now,
      auditLog: [...currentAudit, auditEntry],
    });

    // Notificación interna a coordinadores del ministerio
    try {
      const minDoc = await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).doc(current.ministryId).get();
      if (minDoc.exists) {
        const minData = minDoc.data()!;
        const targets = new Set<string>();
        if (minData.leaderUid) targets.add(minData.leaderUid);
        if (Array.isArray(minData.coordinators)) {
          minData.coordinators.forEach((c: string) => targets.add(c));
        }

        const batch = db.batch();
        targets.forEach((coordinatorUid) => {
          const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
          const notif: AppNotification = {
            id: notifRef.id,
            userId: coordinatorUid,
            title: 'Solicitud de Cambio de Horario',
            message: `${current.volunteerName} ha solicitado cambio de horario en ${current.ministryName} (${current.date} - ${current.roleName}).`,
            category: 'ministerios',
            relatedUrl: '/admin?tab=voluntarios',
            read: false,
            createdAt: now,
          };
          batch.set(notifRef, notif);
        });
        await batch.commit();
      }
    } catch (notifErr) {
      console.warn('[ChangeRequestAPI] No se pudo enviar notificación al coordinador:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de cambio de horario enviada al equipo de coordinación.',
    });
  } catch (error: unknown) {
    console.error('[VolunteerChangeRequestAPI] Error solicitando cambio:', error);
    return NextResponse.json(
      { error: 'Error al enviar la solicitud de cambio de horario.' },
      { status: 500 }
    );
  }
}
