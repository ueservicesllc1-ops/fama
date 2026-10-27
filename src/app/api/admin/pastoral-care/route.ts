/**
 * FAMA — API Administrativa de Atención Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere rol 'pastor' o 'admin' con permiso explícito 'pastoralAccess'.
 * Permite consultar, filtrar y monitorear todas las solicitudes pastorales.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyPastoralStaffRequest } from '@/lib/pastoral/pastoralAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { PastoralCareRequest } from '@/types/models';

export async function GET(request: NextRequest) {
  const authCheck = await verifyPastoralStaffRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search')?.toLowerCase().trim();

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS);

    if (typeFilter && typeFilter !== 'all') {
      query = query.where('type', '==', typeFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter);
    }

    const snap = await query.get();
    let requests: PastoralCareRequest[] = [];

    snap.forEach((doc) => {
      const data = doc.data() as PastoralCareRequest;
      requests.push({
        ...data,
        id: doc.id,
      });
    });

    // Filtro en memoria para búsqueda textual por nombre o email
    if (search) {
      requests = requests.filter((r) => {
        const nameMatch = (r.userName || '').toLowerCase().includes(search);
        const emailMatch = (r.userEmail || '').toLowerCase().includes(search);
        const reasonMatch = (r.appointmentDetails?.reason || '').toLowerCase().includes(search);
        const prayerMatch = (r.prayerDetails?.requestText || '').toLowerCase().includes(search);
        const topicMatch = (r.orientationDetails?.topic || '').toLowerCase().includes(search);
        return nameMatch || emailMatch || reasonMatch || prayerMatch || topicMatch;
      });
    }

    // Ordenar cronológicamente (más recientes primero)
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // Calcular KPIs rápidos
    const pendingCount = requests.filter((r) => r.status === 'pending').length;
    const inReviewCount = requests.filter((r) => r.status === 'in_review').length;
    const approvedCount = requests.filter((r) => r.status === 'approved').length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;

    return NextResponse.json({
      success: true,
      count: requests.length,
      stats: {
        total: requests.length,
        pending: pendingCount,
        inReview: inReviewCount,
        approved: approvedCount,
        completed: completedCount,
      },
      requests,
    });
  } catch (error: unknown) {
    console.error('[AdminPastoralAPI] Error consultando solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al consultar las solicitudes pastorales.' },
      { status: 500 }
    );
  }
}
