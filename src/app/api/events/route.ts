/**
 * FAMA — Endpoint Público de Eventos Congregacionales
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ChurchEvent } from '@/types/models';

export async function GET(request: NextRequest) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ success: true, events: [] });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.EVENTS)
      .where('status', '==', 'published')
      .get();

    const events: ChurchEvent[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        title: data.title || '',
        category: data.category || 'Comunidad',
        date: data.date || '',
        time: data.time || '',
        location: data.location || 'Sede RENACER',
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

    // Ordenar cronológicamente si es posible
    events.sort((a, b) => {
      return (a.date || '').localeCompare(b.date || '');
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.warn('[EventsAPI] Error consultando eventos públicos:', error);
    return NextResponse.json({ success: true, events: [] });
  }
}
