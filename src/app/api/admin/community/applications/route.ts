/**
 * FAMA — Endpoint Administrativo de Solicitudes de Comunidad (Grupos y Ministerios)
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { GroupApplication, MinistryApplication } from '@/types/models';

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const typeFilter = searchParams.get('type') || 'all'; // 'all' | 'group' | 'ministry'
  const statusFilter = searchParams.get('status') || 'all'; // 'all' | 'pending' | 'approved' | 'rejected'

  try {
    const groupApps: (GroupApplication & { appType: 'group' })[] = [];
    const minApps: (MinistryApplication & { appType: 'ministry' })[] = [];

    if (typeFilter === 'all' || typeFilter === 'group') {
      let gQuery: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS);
      if (statusFilter !== 'all') {
        gQuery = gQuery.where('status', '==', statusFilter);
      }
      const gSnap = await gQuery.get();
      gSnap.forEach((d) => groupApps.push({ id: d.id, ...d.data(), appType: 'group' } as GroupApplication & { appType: 'group' }));
    }

    if (typeFilter === 'all' || typeFilter === 'ministry') {
      let mQuery: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS);
      if (statusFilter !== 'all') {
        mQuery = mQuery.where('status', '==', statusFilter);
      }
      const mSnap = await mQuery.get();
      mSnap.forEach((d) => minApps.push({ id: d.id, ...d.data(), appType: 'ministry' } as MinistryApplication & { appType: 'ministry' }));
    }

    const all = [...groupApps, ...minApps].sort((a, b) =>
      (b.createdAt || '').localeCompare(a.createdAt || '')
    );

    return NextResponse.json({
      success: true,
      applications: all,
      counts: {
        total: all.length,
        pending: all.filter((a) => a.status === 'pending').length,
        approved: all.filter((a) => a.status === 'approved').length,
        rejected: all.filter((a) => a.status === 'rejected').length,
      },
    });
  } catch (error) {
    console.error('[AdminApplicationsAPI] Error consultando solicitudes:', error);
    return NextResponse.json({ error: 'Error al consultar solicitudes.' }, { status: 500 });
  }
}
