/**
 * FAMA — Endpoint Administrativo de Grupo Específico (Editar / Eliminar)
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
    return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const groupRef = db.collection(FIRESTORE_COLLECTIONS.GROUPS).doc(id);
    const doc = await groupRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.leader !== undefined) updates.leader = String(body.leader).trim();
    if (body.meetingDay !== undefined) updates.meetingDay = String(body.meetingDay).trim();
    if (body.meetingTime !== undefined) updates.meetingTime = String(body.meetingTime).trim();
    if (body.location !== undefined) updates.location = String(body.location).trim();
    if (body.description !== undefined) updates.description = String(body.description).trim();
    if (body.maxMembers !== undefined) updates.maxMembers = body.maxMembers ? Number(body.maxMembers) : null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.imageUrl !== undefined) updates.imageUrl = String(body.imageUrl).trim();

    await groupRef.update(updates);
    const updated = await groupRef.get();

    return NextResponse.json({ success: true, group: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('[AdminGroupAPI] Error actualizando grupo:', error);
    return NextResponse.json({ error: 'Error al actualizar grupo.' }, { status: 500 });
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
    return NextResponse.json({ error: 'ID de grupo requerido.' }, { status: 400 });
  }

  try {
    const groupRef = db.collection(FIRESTORE_COLLECTIONS.GROUPS).doc(id);
    const doc = await groupRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Grupo no encontrado.' }, { status: 404 });
    }

    await groupRef.delete();
    return NextResponse.json({ success: true, message: 'Grupo eliminado correctamente.' });
  } catch (error) {
    console.error('[AdminGroupAPI] Error eliminando grupo:', error);
    return NextResponse.json({ error: 'Error al eliminar grupo.' }, { status: 500 });
  }
}
