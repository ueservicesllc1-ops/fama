/**
 * FAMA — Endpoint Administrativo de Corrección y Anulación Auditada de Asistencia
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { AttendanceRecord } from '@/types/models';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'El motivo de la corrección o anulación es obligatorio (mínimo 5 caracteres).' },
        { status: 400 }
      );
    }

    const recordRef = db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS).doc(id);
    const recordSnap = await recordRef.get();

    if (!recordSnap.exists) {
      return NextResponse.json(
        { error: 'El registro de asistencia no existe.' },
        { status: 404 }
      );
    }

    const record = recordSnap.data() as AttendanceRecord;

    if (record.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Este registro de asistencia ya se encuentra cancelado o corregido.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Actualización auditada del registro
    await recordRef.update({
      status: 'cancelled',
      correctionReason: reason.trim(),
      correctedByUid: authCheck.uid || 'admin',
      correctedByName: authCheck.displayName || 'Administrador Pastoral',
      correctedAt: nowIso,
    });

    // Actualizar contadores de la sesión asociada
    const sessionRef = db
      .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS)
      .doc(record.sessionId);

    const sessionSnap = await sessionRef.get();
    if (sessionSnap.exists) {
      const isMember = record.attendeeType === 'member';
      await sessionRef.update({
        attendeesCount: FieldValue.increment(-1),
        ...(isMember
          ? { membersCount: FieldValue.increment(-1) }
          : { visitorsCount: FieldValue.increment(-1) }),
        updatedAt: nowIso,
      });
    }

    const updatedSnap = await recordRef.get();

    return NextResponse.json({
      success: true,
      message: 'Registro de asistencia corregido y anulado con auditoría.',
      record: { ...(updatedSnap.data() as AttendanceRecord), id: updatedSnap.id },
    });
  } catch (error: unknown) {
    console.error('Error al anular registro de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al corregir el registro de asistencia en Firestore.' },
      { status: 500 }
    );
  }
}
