/**
 * FAMA — Endpoint Administrativo de Evento Específico (Editar / Eliminar)
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
    return NextResponse.json({ error: 'ID de evento requerido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const eventRef = db.collection(FIRESTORE_COLLECTIONS.EVENTS).doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    const allowedUpdates: Record<string, unknown> = {};
    if (body.title !== undefined) allowedUpdates.title = String(body.title).trim();
    if (body.category !== undefined) allowedUpdates.category = body.category;
    if (body.date !== undefined) allowedUpdates.date = String(body.date).trim();
    if (body.time !== undefined) allowedUpdates.time = String(body.time).trim();
    if (body.location !== undefined) allowedUpdates.location = String(body.location).trim();
    if (body.modality !== undefined) {
      allowedUpdates.modality = body.modality;
      allowedUpdates.isOnline = body.modality === 'virtual' || body.modality === 'hibrido';
    }
    if (body.description !== undefined) allowedUpdates.description = String(body.description).trim();
    if (body.speaker !== undefined) allowedUpdates.speaker = String(body.speaker).trim();
    if (body.imageUrl !== undefined) allowedUpdates.imageUrl = String(body.imageUrl).trim();
    if (body.capacity !== undefined) allowedUpdates.capacity = body.capacity ? Number(body.capacity) : null;
    if (body.status !== undefined) allowedUpdates.status = body.status;
    if (body.allowsRegistration !== undefined) {
      allowedUpdates.allowsRegistration = Boolean(body.allowsRegistration);
      allowedUpdates.registrationRequired = Boolean(body.allowsRegistration);
    }
    allowedUpdates.updatedAt = new Date().toISOString();

    await eventRef.update(allowedUpdates);
    const updatedDoc = await eventRef.get();

    return NextResponse.json({
      success: true,
      event: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('[AdminEventAPI] Error actualizando evento:', error);
    return NextResponse.json({ error: 'Error al actualizar evento.' }, { status: 500 });
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
    return NextResponse.json({ error: 'ID de evento requerido.' }, { status: 400 });
  }

  try {
    const eventRef = db.collection(FIRESTORE_COLLECTIONS.EVENTS).doc(id);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Evento no encontrado.' }, { status: 404 });
    }

    await eventRef.delete();
    return NextResponse.json({ success: true, message: 'Evento eliminado correctamente.' });
  } catch (error) {
    console.error('[AdminEventAPI] Error eliminando evento:', error);
    return NextResponse.json({ error: 'Error al eliminar evento.' }, { status: 500 });
  }
}
