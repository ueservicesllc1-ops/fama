/**
 * FAMA — Endpoint Seguro de Actividad del Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Agrupa todas las solicitudes a grupos, ministerios, inscripciones a eventos
 * y peticiones de oración asociadas exclusivamente al miembro autenticado.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  GroupApplication,
  MinistryApplication,
  EventRegistration,
} from '@/types/models';
import { RealPrayerRequest } from '@/lib/firebase/services/prayerService';

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
    const email = decoded.email ? decoded.email.trim().toLowerCase() : null;

    // Consultas en paralelo para óptimo rendimiento
    const [groupSnap, minSnap, eventUserSnap, prayerSnap] = await Promise.all([
      // 1. Solicitudes de Grupos de Conexión
      db
        .collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS)
        .where('userId', '==', uid)
        .get(),

      // 2. Postulaciones a Ministerios
      db
        .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
        .where('userId', '==', uid)
        .get(),

      // 3. Inscripciones a Eventos por UID
      db
        .collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS)
        .where('userId', '==', uid)
        .get(),

      // 4. Peticiones de Oración publicadas por el usuario
      db
        .collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS)
        .where('userId', '==', uid)
        .get(),
    ]);

    const groups: GroupApplication[] = [];
    groupSnap.forEach((d) => groups.push({ id: d.id, ...d.data() } as GroupApplication));
    groups.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const ministries: MinistryApplication[] = [];
    minSnap.forEach((d) => ministries.push({ id: d.id, ...d.data() } as MinistryApplication));
    ministries.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

    const eventMap = new Map<string, EventRegistration>();
    eventUserSnap.forEach((d) => {
      eventMap.set(d.id, { id: d.id, ...d.data() } as EventRegistration);
    });

    // Si tiene correo, buscar también inscripciones hechas con su correo
    if (email) {
      const eventEmailSnap = await db
        .collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS)
        .where('email', '==', email)
        .get();

      eventEmailSnap.forEach((d) => {
        if (!eventMap.has(d.id)) {
          eventMap.set(d.id, { id: d.id, ...d.data() } as EventRegistration);
        }
      });
    }

    const events = Array.from(eventMap.values());
    events.sort((a, b) => {
      const dateA = a.registeredAt || a.createdAt || '';
      const dateB = b.registeredAt || b.createdAt || '';
      return dateB > dateA ? 1 : -1;
    });

    const prayers: RealPrayerRequest[] = [];
    prayerSnap.forEach((d) => {
      const data = d.data();
      prayers.push({
        id: d.id,
        userId: data.userId,
        authorName: data.authorName,
        isAnonymous: data.isAnonymous,
        category: data.category,
        requestText: data.requestText,
        prayersCount: data.prayersCount || 0,
        prayedByUsers: data.prayedByUsers || [],
        createdAt: data.createdAt,
      });
    });

    return NextResponse.json({
      success: true,
      groups,
      ministries,
      events,
      prayers,
    });
  } catch (err) {
    console.warn('[MemberActivityAPI] Error consultando actividad:', err);
    return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 });
  }
}
