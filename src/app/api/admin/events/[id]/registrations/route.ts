/**
 * FAMA — Endpoint Administrativo de Inscripciones de un Evento
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { EventRegistration } from '@/types/models';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID de evento requerido.' }, { status: 400 });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS)
      .where('eventId', '==', id)
      .get();

    const registrations: EventRegistration[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      registrations.push({
        id: doc.id,
        eventId: data.eventId,
        eventTitle: data.eventTitle || '',
        eventDate: data.eventDate,
        userId: data.userId,
        name: data.name || '',
        email: data.email || '',
        phone: data.phone,
        attendeesCount: data.attendeesCount || 1,
        status: data.status || 'confirmed',
        createdAt: data.createdAt || '',
        confirmationEmailStatus: data.confirmationEmailStatus,
        confirmationEmailError: data.confirmationEmailError,
      });
    });

    registrations.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json({ success: true, registrations });
  } catch (error) {
    console.error('[AdminEventRegistrationsAPI] Error consultando inscripciones:', error);
    return NextResponse.json({ error: 'Error al consultar inscripciones.' }, { status: 500 });
  }
}
