/**
 * FAMA — Endpoint Administrativo de Eventos Congregacionales
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ChurchEvent } from '@/types/models';

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
    const snap = await db.collection(FIRESTORE_COLLECTIONS.EVENTS).get();
    const events: ChurchEvent[] = [];

    snap.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        title: data.title || '',
        category: data.category || 'Comunidad',
        date: data.date || '',
        time: data.time || '',
        location: data.location || '',
        isOnline: Boolean(data.isOnline),
        modality: data.modality || (data.isOnline ? 'hibrido' : 'presencial'),
        description: data.description || '',
        speaker: data.speaker || '',
        imageUrl: data.imageUrl || '',
        capacity: typeof data.capacity === 'number' ? data.capacity : undefined,
        registeredCount: typeof data.registeredCount === 'number' ? data.registeredCount : 0,
        registrationRequired: Boolean(data.registrationRequired || data.allowsRegistration),
        allowsRegistration: data.allowsRegistration !== false,
        status: data.status || 'published',
        featured: Boolean(data.featured),
        createdAt: data.createdAt,
      });
    });

    // Ordenar de más reciente a más antiguo por fecha de creación o de evento
    events.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error('[AdminEventsAPI] Error consultando eventos:', error);
    return NextResponse.json({ error: 'Error al consultar eventos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      title,
      category = 'Comunidad',
      date,
      time = '',
      location = 'Auditorio Central RENACER',
      modality = 'presencial',
      description = '',
      speaker = '',
      imageUrl = '',
      capacity,
      allowsRegistration = true,
      status = 'published',
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'El nombre del evento debe tener al menos 3 caracteres.' }, { status: 400 });
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Debes indicar una fecha válida para el evento.' }, { status: 400 });
    }

    const docRef = db.collection(FIRESTORE_COLLECTIONS.EVENTS).doc();
    const nowIso = new Date().toISOString();

    const newEvent: ChurchEvent = {
      id: docRef.id,
      title: title.trim(),
      category,
      date: date.trim(),
      time: time.trim(),
      location: location.trim(),
      isOnline: modality === 'virtual' || modality === 'hibrido',
      modality,
      description: description.trim(),
      speaker: speaker.trim(),
      imageUrl: imageUrl.trim() || undefined,
      capacity: capacity ? Number(capacity) : undefined,
      registeredCount: 0,
      registrationRequired: Boolean(allowsRegistration),
      allowsRegistration: Boolean(allowsRegistration),
      status,
      createdAt: nowIso,
    };

    await docRef.set(newEvent);

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error) {
    console.error('[AdminEventsAPI] Error creando evento:', error);
    return NextResponse.json({ error: 'Error al crear evento.' }, { status: 500 });
  }
}
