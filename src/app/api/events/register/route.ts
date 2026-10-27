/**
 * FAMA — Endpoint de Inscripción a Eventos Congregacionales
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { sendEventRegistrationEmail } from '@/lib/email/gmailService';
import { EventRegistration, EmailDeliveryStatus } from '@/types/models';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Servidor no disponible.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      eventId,
      name,
      email,
      phone,
      attendeesCount = 1,
      userId,
    } = body;

    // 1. Validaciones básicas
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'Identificador de evento no válido.' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Por favor indica tu nombre completo (2 a 100 caracteres).' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json({ error: 'Por favor indica un correo electrónico válido.' }, { status: 400 });
    }

    const safeCount = Math.max(1, Math.min(10, Number(attendeesCount) || 1));
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // 2. Transacción Firestore para comprobar aforo y registrar atómicamente evitando sobrecupo por concurrencia
    const eventRef = db.collection(FIRESTORE_COLLECTIONS.EVENTS).doc(eventId);
    const nowIso = new Date().toISOString();
    const regDocRef = db.collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS).doc();

    let eventData: Record<string, unknown> = {};

    try {
      await db.runTransaction(async (transaction) => {
        // Lectura del evento en la transacción
        const eventDoc = await transaction.get(eventRef);

        if (!eventDoc.exists) {
          throw { status: 404, message: 'El evento no fue encontrado o ya no está disponible.' };
        }

        const data = (eventDoc.data() || {}) as Record<string, unknown>;
        eventData = data;

        if (data.status && data.status !== 'published') {
          throw { status: 400, message: 'Este evento no está abierto para inscripciones.' };
        }

        // Comprobación atómica de aforo
        const capacity = typeof data.capacity === 'number' ? data.capacity : undefined;
        const currentRegistered = typeof data.registeredCount === 'number' ? data.registeredCount : 0;

        if (capacity !== undefined && currentRegistered + safeCount > capacity) {
          const remaining = Math.max(0, capacity - currentRegistered);
          throw {
            status: 400,
            message: remaining > 0
              ? `Aforo insuficiente. Solo quedan ${remaining} lugares disponibles.`
              : 'Aforo completo para este evento.',
          };
        }

        // Comprobar duplicados por email
        const existingQuery = db
          .collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS)
          .where('eventId', '==', eventId)
          .where('email', '==', cleanEmail)
          .where('status', '==', 'confirmed');
        const existingSnap = await transaction.get(existingQuery);
        if (!existingSnap.empty) {
          throw { status: 409, message: 'Ya existe una inscripción confirmada con este correo electrónico para este evento.' };
        }

        // Comprobar duplicados por userId si aplica
        if (userId) {
          const userQuery = db
            .collection(FIRESTORE_COLLECTIONS.EVENT_REGISTRATIONS)
            .where('eventId', '==', eventId)
            .where('userId', '==', userId)
            .where('status', '==', 'confirmed');
          const userSnap = await transaction.get(userQuery);
          if (!userSnap.empty) {
            throw { status: 409, message: 'Ya estás inscrito en este evento con tu cuenta congregacional.' };
          }
        }

        // Escrituras atómicas dentro de la transacción
        const registrationData: EventRegistration = {
          id: regDocRef.id,
          eventId,
          eventTitle: (data.title as string) || 'Evento Congregacional',
          eventDate: data.date as string | undefined,
          userId: userId || undefined,
          name: cleanName,
          email: cleanEmail,
          phone: phone ? String(phone).trim() : undefined,
          attendeesCount: safeCount,
          status: 'confirmed',
          createdAt: nowIso,
          confirmationEmailStatus: 'pending',
        };

        transaction.set(regDocRef, registrationData);
        transaction.update(eventRef, {
          registeredCount: currentRegistered + safeCount,
        });
      });
    } catch (txnError: unknown) {
      if (txnError && typeof txnError === 'object' && 'status' in txnError && 'message' in txnError) {
        const custom = txnError as { status: number; message: string };
        return NextResponse.json({ error: custom.message }, { status: custom.status });
      }
      throw txnError;
    }

    // 5. Enviar correo de confirmación por Gmail SMTP (si está configurado)
    let emailStatus: EmailDeliveryStatus = 'not_configured';
    try {
      const emailRes = await sendEventRegistrationEmail({
        name: cleanName,
        email: cleanEmail,
        eventTitle: (typeof eventData.title === 'string' ? eventData.title : 'Evento Congregacional'),
        eventDate: (typeof eventData.date === 'string' ? eventData.date : 'Fecha por confirmar'),
        eventTime: (typeof eventData.time === 'string' ? eventData.time : undefined),
        eventLocation: (typeof eventData.location === 'string' ? eventData.location : undefined),
        attendeesCount: safeCount,
        registrationId: regDocRef.id,
      });

      if (emailRes.success) {
        emailStatus = 'sent';
      } else if (emailRes.configured) {
        emailStatus = 'failed';
      }

      await regDocRef.update({
        confirmationEmailStatus: emailStatus,
        confirmationEmailError: emailRes.error || null,
      });
    } catch (emailErr) {
      console.warn('[EventRegistrationAPI] Error al despachar correo:', emailErr);
    }

    return NextResponse.json({
      success: true,
      registrationId: regDocRef.id,
      confirmationEmailStatus: emailStatus,
      message: 'Inscripción confirmada con éxito.',
    });
  } catch (error) {
    console.error('[EventRegistrationAPI] Error procesando inscripción:', error);
    return NextResponse.json({ error: 'Ocurrió un error al procesar tu inscripción.' }, { status: 500 });
  }
}
