/**
 * FAMA — Consultar Solicitudes Propias del Miembro Autenticado
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { GroupApplication, MinistryApplication } from '@/types/models';

export async function GET(request: NextRequest) {
  const auth = getAdminAuth();
  const db = getAdminFirestore();

  if (!auth || !db) {
    return NextResponse.json({ error: 'Servidor no disponible.' }, { status: 500 });
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Sesión no proporcionada.' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Token no válido.' }, { status: 401 });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    // 1. Grupos
    const groupSnap = await db
      .collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS)
      .where('userId', '==', uid)
      .get();

    const groupApplications: GroupApplication[] = [];
    groupSnap.forEach((d) => groupApplications.push({ id: d.id, ...d.data() } as GroupApplication));

    // 2. Ministerios
    const minSnap = await db
      .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
      .where('userId', '==', uid)
      .get();

    const ministryApplications: MinistryApplication[] = [];
    minSnap.forEach((d) => ministryApplications.push({ id: d.id, ...d.data() } as MinistryApplication));

    return NextResponse.json({
      success: true,
      groupApplications,
      ministryApplications,
    });
  } catch {
    return NextResponse.json({ error: 'Token inválido o expirado.' }, { status: 401 });
  }
}
