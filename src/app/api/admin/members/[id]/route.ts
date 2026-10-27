/**
 * FAMA — Endpoint Administrativo de Detalle y Edición de Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserProfile, UserRole } from '@/types/models';

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
    return NextResponse.json({ error: 'ID de miembro requerido.' }, { status: 400 });
  }

  try {
    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(id).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
    }

    const profile = userDoc.data() as UserProfile;

    // Obtener historial de solicitudes e inscripciones del miembro
    const [groupsSnap, ministriesSnap, eventsSnap] = await Promise.all([
      db
        .collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS)
        .where('userId', '==', id)
        .get(),
      db
        .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
        .where('userId', '==', id)
        .get(),
      db
        .collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS)
        .where('userId', '==', id)
        .get(),
    ]);

    const activitySummary = {
      groupsCount: groupsSnap.size,
      ministriesCount: ministriesSnap.size,
      eventsCount: eventsSnap.size,
    };

    return NextResponse.json({
      success: true,
      member: { id: userDoc.id, ...profile },
      activitySummary,
    });
  } catch (error) {
    console.error('[AdminMemberDetailAPI] Error consultando miembro:', error);
    return NextResponse.json(
      { error: 'Error al consultar datos del miembro.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  const auth = getAdminAuth();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID de miembro requerido.' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(id);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Miembro no encontrado.' }, { status: 404 });
    }

    const updates: Partial<UserProfile> & Record<string, unknown> = {
      lastActiveAt: new Date().toISOString(),
      lastAdminEditBy: authCheck.email || authCheck.uid || 'admin',
      lastAdminEditAt: new Date().toISOString(),
    };

    // 1. Asignación de Rol (solo roles institucionales válidos)
    if (typeof body.role === 'string') {
      const validRoles: UserRole[] = ['member', 'leader', 'pastor', 'admin', 'guest'];
      if (!validRoles.includes(body.role as UserRole)) {
        return NextResponse.json({ error: 'Rol no válido.' }, { status: 400 });
      }
      updates.role = body.role as UserRole;

      // Sincronizar Custom Claim en Firebase Auth si está disponible
      if (auth) {
        try {
          await auth.setCustomUserClaims(id, { role: updates.role });
        } catch (claimErr) {
          console.warn('[AdminMemberAPI] Advertencia asignando Custom Claims:', claimErr);
        }
      }
    }

    if (typeof body.campus === 'string') {
      const validCampuses = ['virtual', 'central', 'ambos'];
      if (validCampuses.includes(body.campus)) {
        updates.campus = body.campus;
      }
    }

    if (typeof body.phone === 'string') {
      updates.phone = body.phone.trim().slice(0, 30);
    }

    if (typeof body.displayName === 'string' && body.displayName.trim().length > 0) {
      updates.displayName = body.displayName.trim().slice(0, 80);
    }

    if (typeof body.bio === 'string') {
      updates.bio = body.bio.trim().slice(0, 500);
    }

    if (typeof body.pastoralAccess === 'boolean') {
      updates.pastoralAccess = body.pastoralAccess;
    }

    await userRef.set(updates, { merge: true });

    const updatedDoc = await userRef.get();
    return NextResponse.json({
      success: true,
      message: 'Ficha del miembro actualizada correctamente.',
      member: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('[AdminMemberEditAPI] Error actualizando miembro:', error);
    return NextResponse.json(
      { error: 'Error al actualizar datos del miembro.' },
      { status: 500 }
    );
  }
}
