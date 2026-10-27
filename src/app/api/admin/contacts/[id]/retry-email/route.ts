import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  isGmailConfigured,
  sendVisitorConfirmationEmail,
  sendAdminContactNotification,
} from '@/lib/email/gmailService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Identificador de mensaje no proporcionado' }, { status: 400 });
  }

  if (!isGmailConfigured()) {
    return NextResponse.json(
      {
        error:
          'Gmail no está configurado en el servidor. Configura GMAIL_USER y GMAIL_APP_PASSWORD en .env.local para habilitar los envíos.',
      },
      { status: 400 }
    );
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  try {
    const docRef = db.collection(FIRESTORE_COLLECTIONS.CONTACTS).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    const data = docSnap.data()!;
    const name = data.name || data.fullName || 'Visitante';
    const email = data.email || '';
    const phone = data.phone || undefined;
    const subject = data.subject || 'Sin asunto';
    const message = data.message || '';

    const body = await request.json().catch(() => ({}));
    const target = body.target || 'both'; // 'visitor', 'admin', 'both'

    const results: {
      visitor?: { success: boolean; error?: string };
      admin?: { success: boolean; error?: string };
    } = {};

    const updateData: Record<string, unknown> = {};

    // 1. Reintentar correo al visitante
    if (target === 'visitor' || target === 'both') {
      try {
        const visitorRes = await sendVisitorConfirmationEmail({
          name,
          email,
          subject,
          message,
          contactId: id,
        });

        if (visitorRes.success) {
          results.visitor = { success: true };
          updateData.confirmationEmailStatus = 'sent';
          updateData.confirmationSentAt = new Date().toISOString();
          updateData.confirmationEmailError = null;
        } else {
          results.visitor = { success: false, error: visitorRes.error };
          updateData.confirmationEmailStatus = 'failed';
          updateData.confirmationEmailError = visitorRes.error || 'Error reintentando envío';
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.visitor = { success: false, error: errorMsg };
        updateData.confirmationEmailStatus = 'failed';
        updateData.confirmationEmailError = errorMsg;
      }
    }

    // 2. Reintentar notificación al administrador
    if (target === 'admin' || target === 'both') {
      try {
        const adminRes = await sendAdminContactNotification({
          name,
          email,
          phone,
          subject,
          message,
          contactId: id,
          createdAt: new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
        });

        if (adminRes.success) {
          results.admin = { success: true };
          updateData.adminNotificationStatus = 'sent';
          updateData.adminNotificationSentAt = new Date().toISOString();
          updateData.adminNotificationError = null;
        } else {
          results.admin = { success: false, error: adminRes.error };
          updateData.adminNotificationStatus = 'failed';
          updateData.adminNotificationError = adminRes.error || 'Error reintentando envío';
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.admin = { success: false, error: errorMsg };
        updateData.adminNotificationStatus = 'failed';
        updateData.adminNotificationError = errorMsg;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await docRef.update(updateData);
    }

    return NextResponse.json({
      success: true,
      id,
      results,
      updateData,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al reintentar correo';
    console.error('[AdminRetryEmailAPI] Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
