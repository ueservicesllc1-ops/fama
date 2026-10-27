/**
 * FAMA — Endpoint Administrativo de Sesiones de Asistencia
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { AttendanceSession, AttendanceSessionType } from '@/types/models';

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
  const typeFilter = searchParams.get('type');
  const statusFilter = searchParams.get('status');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS);

    if (typeFilter && typeFilter !== 'all') {
      query = query.where('type', '==', typeFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter);
    }

    const snap = await query.get();
    let sessions: AttendanceSession[] = [];

    snap.forEach((doc) => {
      sessions.push({ ...(doc.data() as AttendanceSession), id: doc.id });
    });

    // Filtros de fecha en memoria
    if (dateFrom) {
      sessions = sessions.filter((s) => s.date >= dateFrom);
    }
    if (dateTo) {
      sessions = sessions.filter((s) => s.date <= dateTo);
    }

    // Ordenar por fecha descendente, luego hora descendente
    sessions.sort((a, b) => {
      const cmpDate = b.date.localeCompare(a.date);
      if (cmpDate !== 0) return cmpDate;
      return (b.time || '').localeCompare(a.time || '');
    });

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error: unknown) {
    console.error('Error al consultar sesiones de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al consultar sesiones de asistencia en Firestore.' },
      { status: 500 }
    );
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
    const { title, type, date, time, location, notes, cultoId } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'El título de la reunión es obligatorio (mínimo 3 caracteres).' },
        { status: 400 }
      );
    }

    const validTypes: AttendanceSessionType[] = [
      'culto_dominical',
      'culto_miercoles',
      'jovenes',
      'oracion',
      'grupo_conexion',
      'liderazgo',
      'especial',
    ];

    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'El tipo de reunión seleccionado no es válido.' },
        { status: 400 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'La fecha es obligatoria en formato AAAA-MM-DD.' },
        { status: 400 }
      );
    }

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        { error: 'El horario es obligatorio en formato HH:mm.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const sessionData: Omit<AttendanceSession, 'id'> = {
      title: title.trim(),
      type,
      date,
      time,
      location: (location || 'Templo Principal').trim(),
      notes: (notes || '').trim(),
      status: 'active',
      attendeesCount: 0,
      membersCount: 0,
      visitorsCount: 0,
      cultoId: cultoId || undefined,
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.displayName || 'Administrador Pastoral',
      createdAt: nowIso,
    };

    const docRef = await db
      .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS)
      .add(sessionData);

    return NextResponse.json(
      {
        success: true,
        message: 'Reunión de asistencia creada exitosamente.',
        session: { id: docRef.id, ...sessionData },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error al registrar sesión de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al registrar la sesión en la base de datos.' },
      { status: 500 }
    );
  }
}
