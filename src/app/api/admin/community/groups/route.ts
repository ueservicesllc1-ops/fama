/**
 * FAMA — Endpoint Administrativo de Grupos de Conexión
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { CommunityGroup } from '@/types/models';

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
    const snap = await db.collection(FIRESTORE_COLLECTIONS.GROUPS).get();
    const groups: CommunityGroup[] = [];
    snap.forEach((d) => groups.push({ id: d.id, ...d.data() } as CommunityGroup));

    return NextResponse.json({ success: true, groups });
  } catch (error) {
    console.error('[AdminGroupsAPI] Error consultando grupos:', error);
    return NextResponse.json({ error: 'Error al consultar grupos.' }, { status: 500 });
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
      name,
      category = 'General',
      leader,
      meetingDay,
      meetingTime,
      location = 'Sede Central',
      description = '',
      maxMembers,
      imageUrl = '',
      status = 'active',
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre del grupo es obligatorio.' }, { status: 400 });
    }

    if (!leader || typeof leader !== 'string') {
      return NextResponse.json({ error: 'El líder del grupo es obligatorio.' }, { status: 400 });
    }

    const docRef = db.collection(FIRESTORE_COLLECTIONS.GROUPS).doc();
    const newGroup: CommunityGroup = {
      id: docRef.id,
      name: name.trim(),
      category,
      leader: leader.trim(),
      meetingDay: meetingDay ? String(meetingDay).trim() : 'Por coordinar',
      meetingTime: meetingTime ? String(meetingTime).trim() : '',
      location: location ? String(location).trim() : 'Sede Central',
      description: description.trim(),
      membersCount: 0,
      maxMembers: maxMembers ? Number(maxMembers) : undefined,
      imageUrl: imageUrl.trim() || undefined,
      status,
    };

    await docRef.set(newGroup);
    return NextResponse.json({ success: true, group: newGroup }, { status: 201 });
  } catch (error) {
    console.error('[AdminGroupsAPI] Error creando grupo:', error);
    return NextResponse.json({ error: 'Error al crear grupo.' }, { status: 500 });
  }
}
