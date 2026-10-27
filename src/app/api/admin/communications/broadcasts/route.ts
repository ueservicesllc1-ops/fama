/**
 * FAMA — Endpoint Administrativo de Historial y Auditoría de Envíos de Correo
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { EmailBroadcastLog } from '@/types/models';

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.EMAIL_BROADCASTS)
      .orderBy('startedAt', 'desc')
      .limit(50)
      .get();

    const broadcasts: EmailBroadcastLog[] = [];
    snap.forEach((doc) => {
      broadcasts.push({ ...(doc.data() as EmailBroadcastLog), id: doc.id });
    });

    return NextResponse.json({
      success: true,
      count: broadcasts.length,
      broadcasts,
    });
  } catch (error: unknown) {
    console.error('Error al consultar historial de envíos de correo:', error);
    return NextResponse.json(
      { error: 'Error al consultar historial de envíos en Firestore.' },
      { status: 500 }
    );
  }
}
