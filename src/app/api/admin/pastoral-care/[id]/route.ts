/**
 * FAMA — API Administrativa de Detalle y Gestión de Solicitud Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere rol 'pastor' o 'admin' con 'pastoralAccess'.
 * Permite responder, aprobar citas, proponer reprogramación,
 * registrar notas internas confidenciales y gestionar estados con auditoría.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyPastoralStaffRequest } from '@/lib/pastoral/pastoralAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  PastoralCareRequest,
  PastoralRequestStatus,
  PastoralAuditEntry,
  PastoralInternalNote,
  AppNotification,
} from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authCheck = await verifyPastoralStaffRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const docSnap = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Solicitud pastoral no encontrada.' }, { status: 404 });
    }

    const data = docSnap.data() as PastoralCareRequest;
    return NextResponse.json({
      success: true,
      request: {
        ...data,
        id: docSnap.id,
      },
    });
  } catch (error: unknown) {
    console.error('[AdminPastoralDetailAPI] Error consultando solicitud:', error);
    return NextResponse.json(
      { error: 'Error al consultar el detalle de la solicitud.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authCheck = await verifyPastoralStaffRequest(request);
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
      return NextResponse.json({ error: 'Solicitud pastoral no encontrada.' }, { status: 404 });
    }

    const current = docSnap.data() as PastoralCareRequest;
    const body = await request.json();
    const now = new Date().toISOString();

    const updates: Partial<PastoralCareRequest> & Record<string, any> = {
      updatedAt: now,
    };

    const auditActions: PastoralAuditEntry[] = [];
    let shouldNotifyMember = false;
    let notifTitle = 'Actualización de Atención Pastoral';
    let notifMessage = 'Tu solicitud de atención pastoral ha sido actualizada por el equipo pastoral.';

    // 1. Cambio de Estado
    if (typeof body.status === 'string') {
      const validStatuses: PastoralRequestStatus[] = [
        'pending',
        'in_review',
        'approved',
        'reschedule_proposed',
        'completed',
        'cancelled',
      ];

      if (!validStatuses.includes(body.status as PastoralRequestStatus)) {
        return NextResponse.json({ error: 'Estado inválido proporcionado.' }, { status: 400 });
      }

      const newStatus = body.status as PastoralRequestStatus;
      if (newStatus !== current.status) {
        updates.status = newStatus;
        shouldNotifyMember = true;

        if (newStatus === 'completed') {
          updates.completedAt = now;
          notifTitle = 'Atención Pastoral Completada';
          notifMessage = 'Tu solicitud de atención pastoral ha sido concluida. Que Dios continúe bendiciéndote.';
        } else if (newStatus === 'in_review') {
          notifTitle = 'Solicitud en Revisión';
          notifMessage = 'Tu solicitud está siendo atendida activamente por el equipo pastoral.';
        } else if (newStatus === 'cancelled') {
          updates.cancelledAt = now;
          if (body.cancelReason) {
            updates.cancelReason = String(body.cancelReason).slice(0, 300);
          }
          notifTitle = 'Solicitud Pastoral Cancelada';
          notifMessage = 'Tu solicitud pastoral ha sido cancelada.';
        }

        auditActions.push({
          action: newStatus,
          performedByUid: authCheck.uid,
          performedByName: authCheck.displayName || 'Pastor',
          performedByRole: authCheck.role || 'pastor',
          timestamp: now,
          noteSummary: `Estado actualizado de ${current.status} a ${newStatus}.`,
        });
      }
    }

    // 2. Asignación de Responsable Pastoral
    if (typeof body.assignedPastorUid === 'string' && typeof body.assignedPastorName === 'string') {
      const pUid = body.assignedPastorUid.trim();
      const pName = body.assignedPastorName.trim().slice(0, 100);

      if (pUid !== current.assignedPastorUid) {
        updates.assignedPastorUid = pUid;
        updates.assignedPastorName = pName;

        auditActions.push({
          action: 'asignado',
          performedByUid: authCheck.uid,
          performedByName: authCheck.displayName || 'Pastor',
          performedByRole: authCheck.role || 'pastor',
          timestamp: now,
          noteSummary: `Responsable asignado: ${pName}.`,
        });
      }
    }

    // 3. Confirmación de Cita Pastoral (NUNCA auto-confirmada)
    if (body.confirmedAppointment) {
      const conf = body.confirmedAppointment;
      const confirmedDate = typeof conf.date === 'string' ? conf.date.trim().slice(0, 20) : '';
      const confirmedTime = typeof conf.time === 'string' ? conf.time.trim().slice(0, 20) : '';
      const confirmedModality = ['presencial', 'telefonica', 'videollamada'].includes(conf.modality)
        ? conf.modality
        : current.appointmentDetails?.modality || 'presencial';
      const confirmedLocationOrLink =
        typeof conf.locationOrLink === 'string' ? conf.locationOrLink.trim().slice(0, 300) : '';

      if (confirmedDate && confirmedTime) {
        updates.appointmentDetails = {
          ...(current.appointmentDetails || {
            reason: 'Atención Pastoral',
            preferredDate: confirmedDate,
            preferredTimeSlot: confirmedTime,
            preferredContactMethod: 'whatsapp',
            modality: confirmedModality,
          }),
          confirmedDate,
          confirmedTime,
          confirmedModality,
          confirmedLocationOrLink,
        };
        updates.status = 'approved';

        shouldNotifyMember = true;
        notifTitle = 'Cita Pastoral Confirmada';
        notifMessage = `Tu cita pastoral ha sido aprobada y agendada para el ${confirmedDate} a las ${confirmedTime} (${confirmedModality}).`;

        auditActions.push({
          action: 'aprobada',
          performedByUid: authCheck.uid,
          performedByName: authCheck.displayName || 'Pastor',
          performedByRole: authCheck.role || 'pastor',
          timestamp: now,
          noteSummary: `Cita pastoral confirmada para ${confirmedDate} a las ${confirmedTime}.`,
        });
      }
    }

    // 4. Propuesta de Reprogramación de Cita
    if (body.rescheduleProposal) {
      const prop = body.rescheduleProposal;
      const proposedDate = typeof prop.date === 'string' ? prop.date.trim().slice(0, 20) : '';
      const proposedTimeSlot = typeof prop.timeSlot === 'string' ? prop.timeSlot.trim().slice(0, 50) : '';
      const reason = typeof prop.reason === 'string' ? prop.reason.trim().slice(0, 300) : '';

      if (proposedDate && proposedTimeSlot) {
        updates.rescheduleProposedDate = proposedDate;
        updates.rescheduleProposedTimeSlot = proposedTimeSlot;
        updates.rescheduleReason = reason;
        updates.status = 'reschedule_proposed';

        shouldNotifyMember = true;
        notifTitle = 'Propuesta de Reprogramación Pastoral';
        notifMessage = `El equipo pastoral ha propuesto un nuevo horario para tu cita: ${proposedDate} (${proposedTimeSlot}). Por favor revísalo en tu perfil.`;

        auditActions.push({
          action: 'reprogramacion_propuesta',
          performedByUid: authCheck.uid,
          performedByName: authCheck.displayName || 'Pastor',
          performedByRole: authCheck.role || 'pastor',
          timestamp: now,
          noteSummary: `Reprogramación propuesta para ${proposedDate} (${proposedTimeSlot}).`,
        });
      }
    }

    // 5. Respuesta Visible para el Miembro
    if (typeof body.publicResponse === 'string') {
      const resp = body.publicResponse.trim().slice(0, 2000);
      if (resp) {
        updates.publicResponse = resp;
        updates.respondedAt = now;
        updates.respondedByUid = authCheck.uid;
        updates.respondedByName = authCheck.displayName || 'Pastor';

        shouldNotifyMember = true;
        notifTitle = 'Respuesta de Atención Pastoral';
        notifMessage = 'Has recibido una respuesta oficial del equipo pastoral en tu perfil.';

        auditActions.push({
          action: 'respuesta_enviada',
          performedByUid: authCheck.uid,
          performedByName: authCheck.displayName || 'Pastor',
          performedByRole: authCheck.role || 'pastor',
          timestamp: now,
          noteSummary: 'Respuesta pastoral oficial enviada al miembro.',
        });
      }
    }

    // 6. Registro de Nota Interna Confidencial (NUNCA expuesta al miembro)
    if (typeof body.newInternalNote === 'string' && body.newInternalNote.trim().length > 0) {
      const noteText = body.newInternalNote.trim().slice(0, 1500);
      const noteObj: PastoralInternalNote = {
        id: randomUUID(),
        authorUid: authCheck.uid,
        authorName: authCheck.displayName || 'Pastor',
        note: noteText,
        createdAt: now,
      };

      const existingNotes = Array.isArray(current.internalNotes) ? current.internalNotes : [];
      updates.internalNotes = [...existingNotes, noteObj];

      // Doble persistencia en subcolección protegida por Firestore Rules
      await docRef.collection('internal_notes').doc(noteObj.id).set(noteObj);

      auditActions.push({
        action: 'nota_agregada',
        performedByUid: authCheck.uid,
        performedByName: authCheck.displayName || 'Pastor',
        performedByRole: authCheck.role || 'pastor',
        timestamp: now,
        noteSummary: 'Nota interna pastoral confidencial registrada.',
      });
    }

    // 7. Aprobación y Publicación en el Muro Congregacional de Oración
    // REGLA CRÍTICA: Solo si el miembro autorizó allowPublicWall expresamente
    if (body.approveForPublicWall === true && current.type === 'oracion') {
      if (!current.prayerDetails?.allowPublicWall) {
        return NextResponse.json(
          {
            error:
              'No se puede publicar en el muro público: El miembro no otorgó consentimiento expreso para compartir con la congregación.',
          },
          { status: 400 }
        );
      }

      if (!current.prayerDetails?.approvedForPublicWall) {
        // Crear documento en la colección comunitaria PRAYER_REQUESTS
        const pubRef = db.collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS).doc();
        await pubRef.set({
          authorName: current.userName || 'Hermano/a en la fe',
          category: 'Espiritual',
          createdAt: now,
          isAnonymous: false,
          prayedByUsers: [],
          prayersCount: 0,
          requestText: current.prayerDetails.requestText,
          userId: current.userId,
          title: current.prayerDetails.title || 'Petición Congregacional',
        });

        updates.prayerDetails = {
          ...current.prayerDetails,
          approvedForPublicWall: true,
          publishedToWallAt: now,
          publishedPrayerId: pubRef.id,
        };

        auditActions.push({
          action: 'publicado_muro',
          performedByUid: authCheck.uid,
          performedByName: authCheck.displayName || 'Pastor',
          performedByRole: authCheck.role || 'pastor',
          timestamp: now,
          noteSummary: 'Petición aprobada y publicada en el muro comunitario con consentimiento del miembro.',
        });
      }
    }

    // Consolidar Auditoría
    const currentAudit = Array.isArray(current.auditLog) ? current.auditLog : [];
    updates.auditLog = [...currentAudit, ...auditActions];

    // Guardar actualizaciones en Firestore
    await docRef.update(updates);

    // Enviar notificación discreta al miembro si corresponde
    if (shouldNotifyMember && current.memberNotificationOptIn !== false) {
      const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
      const notif: AppNotification = {
        id: notifRef.id,
        userId: current.userId,
        title: notifTitle,
        message: notifMessage,
        category: 'pastoral',
        relatedUrl: '/perfil?tab=pastoral',
        read: false,
        createdAt: now,
      };
      await notifRef.set(notif);
    }

    // Obtener documento actualizado completo para el panel pastoral
    const updatedSnap = await docRef.get();

    return NextResponse.json({
      success: true,
      message: 'Solicitud pastoral actualizada con éxito.',
      request: {
        ...updatedSnap.data(),
        id: updatedSnap.id,
      },
    });
  } catch (error: unknown) {
    console.error('[AdminPastoralUpdateAPI] Error actualizando solicitud pastoral:', error);
    return NextResponse.json(
      { error: 'Error al procesar la actualización de la solicitud pastoral.' },
      { status: 500 }
    );
  }
}
