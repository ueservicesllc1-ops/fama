/**
 * FAMA — Endpoint Seguro para Peticiones de Oración
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * Permite registrar peticiones de oración y contabilizar "He orado"
 * utilizando Firebase Admin SDK en el servidor.
 *
 * Seguridad:
 *  - La identidad (uid) se obtiene SIEMPRE del token de Firebase, nunca del body.
 *  - Crear una petición admite visitantes (se guarda sin uid); "He orado" exige sesión.
 *  - Categoría validada contra lista cerrada y texto limitado a 1000 caracteres.
 *  - Límite básico de tasa por uid/IP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FieldValue } from 'firebase-admin/firestore';

const ALLOWED_CATEGORIES = ['Salud', 'Familia', 'Finanzas', 'Espiritual', 'Agradecimiento'] as const;
const MAX_REQUEST_LENGTH = 1000;
const MAX_NAME_LENGTH = 80;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 5;

// Límite de tasa en memoria (por instancia del servidor): suficiente como freno básico
const rateBuckets = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return false;
}

function clientKey(request: NextRequest, uid?: string): string {
  if (uid) return `uid:${uid}`;
  const fwd = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return `ip:${fwd || 'unknown'}`;
}

export async function POST(request: NextRequest) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    // Identidad opcional: solo se acepta si el token es válido
    let verifiedUid: string | undefined;
    if (request.headers.get('authorization')) {
      const member = await verifyMemberRequest(request);
      if (!member.authorized) {
        return NextResponse.json({ error: member.error }, { status: member.status });
      }
      verifiedUid = member.uid;
    }

    if (isRateLimited(clientKey(request, verifiedUid))) {
      return NextResponse.json(
        { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { category, requestText, isAnonymous, authorName } = body ?? {};

    const trimmed = typeof requestText === 'string' ? requestText.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'El motivo de oración no puede estar vacío.' }, { status: 400 });
    }
    if (trimmed.length > MAX_REQUEST_LENGTH) {
      return NextResponse.json(
        { error: `El motivo de oración no puede superar ${MAX_REQUEST_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    const safeCategory = ALLOWED_CATEGORIES.includes(category) ? category : 'Espiritual';
    const isAnon = Boolean(isAnonymous);
    const cleanName =
      typeof authorName === 'string' ? authorName.trim().slice(0, MAX_NAME_LENGTH) : '';
    const nameToSave = isAnon ? 'Hermano(a) en la Fe (Anónimo)' : cleanName || 'Miembro FAMA';
    const uidToSave = isAnon ? null : verifiedUid || null;

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS).add({
      userId: uidToSave,
      authorName: nameToSave,
      isAnonymous: isAnon,
      category: safeCategory,
      requestText: trimmed,
      prayersCount: 0,
      prayedByUsers: [],
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'Tu petición de oración ha sido compartida con la congregación.',
    });
  } catch (error) {
    console.warn('[PrayerAPI] Error al crear petición:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar la petición de oración.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  // "He orado" exige sesión válida; el uid proviene del token
  const member = await verifyMemberRequest(request);
  if (!member.authorized || !member.uid) {
    return NextResponse.json({ error: member.error }, { status: member.status });
  }
  const userId = member.uid;

  if (isRateLimited(clientKey(request, userId))) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { requestId } = body ?? {};

    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json({ error: 'Datos incompletos.' }, { status: 400 });
    }

    const docRef = db.collection(FIRESTORE_COLLECTIONS.PRAYER_REQUESTS).doc(requestId);

    // Transacción para evitar doble conteo por peticiones concurrentes
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return 'not_found' as const;

      const prayedByUsers: string[] = snap.data()?.prayedByUsers || [];
      if (prayedByUsers.includes(userId)) return 'already' as const;

      tx.update(docRef, {
        prayersCount: FieldValue.increment(1),
        prayedByUsers: FieldValue.arrayUnion(userId),
      });
      return 'ok' as const;
    });

    if (result === 'not_found') {
      return NextResponse.json({ error: 'Petición no encontrada.' }, { status: 404 });
    }
    if (result === 'already') {
      return NextResponse.json({ success: true, message: 'Ya has orado por esta petición.' });
    }
    return NextResponse.json({ success: true, message: 'Oración registrada.' });
  } catch (error) {
    console.warn('[PrayerAPI] Error al registrar oración:', error);
    return NextResponse.json(
      { error: 'No se pudo registrar la oración.' },
      { status: 500 }
    );
  }
}
