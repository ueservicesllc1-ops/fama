/**
 * FAMA — API de Voluntarios por Ministerio y Disponibilidad
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Permite a los coordinadores autorizados consultar los voluntarios del ministerio,
 * verificar su disponibilidad, asignar funciones y activar/desactivar su estado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyCoordinatorRequest } from '@/lib/volunteers/volunteerAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { MinistryVolunteer, MinistryApplication } from '@/types/models';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ministryId = searchParams.get('ministryId') || undefined;

  const authCheck = await verifyCoordinatorRequest(request, ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    // 1. Consultar voluntarios registrados en ministry_volunteers
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.MINISTRY_VOLUNTEERS);
    if (ministryId) {
      query = query.where('ministryId', '==', ministryId);
    } else if (!authCheck.isOverallAdmin) {
      if (authCheck.authorizedMinistries.length > 0) {
        query = query.where('ministryId', 'in', authCheck.authorizedMinistries.slice(0, 10));
      } else {
        return NextResponse.json({ success: true, count: 0, volunteers: [] });
      }
    }

    const snap = await query.get();
    const volunteers: MinistryVolunteer[] = [];
    const registeredUserIds = new Set<string>();

    snap.forEach((doc) => {
      const v = { id: doc.id, ...doc.data() } as MinistryVolunteer;
      volunteers.push(v);
      registeredUserIds.add(v.userId);
    });

    // 2. Incorporar también miembros con solicitudes aprobadas (ministry_applications) que aún no estén en ministry_volunteers
    let appQuery: FirebaseFirestore.Query = db
      .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
      .where('status', '==', 'approved');

    if (ministryId) {
      appQuery = appQuery.where('ministryId', '==', ministryId);
    }

    const appSnap = await appQuery.get();
    for (const appDoc of appSnap.docs) {
      const app = appDoc.data() as MinistryApplication;
      if (!registeredUserIds.has(app.userId)) {
        // Consultar disponibilidad del usuario
        const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(app.userId).get();
        const userData = userDoc.data();

        const v: MinistryVolunteer = {
          id: `${app.ministryId}_${app.userId}`,
          ministryId: app.ministryId,
          ministryName: app.ministryName,
          userId: app.userId,
          userName: app.userName,
          userEmail: app.userEmail,
          userPhone: app.userPhone,
          roles: ['voluntario_general'],
          status: 'active',
          joinedAt: app.createdAt,
          availability: userData?.volunteerAvailability,
        };
        volunteers.push(v);
        registeredUserIds.add(app.userId);
      }
    }

    return NextResponse.json({
      success: true,
      count: volunteers.length,
      volunteers,
    });
  } catch (error: unknown) {
    console.error('[AdminRosterAPI] Error consultando voluntarios:', error);
    return NextResponse.json({ error: 'Error al consultar equipo de voluntarios.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ministryId, volunteerId, status, roles } = body;

  if (!ministryId || !volunteerId) {
    return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
  }

  const authCheck = await verifyCoordinatorRequest(request, ministryId);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const docRef = db.collection(FIRESTORE_COLLECTIONS.MINISTRY_VOLUNTEERS).doc(volunteerId);
    const updates: Partial<MinistryVolunteer> & Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (['active', 'inactive', 'paused'].includes(status)) {
      updates.status = status;
    }

    if (Array.isArray(roles)) {
      updates.roles = roles;
    }

    await docRef.set(updates, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Ficha de voluntario actualizada correctamente.',
    });
  } catch (error: unknown) {
    console.error('[AdminRosterPatchAPI] Error actualizando voluntario:', error);
    return NextResponse.json({ error: 'Error al actualizar voluntario.' }, { status: 500 });
  }
}
