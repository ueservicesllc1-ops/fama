/**
 * FAMA — Endpoint Público de Contenidos Congregacionales
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Utiliza Firebase Admin SDK en el servidor para servir datos públicos de
 * cultos, grabaciones, eventos, galerías y ministerios de forma segura y fiable,
 * evitando errores de permisos restrictivos en el SDK del navegador.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({
      success: true,
      culto: null,
      recordings: [],
      events: [],
      galleries: [],
      groups: [],
      ministries: [],
    });
  }

  try {
    const result: Record<string, unknown> = { success: true };

    // 1. Culto en vivo o próximo programado
    if (type === 'all' || type === 'culto') {
      try {
        const liveSnap = await db
          .collection(FIRESTORE_COLLECTIONS.CULTOS)
          .where('status', '==', 'en_vivo')
          .limit(1)
          .get();

        if (!liveSnap.empty) {
          const doc = liveSnap.docs[0];
          result.culto = { id: doc.id, ...doc.data() };
        } else {
          const upSnap = await db
            .collection(FIRESTORE_COLLECTIONS.CULTOS)
            .where('status', '==', 'programado')
            .orderBy('scheduledStartTime', 'asc')
            .limit(1)
            .get();

          if (!upSnap.empty) {
            const doc = upSnap.docs[0];
            result.culto = { id: doc.id, ...doc.data() };
          } else {
            result.culto = null;
          }
        }
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando cultos:', err);
        result.culto = null;
      }
    }

    // 2. Grabaciones
    if (type === 'all' || type === 'recordings') {
      try {
        const snap = await db
          .collection(FIRESTORE_COLLECTIONS.RECORDINGS)
          .orderBy('date', 'desc')
          .limit(50)
          .get();

        const recordings: Record<string, unknown>[] = [];
        snap.forEach((d) => recordings.push({ id: d.id, ...d.data() }));
        result.recordings = recordings;
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando grabaciones:', err);
        result.recordings = [];
      }
    }

    // 3. Eventos
    if (type === 'all' || type === 'events') {
      try {
        const snap = await db
          .collection(FIRESTORE_COLLECTIONS.EVENTS)
          .orderBy('date', 'asc')
          .limit(30)
          .get();

        const events: Record<string, unknown>[] = [];
        snap.forEach((d) => events.push({ id: d.id, ...d.data() }));
        result.events = events;
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando eventos:', err);
        result.events = [];
      }
    }

    // 4. Galerías
    if (type === 'all' || type === 'galleries') {
      try {
        const snap = await db
          .collection(FIRESTORE_COLLECTIONS.GALLERIES)
          .orderBy('date', 'desc')
          .limit(20)
          .get();

        const galleries: Record<string, unknown>[] = [];
        snap.forEach((d) => galleries.push({ id: d.id, ...d.data() }));
        result.galleries = galleries;
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando galerías:', err);
        result.galleries = [];
      }
    }

    // 5. Grupos de Comunidad
    if (type === 'all' || type === 'groups') {
      try {
        const snap = await db.collection(FIRESTORE_COLLECTIONS.GROUPS).limit(30).get();
        const groups: Record<string, unknown>[] = [];
        snap.forEach((d) => groups.push({ id: d.id, ...d.data() }));
        result.groups = groups;
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando grupos:', err);
        result.groups = [];
      }
    }

    // 6. Ministerios
    if (type === 'all' || type === 'ministries') {
      try {
        const snap = await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).limit(30).get();
        const ministries: Record<string, unknown>[] = [];
        snap.forEach((d) => ministries.push({ id: d.id, ...d.data() }));
        result.ministries = ministries;
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando ministerios:', err);
        result.ministries = [];
      }
    }

    // 7. Peticiones de Oración
    if (type === 'all' || type === 'prayers') {
      try {
        const snap = await db
          .collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS)
          .orderBy('createdAt', 'desc')
          .limit(40)
          .get();
        const prayers: Record<string, unknown>[] = [];
        snap.forEach((d) => prayers.push({ id: d.id, ...d.data() }));
        result.prayers = prayers;
      } catch (err) {
        console.warn('[PublicContentAPI] Error consultando oraciones:', err);
        result.prayers = [];
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.warn('[PublicContentAPI] Error general:', error);
    return NextResponse.json({
      success: true,
      culto: null,
      recordings: [],
      events: [],
      galleries: [],
      groups: [],
      ministries: [],
      prayers: [],
    });
  }
}
