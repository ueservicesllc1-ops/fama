import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { ContactMessage } from '@/types/models';
import { isGmailConfigured } from '@/lib/email/gmailService';

export async function GET(request: NextRequest) {
  const authCheck = await verifyAdminRequest(request);
  if (!authCheck.authorized) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.CONTACTS)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const messages: ContactMessage[] = [];
    let unreadCount = 0;
    let pendingCount = 0;
    let attendedCount = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      const msg: ContactMessage = {
        id: doc.id,
        name: data.name || data.fullName || 'Sin nombre',
        email: data.email || '',
        phone: data.phone || undefined,
        subject: data.subject || 'Sin asunto',
        message: data.message || '',
        category: data.category || 'general',
        status: data.status || 'pending',
        isRead: Boolean(data.isRead),
        createdAt: data.createdAt || new Date().toISOString(),
        userId: data.userId || undefined,
        confirmationEmailStatus: data.confirmationEmailStatus || 'not_configured',
        adminNotificationStatus: data.adminNotificationStatus || 'not_configured',
        confirmationEmailError: data.confirmationEmailError,
        adminNotificationError: data.adminNotificationError,
        confirmationSentAt: data.confirmationSentAt,
        adminNotificationSentAt: data.adminNotificationSentAt,
      };

      if (!msg.isRead) unreadCount++;
      if (msg.status === 'pending') pendingCount++;
      if (msg.status === 'attended') attendedCount++;

      messages.push(msg);
    });

    return NextResponse.json({
      messages,
      counts: {
        total: messages.length,
        unread: unreadCount,
        pending: pendingCount,
        attended: attendedCount,
      },
      gmailConfigured: isGmailConfigured(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar mensajes de contacto';
    console.error('[AdminContactsAPI] Error al consultar mensajes:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
