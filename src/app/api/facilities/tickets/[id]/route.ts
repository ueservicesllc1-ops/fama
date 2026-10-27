import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyFacilityRequest,
  sanitizeTicketFinancials,
  sendFacilityNotification,
  createFacilityAuditEntry,
} from '@/lib/facilities/facilityAuthHelper';
import {
  MaintenanceTicket,
  MaintenanceTicketStatus,
  MaintenancePriority,
  MaintenanceCategory,
} from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const doc = await db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Incidencia no encontrada.' }, { status: 404 });
    }

    const ticket = { id: doc.id, ...doc.data() } as MaintenanceTicket;

    // Verificar si el usuario tiene permiso para ver este ticket
    if (!authCheck.canManage && ticket.reportedByUid !== authCheck.uid && ticket.assignedToUid !== authCheck.uid) {
      return NextResponse.json({ error: 'No tienes autorización para ver este reporte.' }, { status: 403 });
    }

    const sanitized = sanitizeTicketFinancials(ticket, authCheck.canViewFinancials);
    return NextResponse.json({ ticket: sanitized });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar incidencia';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Incidencia no encontrada.' }, { status: 404 });
    }

    const ticket = { id: docSnap.id, ...docSnap.data() } as MaintenanceTicket;
    const body = await request.json();
    const { action } = body;

    const operatorName = authCheck.profile?.displayName || authCheck.email || 'Operador';
    const now = new Date().toISOString();
    const updates: Partial<MaintenanceTicket> = {
      updatedAt: now,
    };

    // 1. ACCIÓN: Asignar Responsable / Técnico
    if (action === 'assign') {
      if (!authCheck.canManage) {
        return NextResponse.json({ error: 'No autorizado para asignar tareas técnicas.' }, { status: 403 });
      }

      const { assignedToUid, assignedToName } = body;
      if (!assignedToUid || !assignedToName) {
        return NextResponse.json({ error: 'Debe especificar el responsable asignado.' }, { status: 400 });
      }

      updates.assignedToUid = assignedToUid;
      updates.assignedToName = assignedToName;
      updates.assignedAt = now;
      if (ticket.status === 'reportado') {
        updates.status = 'asignado';
      }

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'asignacion_responsable',
        `Tarea asignada a "${assignedToName}".`
      );
      updates.auditLog = [...(ticket.auditLog || []), auditEntry];

      // Notificar al técnico asignado
      await sendFacilityNotification({
        userId: assignedToUid,
        title: `Nueva tarea técnica asignada: ${ticket.facilityName}`,
        message: `Se te ha asignado la incidencia ${ticket.ticketNumber} (${ticket.priority.toUpperCase()}): ${ticket.description.substring(0, 70)}...`,
        type: 'facility_task_assigned',
        link: '/admin?tab=mantenimiento',
        deduplicationKey: `assign-${id}-${assignedToUid}`,
      });
    }

    // 2. ACCIÓN: Cambiar Estado Operativo (en_proceso, pendiente_materiales, etc.)
    else if (action === 'update_status') {
      if (!authCheck.canManage && ticket.assignedToUid !== authCheck.uid) {
        return NextResponse.json({ error: 'No autorizado para actualizar el estado del trabajo.' }, { status: 403 });
      }

      const { status, internalNotes } = body;
      const validStatuses: MaintenanceTicketStatus[] = [
        'en_revision',
        'asignado',
        'en_proceso',
        'pendiente_materiales',
        'cancelado',
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Estado inválido. Para certificar el cierre utilice la acción de verificación.' },
          { status: 400 }
        );
      }

      updates.status = status;
      if (internalNotes) updates.internalNotes = internalNotes;

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'cambio_estado',
        `Estado actualizado a "${status}".`
      );
      updates.auditLog = [...(ticket.auditLog || []), auditEntry];
    }

    // 3. ACCIÓN: Completar Trabajo de Reparación
    else if (action === 'complete_work') {
      if (!authCheck.canManage && ticket.assignedToUid !== authCheck.uid) {
        return NextResponse.json({ error: 'No autorizado para reportar la finalización del trabajo.' }, { status: 403 });
      }

      const { resolutionNotes, actualCost, materials } = body;
      if (!resolutionNotes || typeof resolutionNotes !== 'string' || !resolutionNotes.trim()) {
        return NextResponse.json({ error: 'Debe detallar las notas de resolución técnica.' }, { status: 400 });
      }

      updates.resolutionNotes = resolutionNotes.trim();
      updates.completedAt = now;
      updates.status = 'en_revision'; // Pasa a revisión para verificación final de seguridad obligatoria

      if (authCheck.canViewFinancials) {
        if (typeof actualCost === 'number') updates.actualCost = actualCost;
        if (Array.isArray(materials)) updates.materials = materials;
      }

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'trabajo_finalizado',
        `Reparación reportada como completada. Esperando verificación de seguridad.`
      );
      updates.auditLog = [...(ticket.auditLog || []), auditEntry];

      // Notificar a los administradores para que verifiquen el trabajo
      if (ticket.reportedByUid) {
        await sendFacilityNotification({
          userId: ticket.reportedByUid,
          title: `Avance en incidencia ${ticket.ticketNumber}`,
          message: `El trabajo en "${ticket.facilityName}" fue finalizado y está en proceso de verificación.`,
          type: 'facility_work_completed',
          link: '/perfil?tab=mantenimiento',
          deduplicationKey: `complete-work-${id}`,
        });
      }
    }

    // 4. ACCIÓN: Verificación Final Obligatoria (Cierre y Certificación de Seguridad)
    // REGLA OBLIGATORIA: El cierre debe registrar quién verificó el trabajo.
    else if (action === 'verify') {
      if (!authCheck.canManage) {
        return NextResponse.json(
          { error: 'Solo personal administrativo o supervisores autorizados pueden certificar y verificar el trabajo.' },
          { status: 403 }
        );
      }

      const { verificationNotes } = body;
      if (!verificationNotes || typeof verificationNotes !== 'string' || !verificationNotes.trim()) {
        return NextResponse.json(
          { error: 'Es obligatorio registrar las observaciones de la inspección y verificación física del trabajo.' },
          { status: 400 }
        );
      }

      updates.verifiedByUid = authCheck.uid || 'admin';
      updates.verifiedByName = operatorName;
      updates.verifiedAt = now;
      updates.verificationNotes = verificationNotes.trim();
      updates.status = 'completado'; // Certificado seguro

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'verificacion_seguridad',
        `Trabajo verificado y certificado físicamente por ${operatorName}. Incidencia cerrada.`
      );
      updates.auditLog = [...(ticket.auditLog || []), auditEntry];

      // Notificar al reportante que el problema está resuelto y seguro
      if (ticket.reportedByUid) {
        await sendFacilityNotification({
          userId: ticket.reportedByUid,
          title: `Incidencia Resuelta y Verificada: ${ticket.ticketNumber}`,
          message: `El problema reportado en "${ticket.facilityName}" ha sido reparado y verificado satisfactoriamente.`,
          type: 'facility_ticket_resolved',
          link: '/perfil?tab=mantenimiento',
          deduplicationKey: `verified-${id}`,
        });
      }
    }

    // 5. ACCIÓN: Edición General de Datos
    else {
      if (!authCheck.canManage) {
        return NextResponse.json({ error: 'No autorizado para editar este reporte.' }, { status: 403 });
      }

      if (body.priority) updates.priority = body.priority as MaintenancePriority;
      if (body.category) updates.category = body.category as MaintenanceCategory;
      if (body.description) updates.description = body.description.trim();
      if (body.internalNotes !== undefined) updates.internalNotes = body.internalNotes;

      if (authCheck.canViewFinancials) {
        if (body.estimatedCost !== undefined) updates.estimatedCost = body.estimatedCost;
        if (body.actualCost !== undefined) updates.actualCost = body.actualCost;
        if (Array.isArray(body.materials)) updates.materials = body.materials;
      }

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'edicion_ticket',
        `Edición de parámetros generales de la incidencia.`
      );
      updates.auditLog = [...(ticket.auditLog || []), auditEntry];
    }

    await docRef.update(updates);

    const updatedTicket = { ...ticket, ...updates };
    const sanitized = sanitizeTicketFinancials(updatedTicket, authCheck.canViewFinancials);

    return NextResponse.json({
      success: true,
      ticket: sanitized,
      message: 'Incidencia actualizada exitosamente.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al modificar incidencia';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
