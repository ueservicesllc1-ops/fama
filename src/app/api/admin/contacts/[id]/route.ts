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
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Identificador de mensaje no proporcionado' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.isRead === 'boolean') {
      updateData.isRead = body.isRead;
    }

    if (body.status && ['pending', 'reviewed', 'attended'].includes(body.status)) {
      updateData.status = body.status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No se indicaron campos válidos para actualizar' }, { status: 400 });
    }

    const docRef = db.collection(FIRESTORE_COLLECTIONS.CONTACTS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    await docRef.update(updateData);

    return NextResponse.json({ success: true, id, updated: updateData });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error actualizando mensaje de contacto';
    console.error('[AdminContactDetailAPI] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
