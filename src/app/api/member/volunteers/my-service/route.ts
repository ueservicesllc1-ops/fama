/**
 * FAMA — Endpoint Seguro del Portal del Voluntario («Mi Servicio»)
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Requiere autenticación de miembro.
 * Estricto aislamiento por usuario: el miembro solo consulta sus asignaciones,
 * ministerios donde participa y su propia disponibilidad.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  ServiceAssignment,
  Ministry,
  MinistryApplication,
  VolunteerAvailability,
} from '@/types/models';

export async function GET(request: NextRequest) {
  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Consultar asignaciones de servicio del miembro autenticado
    const assignmentsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.SERVICE_ASSIGNMENTS)
      .where('volunteerUid', '==', authCheck.uid)
      .get();

    const allAssignments: ServiceAssignment[] = [];
    assignmentsSnap.forEach((doc) => {
      allAssignments.push({ id: doc.id, ...doc.data() } as ServiceAssignment);
    });

    // Separar en Próximas Asignaciones y Participaciones Pasadas / Historial
    const upcomingAssignments = allAssignments
      .filter((a) => a.date >= today && a.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

    const historyAssignments = allAssignments
      .filter((a) => a.date < today || a.status === 'completed' || a.status === 'cancelled')
      .sort((a, b) => b.date.localeCompare(a.date));

    // 2. Consultar ministerios en los que participa el miembro
    // Basado en solicitudes aprobadas y/o registro de voluntarios
    const approvedAppsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
      .where('userId', '==', authCheck.uid)
      .where('status', '==', 'approved')
      .get();

    const approvedMinistryIds = new Set<string>();
    const myApplications: MinistryApplication[] = [];
    approvedAppsSnap.forEach((doc) => {
      const data = doc.data() as MinistryApplication;
      approvedMinistryIds.add(data.ministryId);
      myApplications.push({ ...data, id: doc.id });
    });

    // Consultar todos los ministerios aprobados para obtener detalles
    const ministriesSnap = await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).get();
    const myMinistries: Ministry[] = [];
    const availableMinistriesToJoin: Ministry[] = [];

    ministriesSnap.forEach((doc) => {
      const m = { id: doc.id, ...doc.data() } as Ministry;
      if (
        approvedMinistryIds.has(doc.id) ||
        m.leaderUid === authCheck.uid ||
        (Array.isArray(m.coordinators) && m.coordinators.includes(authCheck.uid!))
      ) {
        myMinistries.push(m);
      } else {
        availableMinistriesToJoin.push(m);
      }
    });

    // 3. Consultar disponibilidad registrada en el perfil del usuario
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(authCheck.uid).get();
    const availability: VolunteerAvailability = userDoc.data()?.volunteerAvailability || {
      daysOfWeek: ['domingo'],
      timeSlots: ['manana'],
      frequency: 'semanal',
      notes: '',
    };

    return NextResponse.json({
      success: true,
      upcomingAssignments,
      historyAssignments,
      myMinistries,
      availableMinistriesToJoin,
      availability,
      stats: {
        totalUpcoming: upcomingAssignments.length,
        pendingConfirmation: upcomingAssignments.filter(
          (a) => a.status === 'pending_confirmation'
        ).length,
        totalCompleted: historyAssignments.filter((a) => a.attended || a.status === 'completed')
          .length,
      },
    });
  } catch (error: unknown) {
    console.error('[MemberMyServiceAPI] Error consultando servicio:', error);
    return NextResponse.json(
      { error: 'Error al consultar información de servicio del voluntario.' },
      { status: 500 }
    );
  }
}
