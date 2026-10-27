/**
 * FAMA — Endpoint Administrativo de Lista de Miembros
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { UserProfile } from '@/types/models';

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get('role');
  const searchFilter = (searchParams.get('q') || '').trim().toLowerCase();

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.USERS);

    if (roleFilter && roleFilter !== 'all') {
      query = query.where('role', '==', roleFilter);
    }

    const snap = await query.get();
    let members: UserProfile[] = [];

    snap.forEach((doc) => {
      const data = doc.data() as UserProfile;
      members.push({ ...data, uid: doc.id });
    });

    // Filtro de búsqueda en memoria (nombre, email, teléfono)
    if (searchFilter) {
      members = members.filter((m) => {
        const dName = (m.displayName || '').toLowerCase();
        const fName = (m.firstName || '').toLowerCase();
        const lName = (m.lastName || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();

        return (
          dName.includes(searchFilter) ||
          fName.includes(searchFilter) ||
          lName.includes(searchFilter) ||
          email.includes(searchFilter) ||
          phone.includes(searchFilter)
        );
      });
    }

    // Ordenar por fecha de registro descendente
    members.sort((a, b) => ((b.joinedAt || '') > (a.joinedAt || '') ? 1 : -1));

    return NextResponse.json({
      success: true,
      members,
      total: members.length,
    });
  } catch (error) {
    console.error('[AdminMembersAPI] Error listando miembros:', error);
    return NextResponse.json(
      { error: 'Error al consultar la lista de miembros.' },
      { status: 500 }
    );
  }
}
