/**
 * FAMA — Endpoint Administrativo de Detalle, Actualización y Archivo de Comunicado
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { InstitutionalAnnouncement, EmailBroadcastLog } from '@/types/models';

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
    const docRef = db.collection(FIRESTORE_COLLECTIONS.ANNOUNCEMENTS).doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Comunicado no encontrado.' }, { status: 404 });
    }

    const announcement: InstitutionalAnnouncement = {
      ...(snap.data() as InstitutionalAnnouncement),
      id: snap.id,
    };

    // Obtener registros de broadcast de correo asociados si existen
    const broadcastSnap = await db
      .collection(FIRESTORE_COLLECTIONS.EMAIL_BROADCASTS)
      .where('announcementId', '==', id)
      .get();

    const broadcasts: EmailBroadcastLog[] = [];
    broadcastSnap.forEach((doc) => {
      broadcasts.push({ ...(doc.data() as EmailBroadcastLog), id: doc.id });
    });

    return NextResponse.json({
      success: true,
      announcement,
      broadcasts,
    });
  } catch (error: unknown) {
    console.error('Error al consultar comunicado:', error);
    return NextResponse.json(
      { error: 'Error al consultar comunicado en Firestore.' },
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
    const docRef = db.collection(FIRESTORE_COLLECTIONS.ANNOUNCEMENTS).doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Comunicado no encontrado.' }, { status: 404 });
    }

    const body = await request.json();
    const nowIso = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedAt: nowIso,
    };

    if (body.title && typeof body.title === 'string' && body.title.trim().length >= 3) {
      updateData.title = body.title.trim();
    }

    if (body.message && typeof body.message === 'string' && body.message.trim().length >= 5) {
      updateData.message = body.message.trim();
    }

    if (body.status && ['draft', 'published', 'archived'].includes(body.status)) {
      updateData.status = body.status;
      if (body.status === 'archived') {
        updateData.archivedAt = nowIso;
      } else if (body.status === 'published' && !snap.data()?.publishedAt) {
        updateData.publishedAt = nowIso;
      }
    }

    await docRef.update(updateData);
    const updatedSnap = await docRef.get();

    return NextResponse.json({
      success: true,
      message: 'Comunicado actualizado correctamente.',
      announcement: {
        ...(updatedSnap.data() as InstitutionalAnnouncement),
        id: updatedSnap.id,
      },
    });
  } catch (error: unknown) {
    console.error('Error al actualizar comunicado:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el comunicado en Firestore.' },
      { status: 500 }
    );
  }
}
