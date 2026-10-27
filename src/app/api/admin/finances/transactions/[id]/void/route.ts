/**
 * FAMA - API de Anulación y Corrección de Transacciones Financieras
 * Ruta: PATCH /api/admin/finances/transactions/[id]/void
 *
 * USO EXCLUSIVO EN SERVIDOR CON AUTORIZACIÓN PASTORAL / ADMIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: 'Base de datos no disponible en el servidor.' },
      { status: 500 }
    );
  }

  try {
    const { id } = await context.params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID de transacción inválido.' }, { status: 400 });
    }

    const body = await request.json();
    const { voidReason } = body;

    if (!voidReason || typeof voidReason !== 'string' || voidReason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Por favor indique un motivo de anulación detallado (mínimo 5 caracteres).' },
        { status: 400 }
      );
    }

    const docRef = db.collection(FIRESTORE_COLLECTIONS.FINANCIAL_TRANSACTIONS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'La transacción financiera no fue encontrada.' },
        { status: 404 }
      );
    }

    const currentData = docSnap.data();
    if (currentData?.status === 'voided') {
      return NextResponse.json(
        { error: 'Esta transacción ya se encuentra anulada previamente.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const updateData = {
      status: 'voided',
      voidReason: voidReason.trim().substring(0, 300),
      voidedAt: nowIso,
      voidedByUid: authResult.uid || 'admin',
      voidedByName: authResult.displayName || 'Administrador Pastoral',
      voidedByEmail: authResult.email || 'admin@renacerchurch.org',
      updatedAt: nowIso,
    };

    await docRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Transacción anulada correctamente. Ya no se contabilizará en los balances activos.',
      transaction: { ...currentData, ...updateData, id },
    });
  } catch (err: unknown) {
    console.error('[API /admin/finances/transactions/[id]/void] Error:', err);
    return NextResponse.json(
      { error: 'Error al anular la transacción financiera.' },
      { status: 500 }
    );
  }
}
