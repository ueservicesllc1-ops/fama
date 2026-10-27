/**
 * FAMA — Endpoint Seguro de Preferencias de Comunicación del Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Permite al miembro gestionar la recepción de correos opcionales
 * (recordatorios de eventos, avisos de ministerios y boletines generales).
 * Las notificaciones críticas de seguridad y confirmaciones de cuenta permanecen siempre activas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserCommunicationPreferences, UserProfile } from '@/types/models';

const DEFAULT_PREFERENCES: UserCommunicationPreferences = {
  emailEventReminders: true,
  emailMinistryAnnouncements: true,
  emailGeneralNews: true,
};

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
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(authCheck.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({
        success: true,
        preferences: DEFAULT_PREFERENCES,
      });
    }

    const userData = userDoc.data() as UserProfile;
    const preferences: UserCommunicationPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(userData.communicationPreferences || {}),
    };

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: unknown) {
    console.error('Error al obtener preferencias de comunicación:', error);
    return NextResponse.json(
      { error: 'Error al consultar preferencias en Firestore.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const nowIso = new Date().toISOString();

    const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(authCheck.uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Usuario no registrado.' }, { status: 404 });
    }

    const currentData = snap.data() as UserProfile;
    const currentPrefs = currentData.communicationPreferences || DEFAULT_PREFERENCES;

    const updatedPrefs: UserCommunicationPreferences = {
      emailEventReminders:
        typeof body.emailEventReminders === 'boolean'
          ? body.emailEventReminders
          : currentPrefs.emailEventReminders,
      emailMinistryAnnouncements:
        typeof body.emailMinistryAnnouncements === 'boolean'
          ? body.emailMinistryAnnouncements
          : currentPrefs.emailMinistryAnnouncements,
      emailGeneralNews:
        typeof body.emailGeneralNews === 'boolean'
          ? body.emailGeneralNews
          : currentPrefs.emailGeneralNews,
      updatedAt: nowIso,
    };

    await userRef.update({
      communicationPreferences: updatedPrefs,
      updatedAt: nowIso,
    });

    return NextResponse.json({
      success: true,
      message: 'Preferencias de comunicación actualizadas con éxito.',
      preferences: updatedPrefs,
    });
  } catch (error: unknown) {
    console.error('Error al actualizar preferencias de comunicación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar preferencias en Firestore.' },
      { status: 500 }
    );
  }
}
