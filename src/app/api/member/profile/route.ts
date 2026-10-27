/**
 * FAMA — Endpoint Seguro de Gestión de Perfil de Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Valida la identidad exclusivamente mediante Firebase Authentication ID Token.
 * Impide estrictamente que un usuario modifique su rol, privilegios, email o fecha de registro.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserProfile } from '@/types/models';

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

    const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    const snap = await userRef.get();

    if (!snap.exists) {
      // Perfil base si no existe aún
      const baseProfile: UserProfile = {
        uid,
        email: decoded.email || '',
        displayName: decoded.name || decoded.email?.split('@')[0] || 'Miembro FAMA',
        photoURL: decoded.picture || undefined,
        role: 'member',
        campus: 'virtual',
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        isOnline: true,
      };
      await userRef.set(baseProfile);
      return NextResponse.json({ success: true, profile: baseProfile });
    }

    const data = snap.data() as UserProfile;
    return NextResponse.json({ success: true, profile: data });
  } catch {
    return NextResponse.json({ error: 'Token inválido o sesión expirada.' }, { status: 401 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json();

    // 1. Campos estrictamente permitidos para edición del miembro
    const updates: Partial<UserProfile> = {
      lastActiveAt: new Date().toISOString(),
    };

    if (typeof body.firstName === 'string') {
      updates.firstName = body.firstName.trim().slice(0, 50);
    }
    if (typeof body.lastName === 'string') {
      updates.lastName = body.lastName.trim().slice(0, 50);
    }

    // Nombre para mostrar
    if (typeof body.displayName === 'string' && body.displayName.trim().length > 0) {
      updates.displayName = body.displayName.trim().slice(0, 80);
    } else if (updates.firstName || updates.lastName) {
      updates.displayName = `${updates.firstName || ''} ${updates.lastName || ''}`.trim().slice(0, 80);
    }

    if (typeof body.phone === 'string') {
      updates.phone = body.phone.trim().slice(0, 30);
    }

    // Validación de fecha de nacimiento (YYYY-MM-DD opcional)
    if (typeof body.birthDate === 'string') {
      const trimmedDate = body.birthDate.trim();
      if (!trimmedDate || /^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
        updates.birthDate = trimmedDate || undefined;
      }
    }

    if (typeof body.campus === 'string') {
      const validCampuses = ['virtual', 'central', 'ambos'];
      if (validCampuses.includes(body.campus)) {
        updates.campus = body.campus;
      }
    }

    if (typeof body.bio === 'string') {
      updates.bio = body.bio.trim().slice(0, 500);
    }

    if (typeof body.photoURL === 'string') {
      // Validar longitud máxima de 2MB para base64 o URL https
      if (body.photoURL.length < 2 * 1024 * 1024) {
        updates.photoURL = body.photoURL.trim();
      }
    }

    // NUNCA permitir que el cliente modifique role, uid, email, joinedAt o permisos
    delete (updates as Record<string, unknown>).role;
    delete (updates as Record<string, unknown>).uid;
    delete (updates as Record<string, unknown>).email;
    delete (updates as Record<string, unknown>).joinedAt;

    // 2. Persistir en Firestore mediante Admin SDK
    const userRef = db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid);
    await userRef.set(updates, { merge: true });

    // 3. Sincronizar en Firebase Auth si displayName o photoURL cambiaron
    const authUpdates: { displayName?: string; photoURL?: string } = {};
    if (updates.displayName) authUpdates.displayName = updates.displayName;
    if (updates.photoURL && (updates.photoURL.startsWith('http://') || updates.photoURL.startsWith('https://'))) {
      authUpdates.photoURL = updates.photoURL;
    }

    if (Object.keys(authUpdates).length > 0) {
      try {
        await auth.updateUser(uid, authUpdates);
      } catch (authErr) {
        console.warn('[ProfileAPI] Advertencia al sincronizar Auth:', authErr);
      }
    }

    // 4. Retornar el perfil consolidado
    const updatedSnap = await userRef.get();
    const finalProfile = updatedSnap.data() as UserProfile;

    return NextResponse.json({
      success: true,
      message: '¡Tu perfil ha sido actualizado con éxito!',
      profile: finalProfile,
    });
  } catch (error) {
    console.error('[ProfileAPI] Error al actualizar perfil:', error);
    return NextResponse.json(
      { error: 'Error al procesar la actualización del perfil.' },
      { status: 500 }
    );
  }
}
