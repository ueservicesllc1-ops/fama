/**
 * FAMA — Endpoint Administrativo para Actualizar y Completar Seguimiento Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { PastoralFollowUp } from '@/types/models';

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
    const followUpRef = db.collection(FIRESTORE_COLLECTIONS.PASTORAL_FOLLOWUPS).doc(id);
    const snap = await followUpRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: 'El registro de seguimiento no existe.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const nowIso = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      updatedByUid: authCheck.uid || 'admin',
      updatedByName: authCheck.displayName || 'Pastor',
      updatedAt: nowIso,
    };

    if (body.status && ['pending', 'completed', 'cancelled'].includes(body.status)) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completedAt = nowIso;
        updateData.completedByUid = authCheck.uid || 'admin';
        updateData.completedByName = authCheck.displayName || 'Pastor';
      }
    }

    if (body.pastoralNotes && typeof body.pastoralNotes === 'string') {
      updateData.pastoralNotes = body.pastoralNotes.trim();
    }

    if (body.nextStep !== undefined) {
      updateData.nextStep = body.nextStep ? String(body.nextStep).trim() : null;
    }

    if (body.nextStepDueDate !== undefined) {
      updateData.nextStepDueDate = body.nextStepDueDate || null;
    }

    await followUpRef.update(updateData);
    const updatedSnap = await followUpRef.get();

    return NextResponse.json({
      success: true,
      message: 'Seguimiento pastoral actualizado correctamente.',
      followUp: { ...(updatedSnap.data() as PastoralFollowUp), id: updatedSnap.id },
    });
  } catch (error: unknown) {
    console.error('Error al actualizar seguimiento pastoral:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el seguimiento en Firestore.' },
      { status: 500 }
    );
  }
}
