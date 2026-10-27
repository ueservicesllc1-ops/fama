/**
 * FAMA — Endpoint Administrativo de Detalle y Actualización de Sesión de Asistencia
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { AttendanceSession, AttendanceRecord } from '@/types/models';

export async function GET(
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
    const sessionDoc = await db
      .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS)
      .doc(id)
      .get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Sesión no encontrada.' }, { status: 404 });
    }

    const session = { ...(sessionDoc.data() as AttendanceSession), id: sessionDoc.id };

    // Obtener registros de asistencia asociados a esta sesión
    const recordsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS)
      .where('sessionId', '==', id)
      .get();

    const records: AttendanceRecord[] = [];
    recordsSnap.forEach((doc) => {
      records.push({ ...(doc.data() as AttendanceRecord), id: doc.id });
    });

    // Ordenar registros: presentes primero, luego por nombre
    records.sort((a, b) => {
      if (a.status === 'present' && b.status !== 'present') return -1;
      if (a.status !== 'present' && b.status === 'present') return 1;
      const nameA = (a.attendeeType === 'member' ? a.memberName : a.visitorName) || '';
      const nameB = (b.attendeeType === 'member' ? b.memberName : b.visitorName) || '';
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({
      success: true,
      session,
      records,
      count: records.length,
    });
  } catch (error: unknown) {
    console.error('Error al consultar sesión de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al consultar la sesión en Firestore.' },
      { status: 500 }
    );
  }
}

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
    const sessionRef = db
      .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS)
      .doc(id);

    const docSnap = await sessionRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Sesión no encontrada.' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {
      updatedByUid: authCheck.uid || 'admin',
      updatedByName: authCheck.displayName || 'Administrador Pastoral',
      updatedAt: new Date().toISOString(),
    };

    if (body.title && typeof body.title === 'string' && body.title.trim().length >= 3) {
      updateData.title = body.title.trim();
    }

    if (body.location && typeof body.location === 'string') {
      updateData.location = body.location.trim();
    }

    if (body.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    }

    if (body.status && ['active', 'closed', 'cancelled'].includes(body.status)) {
      updateData.status = body.status;
    }

    await sessionRef.update(updateData);

    const updatedSnap = await sessionRef.get();

    return NextResponse.json({
      success: true,
      message: 'Sesión actualizada correctamente.',
      session: { ...(updatedSnap.data() as AttendanceSession), id: updatedSnap.id },
    });
  } catch (error: unknown) {
    console.error('Error al actualizar sesión de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la sesión en Firestore.' },
      { status: 500 }
    );
  }
}
