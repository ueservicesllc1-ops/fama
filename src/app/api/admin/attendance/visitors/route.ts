/**
 * FAMA — Endpoint Administrativo del Directorio de Visitantes
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { Visitor, VisitorPreferredContact, VisitorStatus } from '@/types/models';

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
  const consent = searchParams.get('consent');
  const q = (searchParams.get('q') || '').trim().toLowerCase();

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.VISITORS);

    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }

    if (consent === 'true') {
      query = query.where('followUpConsent', '==', true);
    } else if (consent === 'false') {
      query = query.where('followUpConsent', '==', false);
    }

    const snap = await query.get();
    let visitors: Visitor[] = [];

    snap.forEach((doc) => {
      visitors.push({ ...(doc.data() as Visitor), id: doc.id });
    });

    if (q) {
      visitors = visitors.filter((v) => {
        const name = v.fullName.toLowerCase();
        const email = (v.email || '').toLowerCase();
        const phone = (v.phone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }

    visitors.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      success: true,
      count: visitors.length,
      visitors,
    });
  } catch (error: unknown) {
    console.error('Error al consultar visitantes:', error);
    return NextResponse.json(
      { error: 'Error al consultar visitantes en Firestore.' },
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
      fullName,
      email,
      phone,
      preferredContactMethod,
      followUpConsent,
      firstVisitDate,
      firstVisitSessionId,
      firstVisitSessionTitle,
      howDidYouHear,
      prayerRequest,
      status,
      notes,
    } = body;

    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { error: 'El nombre completo del visitante es obligatorio (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    const validContactMethods: VisitorPreferredContact[] = ['whatsapp', 'call', 'email', 'none'];
    const finalMethod: VisitorPreferredContact = validContactMethods.includes(preferredContactMethod)
      ? preferredContactMethod
      : 'whatsapp';

    const validStatuses: VisitorStatus[] = ['nuevo', 'en_seguimiento', 'integrado', 'no_contactar'];
    const finalStatus: VisitorStatus = validStatuses.includes(status) ? status : 'nuevo';

    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    const visitorData: Omit<Visitor, 'id'> = {
      fullName: fullName.trim(),
      email: email ? String(email).trim().toLowerCase() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      preferredContactMethod: finalMethod,
      followUpConsent: Boolean(followUpConsent),
      firstVisitDate: firstVisitDate || today,
      firstVisitSessionId: firstVisitSessionId || undefined,
      firstVisitSessionTitle: firstVisitSessionTitle || undefined,
      howDidYouHear: howDidYouHear || undefined,
      prayerRequest: prayerRequest ? String(prayerRequest).trim() : undefined,
      status: finalStatus,
      notes: (notes || '').trim() || undefined,
      followUpsCount: 0,
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.displayName || 'Administrador Pastoral',
      createdAt: nowIso,
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.VISITORS).add(visitorData);

    return NextResponse.json(
      {
        success: true,
        message: 'Visitante registrado exitosamente en el directorio.',
        visitor: { id: docRef.id, ...visitorData },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error al registrar visitante:', error);
    return NextResponse.json(
      { error: 'Error al registrar el visitante en Firestore.' },
      { status: 500 }
    );
  }
}
