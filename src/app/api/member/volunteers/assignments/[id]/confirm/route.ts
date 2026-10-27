/**
 * FAMA — Confirmar o Rechazar Asignación de Servicio por el Voluntario
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Requiere autenticación de miembro.
 * Estricto control de propiedad: solo el voluntario asignado puede confirmar o rechazar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ServiceAssignment, ServiceAssignmentAuditEntry } from '@/types/models';

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

    // Control de propiedad estricto
    if (current.volunteerUid !== authCheck.uid) {
      return NextResponse.json(
        { error: 'No tienes autorización para modificar una asignación que pertenece a otro miembro.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const action = body.action; // 'confirm' | 'reject'
    const rejectionReason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim().slice(0, 300) : '';

    if (action !== 'confirm' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Acción no válida. Debe ser "confirm" o "reject".' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const auditEntry: ServiceAssignmentAuditEntry = {
      action: action === 'confirm' ? 'confirmada' : 'rechazada',
      performedByUid: authCheck.uid,
      performedByName: authCheck.name || 'Voluntario',
      timestamp: now,
      details: action === 'confirm' ? 'Asignación confirmada por el voluntario' : `Rechazada por el voluntario: ${rejectionReason || 'Sin motivo especificado'}`,
    };

    const currentAudit = Array.isArray(current.auditLog) ? current.auditLog : [];

    const updates: Partial<ServiceAssignment> = {
      status: action === 'confirm' ? 'confirmed' : 'rejected',
      updatedAt: now,
      auditLog: [...currentAudit, auditEntry],
    };

    if (action === 'confirm') {
      updates.confirmedAt = now;
      updates.rejectionReason = undefined;
    } else {
      updates.rejectedAt = now;
      updates.rejectionReason = rejectionReason || 'Rechazada por el voluntario';
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      message: action === 'confirm' ? '¡Asignación confirmada con éxito!' : 'Asignación declinada correctamente.',
      assignment: { ...current, ...updates, id },
    });
  } catch (error: unknown) {
    console.error('[VolunteerConfirmAPI] Error actualizando asignación:', error);
    return NextResponse.json(
      { error: 'Error al procesar la confirmación de la asignación.' },
      { status: 500 }
    );
  }
}
