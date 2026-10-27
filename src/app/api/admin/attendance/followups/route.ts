/**
 * FAMA — Endpoint Administrativo de Seguimiento Pastoral y Tareas de Contacto
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 * NOTAS PASTORALES ESTRICTAMENTE CONFIDENCIALES.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  PastoralFollowUp,
  FollowUpContactType,
  FollowUpResult,
  FollowUpStatus,
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
  const status = searchParams.get('status');
  const personId = searchParams.get('personId');
  const isOverdue = searchParams.get('isOverdue');
  const today = new Date().toISOString().split('T')[0];

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.PASTORAL_FOLLOWUPS);

    if (personId) {
      query = query.where('personId', '==', personId);
    }

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    let followups: PastoralFollowUp[] = [];

    snap.forEach((doc) => {
      followups.push({ ...(doc.data() as PastoralFollowUp), id: doc.id });
    });

    if (isOverdue === 'true') {
      followups = followups.filter((f) => f.status === 'pending' && f.nextStepDueDate && f.nextStepDueDate < today);
    }

    // Ordenar: pendientes primero, luego por fecha de contacto o vencimiento
    followups.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.contactDate.localeCompare(a.contactDate);
    });

    return NextResponse.json({
      success: true,
      count: followups.length,
      followups,
    });
  } catch (error: unknown) {
    console.error('Error al consultar seguimientos pastorales:', error);
    return NextResponse.json(
      { error: 'Error al consultar seguimientos en Firestore.' },
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
      personType, // 'visitor' | 'member'
      personId,
      personName,
      personEmail,
      personPhone,
      followUpConsent,
      contactType,
      contactDate,
      result,
      pastoralNotes,
      nextStep,
      nextStepDueDate,
      status,
      assignedToUid,
      assignedToName,
    } = body;

    if (!personId || !personName) {
      return NextResponse.json(
        { error: 'La persona objeto del seguimiento pastoral es obligatoria.' },
        { status: 400 }
      );
    }

    const validContactTypes: FollowUpContactType[] = [
      'whatsapp',
      'llamada',
      'visita',
      'correo',
      'reunion_pastoral',
      'otro',
    ];

    if (!contactType || !validContactTypes.includes(contactType)) {
      return NextResponse.json(
        { error: 'El tipo de contacto pastoral no es válido.' },
        { status: 400 }
      );
    }

    const validResults: FollowUpResult[] = [
      'contactado_positivo',
      'contactado_neutro',
      'no_respondio',
      'numero_equivocado',
      'solicito_oracion',
      'solicito_no_contactar',
      'visita_agendada',
    ];

    if (!result || !validResults.includes(result)) {
      return NextResponse.json(
        { error: 'El resultado del contacto pastoral no es válido.' },
        { status: 400 }
      );
    }

    if (!pastoralNotes || typeof pastoralNotes !== 'string' || pastoralNotes.trim().length < 3) {
      return NextResponse.json(
        { error: 'La nota pastoral confidencial es obligatoria (mínimo 3 caracteres).' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    const followUpData: Omit<PastoralFollowUp, 'id'> = {
      personType: personType === 'member' ? 'member' : 'visitor',
      personId,
      personName: personName.trim(),
      personEmail: personEmail ? String(personEmail).trim().toLowerCase() : undefined,
      personPhone: personPhone ? String(personPhone).trim() : undefined,
      followUpConsent: Boolean(followUpConsent),
      contactType,
      contactDate: contactDate || today,
      result,
      pastoralNotes: pastoralNotes.trim(),
      nextStep: (nextStep || '').trim() || undefined,
      nextStepDueDate: nextStepDueDate || undefined,
      status: (status as FollowUpStatus) || (nextStep ? 'pending' : 'completed'),
      completedAt: !nextStep ? nowIso : undefined,
      completedByUid: !nextStep ? (authCheck.uid || 'admin') : undefined,
      completedByName: !nextStep ? (authCheck.displayName || 'Pastor') : undefined,
      assignedToUid: assignedToUid || undefined,
      assignedToName: assignedToName || undefined,
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.displayName || 'Administrador Pastoral',
      createdAt: nowIso,
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_FOLLOWUPS).add(followUpData);

    // Si es visitante, actualizar su ficha de visitante
    if (personType === 'visitor') {
      const visitorRef = db.collection(FIRESTORE_COLLECTIONS.VISITORS).doc(personId);
      const visitorSnap = await visitorRef.get();
      if (visitorSnap.exists) {
        const updateVisitor: Record<string, unknown> = {
          followUpsCount: FieldValue.increment(1),
          lastFollowUpDate: contactDate || today,
          updatedAt: nowIso,
        };

        if (result === 'solicito_no_contactar') {
          updateVisitor.status = 'no_contactar';
          updateVisitor.followUpConsent = false;
        } else if (result === 'contactado_positivo' || result === 'visita_agendada') {
          updateVisitor.status = 'en_seguimiento';
        }

        await visitorRef.update(updateVisitor);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Seguimiento pastoral registrado con éxito.',
        followUp: { id: docRef.id, ...followUpData },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error al registrar seguimiento pastoral:', error);
    return NextResponse.json(
      { error: 'Error al registrar el seguimiento en Firestore.' },
      { status: 500 }
    );
  }
}
