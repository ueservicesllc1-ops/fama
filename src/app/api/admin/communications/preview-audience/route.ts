/**
 * FAMA — Endpoint Administrativo de Cálculo y Vista Previa de Destinatarios
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 * Permite conocer con precisión el número de destinatarios y el impacto
 * de las preferencias de correo antes de confirmar un envío masivo.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserProfile, AnnouncementTarget, AnnouncementCategory } from '@/types/models';

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
      targetAudience, // 'all' | 'group' | 'ministry' | 'roles'
      targetGroupId,
      targetMinistryId,
      targetRoles,
      category = 'general',
    } = body as {
      targetAudience: AnnouncementTarget;
      targetGroupId?: string;
      targetMinistryId?: string;
      targetRoles?: string[];
      category?: AnnouncementCategory;
    };

    const eligibleUsers: UserProfile[] = [];

    if (targetAudience === 'group' && targetGroupId) {
      // Buscar miembros con solicitud aprobada en este grupo
      const appSnap = await db
        .collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS)
        .where('groupId', '==', targetGroupId)
        .where('status', '==', 'approved')
        .get();

      const userIds = new Set<string>();
      appSnap.forEach((doc) => {
        const d = doc.data();
        if (d.userId) userIds.add(d.userId);
      });

      if (userIds.size > 0) {
        // Consultar los documentos de usuario correspondientes
        const userPromises = Array.from(userIds).map((uid) =>
          db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((doc) => {
          if (doc.exists) {
            eligibleUsers.push({ ...(doc.data() as UserProfile), uid: doc.id });
          }
        });
      }
    } else if (targetAudience === 'ministry' && targetMinistryId) {
      // Buscar miembros con postulación aprobada en este ministerio
      const appSnap = await db
        .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
        .where('ministryId', '==', targetMinistryId)
        .where('status', '==', 'approved')
        .get();

      const userIds = new Set<string>();
      appSnap.forEach((doc) => {
        const d = doc.data();
        if (d.userId) userIds.add(d.userId);
      });

      if (userIds.size > 0) {
        const userPromises = Array.from(userIds).map((uid) =>
          db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get()
        );
        const userDocs = await Promise.all(userPromises);
        userDocs.forEach((doc) => {
          if (doc.exists) {
            eligibleUsers.push({ ...(doc.data() as UserProfile), uid: doc.id });
          }
        });
      }
    } else if (targetAudience === 'roles' && targetRoles && targetRoles.length > 0) {
      // Filtrar por roles
      const usersSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).get();
      usersSnap.forEach((doc) => {
        const data = doc.data() as UserProfile;
        if (targetRoles.includes(data.role)) {
          eligibleUsers.push({ ...data, uid: doc.id });
        }
      });
    } else {
      // Toda la congregación (todos los usuarios registrados)
      const usersSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).get();
      usersSnap.forEach((doc) => {
        eligibleUsers.push({ ...(doc.data() as UserProfile), uid: doc.id });
      });
    }

    // Calcular desglose de correo y preferencias
    let recipientsWithEmail = 0;
    let optedInForEmail = 0;
    let optedOutForEmail = 0;

    eligibleUsers.forEach((u) => {
      if (u.email && u.email.includes('@')) {
        recipientsWithEmail += 1;
        const prefs = u.communicationPreferences;
        let isOptedOut = false;
        if (prefs) {
          if (category === 'eventos' && prefs.emailEventReminders === false) {
            isOptedOut = true;
          } else if (category === 'ministerios' && prefs.emailMinistryAnnouncements === false) {
            isOptedOut = true;
          } else if (category === 'general' && prefs.emailGeneralNews === false) {
            isOptedOut = true;
          }
        }
        if (isOptedOut) {
          optedOutForEmail += 1;
        } else {
          optedInForEmail += 1;
        }
      }
    });

    const previewNames = eligibleUsers
      .slice(0, 6)
      .map((u) => u.displayName || u.email || 'Miembro');

    return NextResponse.json({
      success: true,
      totalMatchedMembers: eligibleUsers.length,
      recipientsWithEmail,
      optedInForEmail,
      optedOutForEmail,
      previewNames,
    });
  } catch (error: unknown) {
    console.error('Error al calcular vista previa de destinatarios:', error);
    return NextResponse.json(
      { error: 'Error al calcular la audiencia en el servidor.' },
      { status: 500 }
    );
  }
}
