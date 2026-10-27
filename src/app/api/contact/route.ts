import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  isGmailConfigured,
  sendVisitorConfirmationEmail,
  sendAdminContactNotification,
} from '@/lib/email/gmailService';
import { ContactStatus, EmailDeliveryStatus } from '@/types/models';

// Validación básica de formato de correo
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      phone,
      subject,
      message,
      category,
      userId,
      // Campo trampa (honeypot) para detectar bots de spam
      website_hp,
    } = body;

    // 1. Detección de bots por Honeypot
    if (website_hp) {
      console.warn('[ContactAPI] Spam detectado por campo trampa (honeypot).');
      return NextResponse.json({ success: true, id: 'sp-detected' }, { status: 200 });
    }

    // 2. Validación de campos obligatorios en el servidor
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'El nombre completo debe tener entre 2 y 100 caracteres.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()) || email.length > 100) {
      return NextResponse.json(
        { error: 'Por favor introduce un correo electrónico válido.' },
        { status: 400 }
      );
    }

    if (phone && typeof phone === 'string' && phone.trim().length > 30) {
      return NextResponse.json(
        { error: 'El número telefónico no debe exceder 30 caracteres.' },
        { status: 400 }
      );
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3 || subject.trim().length > 150) {
      return NextResponse.json(
        { error: 'El asunto debe tener entre 3 y 150 caracteres.' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 3000) {
      return NextResponse.json(
        { error: 'El mensaje debe tener entre 10 y 3000 caracteres.' },
        { status: 400 }
      );
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json(
        { error: 'El servicio de base de datos no está disponible en este momento.' },
        { status: 500 }
      );
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone ? String(phone).trim() : null;
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    const nowIso = new Date().toISOString();

    const gmailReady = isGmailConfigured();

    let confirmationEmailStatus: EmailDeliveryStatus = gmailReady ? 'pending' : 'not_configured';
    let adminNotificationStatus: EmailDeliveryStatus = gmailReady ? 'pending' : 'not_configured';

    // 3. Guardar el mensaje en Firestore de forma segura
    const contactData = {
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      subject: trimmedSubject,
      message: trimmedMessage,
      category: category ? String(category).trim() : 'general',
      userId: userId ? String(userId) : null,
      status: 'pending' as ContactStatus,
      isRead: false,
      createdAt: nowIso,
      confirmationEmailStatus,
      adminNotificationStatus,
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.CONTACTS).add(contactData);
    const contactId = docRef.id;

    // 4. Si Gmail está configurado, proceder al envío de correos
    if (gmailReady) {
      const updateData: Record<string, unknown> = {};

      // A) Correo automático al visitante
      try {
        const visitorResult = await sendVisitorConfirmationEmail({
          name: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
          contactId,
        });

        if (visitorResult.success) {
          confirmationEmailStatus = 'sent';
          updateData.confirmationEmailStatus = 'sent';
          updateData.confirmationSentAt = new Date().toISOString();
        } else {
          confirmationEmailStatus = 'failed';
          updateData.confirmationEmailStatus = 'failed';
          updateData.confirmationEmailError = visitorResult.error || 'Fallo desconocido en envío SMTP';
        }
      } catch (err: unknown) {
        confirmationEmailStatus = 'failed';
        updateData.confirmationEmailStatus = 'failed';
        updateData.confirmationEmailError = err instanceof Error ? err.message : String(err);
      }

      // B) Notificación al administrador
      try {
        const adminResult = await sendAdminContactNotification({
          name: trimmedName,
          email: trimmedEmail,
          phone: trimmedPhone || undefined,
          subject: trimmedSubject,
          message: trimmedMessage,
          contactId,
          createdAt: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
        });

        if (adminResult.success) {
          adminNotificationStatus = 'sent';
          updateData.adminNotificationStatus = 'sent';
          updateData.adminNotificationSentAt = new Date().toISOString();
        } else {
          adminNotificationStatus = 'failed';
          updateData.adminNotificationStatus = 'failed';
          updateData.adminNotificationError = adminResult.error || 'Fallo desconocido en notificación admin';
        }
      } catch (err: unknown) {
        adminNotificationStatus = 'failed';
        updateData.adminNotificationStatus = 'failed';
        updateData.adminNotificationError = err instanceof Error ? err.message : String(err);
      }

      // Actualizar el documento de Firestore con los estados de los correos
      if (Object.keys(updateData).length > 0) {
        await docRef.update(updateData);
      }
    }

    return NextResponse.json({
      success: true,
      id: contactId,
      confirmationEmailStatus,
      adminNotificationStatus,
      gmailConfigured: gmailReady,
    });
  } catch (err: unknown) {
    console.error('[ContactAPI] Error general procesando contacto:', err);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el mensaje. Por favor intenta de nuevo.' },
      { status: 500 }
    );
  }
}
