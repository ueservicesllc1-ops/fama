/**
 * FAMA — Endpoint Administrativo de Ministerios
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { Ministry } from '@/types/models';

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
    const snap = await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).get();
    const ministries: Ministry[] = [];
    snap.forEach((d) => ministries.push({ id: d.id, ...d.data() } as Ministry));

    return NextResponse.json({ success: true, ministries });
  } catch (error) {
    console.error('[AdminMinistriesAPI] Error consultando ministerios:', error);
    return NextResponse.json({ error: 'Error al consultar ministerios.' }, { status: 500 });
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
      leader,
      description = '',
      iconName = 'HeartHandshake',
      requirements = [],
      meetingSchedule = '',
      status = 'active',
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre del ministerio es obligatorio.' }, { status: 400 });
    }

    if (!leader || typeof leader !== 'string') {
      return NextResponse.json({ error: 'El líder o coordinador es obligatorio.' }, { status: 400 });
    }

    const docRef = db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).doc();
    const newMinistry: Ministry = {
      id: docRef.id,
      name: name.trim(),
      leader: leader.trim(),
      description: description.trim(),
      iconName: iconName.trim(),
      membersCount: 0,
      requirements: Array.isArray(requirements) ? requirements : [],
      meetingSchedule: meetingSchedule ? String(meetingSchedule).trim() : undefined,
      status,
    };

    await docRef.set(newMinistry);
    return NextResponse.json({ success: true, ministry: newMinistry }, { status: 201 });
  } catch (error) {
    console.error('[AdminMinistriesAPI] Error creando ministerio:', error);
    return NextResponse.json({ error: 'Error al crear ministerio.' }, { status: 500 });
  }
}
