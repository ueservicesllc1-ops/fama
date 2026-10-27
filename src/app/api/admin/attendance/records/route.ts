/**
 * FAMA — Endpoint Administrativo de Registro de Asistencia
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  AttendanceRecord,
  AttendanceSession,
  Visitor,
  VisitorPreferredContact,
} from '@/types/models';

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
  const sessionId = searchParams.get('sessionId');
  const attendeeType = searchParams.get('attendeeType');
  const status = searchParams.get('status');
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS);

    if (sessionId) {
      query = query.where('sessionId', '==', sessionId);
    }

    if (attendeeType && attendeeType !== 'all') {
      query = query.where('attendeeType', '==', attendeeType);
    }

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    let records: AttendanceRecord[] = [];

    snap.forEach((doc) => {
      records.push({ ...(doc.data() as AttendanceRecord), id: doc.id });
    });

    if (q) {
      records = records.filter((r) => {
        const name = (r.attendeeType === 'member' ? (r.memberName || '') : (r.visitorName || '')).toLowerCase();
        const email = (r.memberEmail || r.visitorEmail || '').toLowerCase();
        const phone = (r.memberPhone || r.visitorPhone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    records.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));

    return NextResponse.json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error: unknown) {
    console.error('Error al consultar registros de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al consultar registros de asistencia en Firestore.' },
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
    const {
      sessionId,
      attendeeType, // 'member' | 'visitor'
      // Para miembro
      memberUid,
      memberName,
      memberEmail,
      memberPhone,
      memberRole,
      // Para visitante
      visitorId,
      visitorName,
      visitorEmail,
      visitorPhone,
      preferredContactMethod,
      followUpConsent,
      howDidYouHear,
      prayerRequest,
      firstTime,
      notes,
    } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'El identificador de la reunión (sessionId) es obligatorio.' },
        { status: 400 }
      );
    }

    if (attendeeType !== 'member' && attendeeType !== 'visitor') {
      return NextResponse.json(
        { error: 'El tipo de asistente debe ser "member" o "visitor".' },
        { status: 400 }
      );
    }

    // 1. Obtener y validar la sesión
    const sessionRef = db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_SESSIONS).doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ error: 'La reunión especificada no existe.' }, { status: 404 });
    }
    const sessionData = sessionSnap.data() as AttendanceSession;

    if (sessionData.status === 'cancelled') {
      return NextResponse.json(
        { error: 'No es posible registrar asistencia en una reunión cancelada.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // 2. Flujo para MIEMBROS
    if (attendeeType === 'member') {
      if (!memberUid || !memberName) {
        return NextResponse.json(
          { error: 'Se requiere el identificador y nombre del miembro.' },
          { status: 400 }
        );
      }

      // PREVENCIÓN DE DUPLICADOS PARA MIEMBRO EN LA MISMA SESIÓN
      const duplicateQuery = await db
        .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS)
        .where('sessionId', '==', sessionId)
        .where('memberUid', '==', memberUid)
        .where('status', '==', 'present')
        .get();

      if (!duplicateQuery.empty) {
        return NextResponse.json(
          {
            error: `El miembro "${memberName}" ya está registrado como presente en esta reunión.`,
            isDuplicate: true,
          },
          { status: 409 }
        );
      }

      const recordData: Omit<AttendanceRecord, 'id'> = {
        sessionId,
        sessionTitle: sessionData.title,
        sessionDate: sessionData.date,
        sessionType: sessionData.type,
        attendeeType: 'member',
        memberUid,
        memberName: memberName.trim(),
        memberEmail: memberEmail || undefined,
        memberPhone: memberPhone || undefined,
        memberRole: memberRole || 'member',
        status: 'present',
        notes: (notes || '').trim() || undefined,
        registeredByUid: authCheck.uid || 'admin',
        registeredByName: authCheck.displayName || 'Administrador Pastoral',
        registeredAt: nowIso,
      };

      const docRef = await db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS).add(recordData);

      // Incrementar contador de la sesión
      await sessionRef.update({
        attendeesCount: FieldValue.increment(1),
        membersCount: FieldValue.increment(1),
        updatedAt: nowIso,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Asistencia de miembro registrada exitosamente.',
          record: { id: docRef.id, ...recordData },
        },
        { status: 201 }
      );
    }

    // 3. Flujo para VISITANTES (sin crear cuentas de Firebase)
    if (!visitorName || typeof visitorName !== 'string' || visitorName.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre del visitante es obligatorio (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    const cleanVisitorName = visitorName.trim();
    const cleanVisitorEmail = visitorEmail ? String(visitorEmail).trim().toLowerCase() : undefined;
    const cleanVisitorPhone = visitorPhone ? String(visitorPhone).trim() : undefined;

    // PREVENCIÓN DE DUPLICADOS PARA VISITANTE EN LA MISMA SESIÓN
    const existingRecordsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS)
      .where('sessionId', '==', sessionId)
      .where('attendeeType', '==', 'visitor')
      .where('status', '==', 'present')
      .get();

    let isDuplicate = false;
    existingRecordsSnap.forEach((doc) => {
      const data = doc.data() as AttendanceRecord;
      if (visitorId && data.visitorId === visitorId) {
        isDuplicate = true;
      } else if ((data.visitorName || '').toLowerCase() === cleanVisitorName.toLowerCase()) {
        isDuplicate = true;
      } else if (cleanVisitorPhone && data.visitorPhone && data.visitorPhone === cleanVisitorPhone) {
        isDuplicate = true;
      } else if (cleanVisitorEmail && data.visitorEmail && data.visitorEmail.toLowerCase() === cleanVisitorEmail) {
        isDuplicate = true;
      }
    });

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: `El visitante "${cleanVisitorName}" ya está registrado como presente en esta reunión.`,
          isDuplicate: true,
        },
        { status: 409 }
      );
    }

    let finalVisitorId = visitorId;

    // Si no tiene visitorId o se solicita guardar/actualizar en la colección de visitantes
    if (!finalVisitorId) {
      // Registrar en la colección visitors (sin crear usuario en Firebase Auth)
      const validContactMethods: VisitorPreferredContact[] = ['whatsapp', 'call', 'email', 'none'];
      const prefMethod: VisitorPreferredContact = validContactMethods.includes(preferredContactMethod)
        ? preferredContactMethod
        : 'whatsapp';

      const newVisitorData: Omit<Visitor, 'id'> = {
        fullName: cleanVisitorName,
        email: cleanVisitorEmail,
        phone: cleanVisitorPhone,
        preferredContactMethod: prefMethod,
        followUpConsent: Boolean(followUpConsent),
        firstVisitDate: sessionData.date,
        firstVisitSessionId: sessionId,
        firstVisitSessionTitle: sessionData.title,
        howDidYouHear: howDidYouHear || undefined,
        prayerRequest: prayerRequest ? String(prayerRequest).trim() : undefined,
        status: 'nuevo',
        notes: (notes || '').trim() || undefined,
        followUpsCount: 0,
        createdByUid: authCheck.uid || 'admin',
        createdByName: authCheck.displayName || 'Administrador Pastoral',
        createdAt: nowIso,
      };

      const visitorRef = await db.collection(FIRESTORE_COLLECTIONS.VISITORS).add(newVisitorData);
      finalVisitorId = visitorRef.id;
    }

    const recordData: Omit<AttendanceRecord, 'id'> = {
      sessionId,
      sessionTitle: sessionData.title,
      sessionDate: sessionData.date,
      sessionType: sessionData.type,
      attendeeType: 'visitor',
      visitorId: finalVisitorId,
      visitorName: cleanVisitorName,
      visitorEmail: cleanVisitorEmail,
      visitorPhone: cleanVisitorPhone,
      firstTime: firstTime !== undefined ? Boolean(firstTime) : true,
      status: 'present',
      notes: (notes || '').trim() || undefined,
      registeredByUid: authCheck.uid || 'admin',
      registeredByName: authCheck.displayName || 'Administrador Pastoral',
      registeredAt: nowIso,
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.ATTENDANCE_RECORDS).add(recordData);

    // Incrementar contador de la sesión
    await sessionRef.update({
      attendeesCount: FieldValue.increment(1),
      visitorsCount: FieldValue.increment(1),
      updatedAt: nowIso,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Asistencia de visitante registrada exitosamente.',
        record: { id: docRef.id, ...recordData },
        visitorId: finalVisitorId,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error al registrar asistencia:', error);
    return NextResponse.json(
      { error: 'Error al registrar la asistencia en Firestore.' },
      { status: 500 }
    );
  }
}
