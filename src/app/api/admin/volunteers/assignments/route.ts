/**
 * FAMA — API Administrativa de Asignaciones de Voluntarios
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Requiere rol de administrador o coordinador autorizado del ministerio.
 *
 * REGLAS DE NEGOCIO OBLIGATORIAS:
 *  - Detección estricta de conflictos de horario para un mismo voluntario.
 *  - Prevención de asignaciones duplicadas para la misma persona, función y horario.
 *  - Estado inicial: 'pending_confirmation' (NUNCA auto-confirmada sin aceptación del voluntario).
 *  - Emisión de notificación interna discreta y no duplicada.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyCoordinatorRequest } from '@/lib/volunteers/volunteerAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ServiceAssignment, AppNotification } from '@/types/models';

/**
 * Función auxiliar para comprobar superposición entre dos rangos horarios (HH:mm)
 */
function isTimeOverlapping(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ministryId = searchParams.get('ministryId') || undefined;
  const shiftId = searchParams.get('shiftId') || undefined;
  const status = searchParams.get('status') || undefined;
  const volunteerUid = searchParams.get('volunteerUid') || undefined;

  const authCheck = await verifyCoordinatorRequest(request, ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS);

    if (ministryId) {
      query = query.where('ministryId', '==', ministryId);
    } else if (!authCheck.isOverallAdmin) {
      if (authCheck.authorizedMinistries.length > 0) {
        query = query.where('ministryId', 'in', authCheck.authorizedMinistries.slice(0, 10));
      } else {
        return NextResponse.json({ success: true, count: 0, assignments: [] });
      }
    }

    if (shiftId) query = query.where('shiftId', '==', shiftId);
    if (status && status !== 'all') query = query.where('status', '==', status);
    if (volunteerUid) query = query.where('volunteerUid', '==', volunteerUid);

    const snap = await query.get();
    const assignments: ServiceAssignment[] = [];

    snap.forEach((doc) => {
      assignments.push({ id: doc.id, ...doc.data() } as ServiceAssignment);
    });

    // Orden cronológico por fecha y hora
    assignments.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    return NextResponse.json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error: unknown) {
    console.error('[AdminAssignmentsAPI] Error consultando asignaciones:', error);
    return NextResponse.json(
      { error: 'Error al consultar asignaciones de servicio.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const ministryId = body.ministryId;

  if (!ministryId) {
    return NextResponse.json({ error: 'Debe especificar el ministerio de la asignación.' }, { status: 400 });
  }

  const authCheck = await verifyCoordinatorRequest(request, ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const {
      shiftId,
      shiftTitle,
      ministryName,
      cultoId,
      eventId,
      date,
      startTime,
      endTime,
      location = 'Templo Central — Nave Principal',
      roleId,
      roleName,
      volunteerUid,
      volunteerName,
      volunteerEmail,
      volunteerPhone,
    } = body;

    if (!shiftId || !date || !startTime || !endTime || !roleId || !volunteerUid) {
      return NextResponse.json(
        { error: 'Datos incompletos: turno, fecha, horarios, función y voluntario son requeridos.' },
        { status: 400 }
      );
    }

    // 1. REGLA DE SEGURIDAD: Evitar asignación duplicada para la misma persona, turno y función
    const duplicateCheckSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS)
      .where('shiftId', '==', shiftId)
      .where('volunteerUid', '==', volunteerUid)
      .where('roleId', '==', roleId)
      .get();

    const activeDuplicate = duplicateCheckSnap.docs.some((d) => {
      const data = d.data() as ServiceAssignment;
      return data.status !== 'cancelled' && data.status !== 'rejected';
    });

    if (activeDuplicate) {
      return NextResponse.json(
        { error: `Esta persona (${volunteerName}) ya cuenta con una asignación activa para la función "${roleName}" en este mismo servicio.` },
        { status: 400 }
      );
    }

    // 2. REGLA DE SEGURIDAD: Detección estricta de conflictos de horario (Overlap Detection)
    // Consultar todas las asignaciones de este voluntario en la misma fecha
    const sameDateAssignmentsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS)
      .where('volunteerUid', '==', volunteerUid)
      .where('date', '==', date)
      .get();

    for (const doc of sameDateAssignmentsSnap.docs) {
      const existing = doc.data() as ServiceAssignment;
      // Solo consideramos asignaciones activas (no canceladas ni rechazadas)
      if (existing.status !== 'cancelled' && existing.status !== 'rejected') {
        const overlap = isTimeOverlapping(startTime, endTime, existing.startTime, existing.endTime);
        if (overlap) {
          return NextResponse.json(
            {
              error: `Conflicto de horario detectado: ${volunteerName} ya tiene una asignación activa en "${existing.ministryName} — ${existing.roleName}" de ${existing.startTime} a ${existing.endTime} el ${date}.`,
              conflictDetails: {
                existingShiftTitle: existing.shiftTitle,
                existingMinistry: existing.ministryName,
                existingRole: existing.roleName,
                existingTime: `${existing.startTime} - ${existing.endTime}`,
              },
            },
            { status: 409 } // 409 Conflict
          );
        }
      }
    }

    // 3. Crear asignación con estado inicial 'pending_confirmation'
    const now = new Date().toISOString();
    const newAssignment: Omit<ServiceAssignment, 'id'> = {
      shiftId,
      shiftTitle: shiftTitle || 'Servicio Congregacional',
      ministryId,
      ministryName: ministryName || 'Ministerio',
      cultoId: cultoId || undefined,
      eventId: eventId || undefined,
      date,
      startTime,
      endTime,
      location,
      roleId,
      roleName: roleName || 'Voluntario',
      volunteerUid,
      volunteerName: volunteerName || 'Hermano/a',
      volunteerEmail: volunteerEmail || '',
      volunteerPhone: volunteerPhone || '',
      status: 'pending_confirmation', // REGLA: Nunca auto-confirmada
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.displayName || 'Coordinador',
      createdAt: now,
      updatedAt: now,
      auditLog: [
        {
          action: 'creada',
          performedByUid: authCheck.uid || 'admin',
          performedByName: authCheck.displayName || 'Coordinador',
          timestamp: now,
          details: `Asignado a ${volunteerName} para la función "${roleName}".`,
        },
      ],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS).add(newAssignment);
    const assignmentId = docRef.id;

    // 4. Emitir notificación interna discreta al voluntario (sin duplicación)
    try {
      const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
      const notif: AppNotification = {
        id: notifRef.id,
        userId: volunteerUid,
        title: 'Nueva Asignación de Servicio',
        message: `Has sido programado para "${newAssignment.roleName}" en "${newAssignment.shiftTitle}" el ${date} (${startTime} - ${endTime}). Por favor confirma tu participación en tu perfil.`,
        category: 'ministerios',
        relatedUrl: '/perfil?tab=servicio',
        read: false,
        createdAt: now,
      };
      await notifRef.set(notif);
    } catch (notifErr) {
      console.warn('[AdminAssignmentAPI] Error enviando notificación interna:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Asignación creada correctamente y notificada al voluntario.',
      assignment: { ...newAssignment, id: assignmentId },
    });
  } catch (error: unknown) {
    console.error('[AdminAssignmentAPI] Error creando asignación:', error);
    return NextResponse.json(
      { error: 'Error al procesar la asignación de voluntario.' },
      { status: 500 }
    );
  }
}
