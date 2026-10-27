/**
 * FAMA — Endpoint Administrativo de Ministerio Específico (Editar / Eliminar)
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
    return NextResponse.json({ error: 'ID de ministerio requerido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const ministryRef = db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).doc(id);
    const doc = await ministryRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Ministerio no encontrado.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.leader !== undefined) updates.leader = String(body.leader).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.iconName !== undefined) updates.iconName = String(body.iconName).trim();
    if (body.requirements !== undefined && Array.isArray(body.requirements)) {
      updates.requirements = body.requirements;
    }
    if (body.meetingSchedule !== undefined) updates.meetingSchedule = String(body.meetingSchedule).trim();
    if (body.status !== undefined) updates.status = body.status;
    if (body.leaderUid !== undefined) updates.leaderUid = String(body.leaderUid).trim();
    if (body.coordinators !== undefined && Array.isArray(body.coordinators)) {
      updates.coordinators = body.coordinators;
    }
    if (body.roles !== undefined && Array.isArray(body.roles)) {
      updates.roles = body.roles;
    }
    if (body.defaultLocation !== undefined) updates.defaultLocation = String(body.defaultLocation).trim();
    if (body.serviceTimes !== undefined && Array.isArray(body.serviceTimes)) {
      updates.serviceTimes = body.serviceTimes;
    }

    await ministryRef.update(updates);
    const updated = await ministryRef.get();

    return NextResponse.json({ success: true, ministry: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('[AdminMinistryAPI] Error actualizando ministerio:', error);
    return NextResponse.json({ error: 'Error al actualizar ministerio.' }, { status: 500 });
  }
}

export async function DELETE(
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
    return NextResponse.json({ error: 'ID de ministerio requerido.' }, { status: 400 });
  }

  try {
    const ministryRef = db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).doc(id);
    const doc = await ministryRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Ministerio no encontrado.' }, { status: 404 });
    }

    await ministryRef.delete();
    return NextResponse.json({ success: true, message: 'Ministerio eliminado correctamente.' });
  } catch (error) {
    console.error('[AdminMinistryAPI] Error eliminando ministerio:', error);
    return NextResponse.json({ error: 'Error al eliminar ministerio.' }, { status: 500 });
  }
}
