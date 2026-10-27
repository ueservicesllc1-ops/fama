/**
 * FAMA — API Administrativa para Gestión, Reasignación y Asistencia Real de Asignaciones
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Requiere rol de administrador o coordinador autorizado del ministerio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyCoordinatorRequest } from '@/lib/volunteers/volunteerAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  ServiceAssignment,
  ServiceAssignmentAuditEntry,
  AppNotification,
} from '@/types/models';

function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const docSnap = await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(id).get();
  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 });
  }

  const assignment = { id: docSnap.id, ...docSnap.data() } as ServiceAssignment;
  const authCheck = await verifyCoordinatorRequest(request, assignment.ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  return NextResponse.json({ success: true, assignment });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const docRef = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).doc(id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return NextResponse.json({ error: 'Asignación no encontrada.' }, { status: 404 });
  }

  const current = docSnap.data() as ServiceAssignment;
  const authCheck = await verifyCoordinatorRequest(request, current.ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const body = await request.json();
    const now = new Date().toISOString();
    const updates: Partial<ServiceAssignment> = { updatedAt: now };
    const auditActions: ServiceAssignmentAuditEntry[] = [];
    let notifyVolunteer: { title: string; message: string } | null = null;

    // 1. Registro de Asistencia Real / Control de Participación Efectiva (Requisito 4)
    if (typeof body.attended === 'boolean') {
      updates.attended = body.attended;
      updates.status = body.attended ? 'completed' : current.status;
      updates.attendanceCheckedAt = now;
      updates.attendanceCheckedByUid = authCheck.uid;
      updates.attendanceCheckedByName = authCheck.displayName || 'Coordinador';
      if (typeof body.actualMinutesServed === 'number') {
        updates.actualMinutesServed = body.actualMinutesServed;
      }
      if (typeof body.attendanceNotes === 'string') {
        updates.attendanceNotes = body.attendanceNotes.trim().slice(0, 500);
      }

      auditActions.push({
        action: 'asistencia_marcada',
        performedByUid: authCheck.uid || 'admin',
        performedByName: authCheck.displayName || 'Coordinador',
        timestamp: now,
        details: `Participación real registrada: ${body.attended ? 'Presente y servido' : 'No asistió'}.`,
      });
    }

    // 2. Modificación de Horario / Fecha de Servicio
    if (body.date || body.startTime || body.endTime) {
      const newDate = body.date || current.date;
      const newStart = body.startTime || current.startTime;
      const newEnd = body.endTime || current.endTime;

      // Verificar conflictos de horario para el voluntario en el nuevo horario
      const checkSnap = await db
        .collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS)
        .where('volunteerUid', '==', current.volunteerUid)
        .where('date', '==', newDate)
        .get();

      for (const d of checkSnap.docs) {
        if (d.id !== id) {
          const other = d.data() as ServiceAssignment;
          if (other.status !== 'cancelled' && other.status !== 'rejected') {
            if (isTimeOverlapping(newStart, newEnd, other.startTime, other.endTime)) {
              return NextResponse.json(
                {
                  error: `Conflicto de horario: El voluntario ya tiene otra asignación activa en "${other.ministryName}" de ${other.startTime} a ${other.endTime}.`,
                },
                { status: 409 }
              );
            }
          }
        }
      }

      updates.date = newDate;
      updates.startTime = newStart;
      updates.endTime = newEnd;
      // Al cambiar horario de una asignación ya confirmada, vuelve a pendiente de confirmación
      if (current.status === 'confirmed') {
        updates.status = 'pending_confirmation';
      }

      auditActions.push({
        action: 'horario_modificado',
        performedByUid: authCheck.uid || 'admin',
        performedByName: authCheck.displayName || 'Coordinador',
        timestamp: now,
        details: `Horario modificado a: ${newDate} (${newStart} - ${newEnd}).`,
      });

      notifyVolunteer = {
        title: 'Modificación de Horario de Servicio',
        message: `El horario de tu servicio en "${current.ministryName}" ha sido modificado para el ${newDate} (${newStart} - ${newEnd}). Por favor confirma nuevamente en tu perfil.`,
      };
    }

    // 3. Cancelación de Asignación de Servicio
    if (body.status === 'cancelled') {
      updates.status = 'cancelled';
      auditActions.push({
        action: 'cancelada',
        performedByUid: authCheck.uid || 'admin',
        performedByName: authCheck.displayName || 'Coordinador',
        timestamp: now,
        details: `Asignación cancelada por el coordinador: ${body.cancelReason || 'Sin motivo'}`,
      });

      notifyVolunteer = {
        title: 'Cancelación de Servicio',
        message: `Tu asignación de servicio para el ${current.date} en "${current.ministryName}" ha sido cancelada por el equipo de coordinación.`,
      };
    }

    // 4. Resolución de Solicitud de Cambio de Horario
    if (body.resolveChangeRequest) {
      const decision = body.resolveChangeRequest.decision; // 'approved' | 'rejected'
      if (current.changeRequested) {
        updates.changeRequested = {
          ...current.changeRequested,
          status: decision,
          reviewedAt: now,
          reviewedByUid: authCheck.uid,
          reviewedByName: authCheck.displayName || 'Coordinador',
        };

        if (decision === 'approved') {
          updates.status = 'cancelled'; // Se cancela esta asignación para reasignar otra fecha
        }

        auditActions.push({
          action: decision === 'approved' ? 'cambio_aprobado' : 'cambio_rechazado',
          performedByUid: authCheck.uid || 'admin',
          performedByName: authCheck.displayName || 'Coordinador',
          timestamp: now,
          details: `Solicitud de cambio de horario ${decision === 'approved' ? 'aprobada' : 'rechazada'}.`,
        });

        notifyVolunteer = {
          title: `Solicitud de Cambio de Horario ${decision === 'approved' ? 'Aprobada' : 'No Aprobada'}`,
          message: `Tu solicitud de cambio para el ${current.date} en "${current.ministryName}" ha sido ${decision === 'approved' ? 'aprobada' : 'revisada y declinada'}.`,
        };
      }
    }

    // Consolidar auditoría
    const existingAudit = Array.isArray(current.auditLog) ? current.auditLog : [];
    updates.auditLog = [...existingAudit, ...auditActions];

    await docRef.update(updates);

    // Enviar notificación al voluntario si aplica
    if (notifyVolunteer) {
      try {
        const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
        const notif: AppNotification = {
          id: notifRef.id,
          userId: current.volunteerUid,
          title: notifyVolunteer.title,
          message: notifyVolunteer.message,
          category: 'ministerios',
          relatedUrl: '/perfil?tab=servicio',
          read: false,
          createdAt: now,
        };
        await notifRef.set(notif);
      } catch (notifErr) {
        console.warn('[AdminAssignmentUpdate] Error enviando notificación:', notifErr);
      }
    }

    const updatedSnap = await docRef.get();
    return NextResponse.json({
      success: true,
      message: 'Asignación actualizada correctamente.',
      assignment: { id, ...updatedSnap.data() },
    });
  } catch (error: unknown) {
    console.error('[AdminAssignmentUpdateAPI] Error actualizando:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la asignación de servicio.' },
      { status: 500 }
    );
  }
}
