/**
 * FAMA — Endpoint de Estadísticas Reales del Panel Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 * Obtiene métricas reales y agregadas directamente desde Cloud Firestore.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

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
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const todayIso = new Date().toISOString().split('T')[0];

    // Consultas en paralelo para óptima velocidad
    const [
      usersSnap,
      groupAppsPendingSnap,
      minAppsPendingSnap,
      eventsSnap,
      contactsNewSnap,
      contactsTotalSnap,
      prayersSnap,
      liveCultoSnap,
      nextCultoSnap,
    ] = await Promise.all([
      // 1. Todos los usuarios
      db.collection(FIRESTORE_COLLECTIONS.USERS).get(),

      // 2. Solicitudes de Grupos Pendientes
      db
        .collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS)
        .where('status', '==', 'pending')
        .get(),

      // 3. Solicitudes de Ministerios Pendientes
      db
        .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
        .where('status', '==', 'pending')
        .get(),

      // 4. Eventos
      db
        .collection(FIRESTORE_COLLECTIONS.EVENTS)
        .where('status', '==', 'published')
        .get(),

      // 5. Mensajes de Contacto Nuevos
      db
        .collection(FIRESTORE_COLLECTIONS.CONTACTS)
        .where('status', '==', 'new')
        .get(),

      // 6. Total de Mensajes de Contacto
      db.collection(FIRESTORE_COLLECTIONS.CONTACTS).get(),

      // 7. Peticiones de Oración
      db.collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS).get(),

      // 8. Culto en Vivo activo
      db
        .collection(FIRESTORE_COLLECTIONS.CULTOS)
        .where('status', '==', 'en_vivo')
        .limit(1)
        .get(),

      // 9. Próximo Culto programado
      db
        .collection(FIRESTORE_COLLECTIONS.CULTOS)
        .where('status', '==', 'programado')
        .orderBy('scheduledStartTime', 'asc')
        .limit(1)
        .get(),
    ]);

    // Procesar usuarios y roles
    let totalMembers = 0;
    let newMembersLast30Days = 0;
    const rolesCount: Record<string, number> = {
      admin: 0,
      pastor: 0,
      leader: 0,
      member: 0,
      guest: 0,
    };

    usersSnap.forEach((doc) => {
      totalMembers++;
      const data = doc.data();
      const role = data.role || 'member';
      rolesCount[role] = (rolesCount[role] || 0) + 1;

      if (data.joinedAt && data.joinedAt >= thirtyDaysAgoIso) {
        newMembersLast30Days++;
      }
    });

    // Procesar eventos próximos y asistentes
    interface EventSummary {
      id: string;
      title: string;
      date: string;
      registeredCount: number;
      capacity?: number;
      modality: string;
    }

    const upcomingEvents: EventSummary[] = [];
    let totalRegisteredInUpcoming = 0;

    eventsSnap.forEach((doc) => {
      const data = doc.data();
      const eventDate = data.date || '';
      const registered = typeof data.registeredCount === 'number' ? data.registeredCount : 0;

      // Filtrar eventos de hoy en adelante
      if (eventDate >= todayIso) {
        upcomingEvents.push({
          id: doc.id,
          title: data.title || 'Evento Congregacional',
          date: eventDate,
          registeredCount: registered,
          capacity: data.capacity,
          modality: data.modality || 'presencial',
        });
        totalRegisteredInUpcoming += registered;
      }
    });

    upcomingEvents.sort((a, b) => (a.date > b.date ? 1 : -1));

    // Culto en vivo o próximo
    let activeCultoInfo: { id: string; title: string; status: string } | null = null;
    if (!liveCultoSnap.empty) {
      const d = liveCultoSnap.docs[0];
      activeCultoInfo = { id: d.id, title: d.data().title, status: 'en_vivo' };
    } else if (!nextCultoSnap.empty) {
      const d = nextCultoSnap.docs[0];
      activeCultoInfo = { id: d.id, title: d.data().title, status: 'programado' };
    }

    return NextResponse.json({
      success: true,
      stats: {
        members: {
          total: totalMembers,
          newLast30Days: newMembersLast30Days,
          roles: rolesCount,
        },
        applications: {
          pendingGroups: groupAppsPendingSnap.size,
          pendingMinistries: minAppsPendingSnap.size,
          totalPending: groupAppsPendingSnap.size + minAppsPendingSnap.size,
        },
        events: {
          upcomingCount: upcomingEvents.length,
          totalRegisteredInUpcoming,
          upcomingList: upcomingEvents.slice(0, 5),
        },
        contacts: {
          newCount: contactsNewSnap.size,
          totalCount: contactsTotalSnap.size,
        },
        prayers: {
          totalCount: prayersSnap.size,
        },
        culto: activeCultoInfo,
      },
    });
  } catch (error) {
    console.error('[AdminStatsAPI] Error calculando estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del servidor.' },
      { status: 500 }
    );
  }
}
