/**
 * FAMA — Actualización de Disponibilidad del Voluntario
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 * Permite al miembro registrar y actualizar sus días, franjas y preferencias de servicio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { VolunteerAvailability } from '@/types/models';

export async function PUT(request: NextRequest) {
  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const availability: VolunteerAvailability = {
      daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek : ['domingo'],
      timeSlots: Array.isArray(body.timeSlots) ? body.timeSlots : ['manana'],
      frequency: ['semanal', 'quincenal', 'mensual', 'ocasional'].includes(body.frequency)
        ? body.frequency
        : 'semanal',
      unavailableDates: Array.isArray(body.unavailableDates) ? body.unavailableDates : [],
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '',
    };

    // Actualizar en el perfil del usuario
    await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(authCheck.uid).set(
      {
        volunteerAvailability: availability,
        lastActiveAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Disponibilidad de servicio actualizada correctamente.',
      availability,
    });
  } catch (error: unknown) {
    console.error('[VolunteerAvailabilityAPI] Error actualizando disponibilidad:', error);
    return NextResponse.json(
      { error: 'Error al actualizar disponibilidad de servicio.' },
      { status: 500 }
    );
  }
}
