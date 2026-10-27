/**
 * FAMA — Endpoint Administrativo de Comunicados Institucionales
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación con rol de Administrador o Pastor.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  InstitutionalAnnouncement,
  AnnouncementCategory,
  AnnouncementTarget,
  UserProfile,
  EmailBroadcastLog,
} from '@/types/models';
import { sendControlledEmailBatch, BroadcastBatchRecipient } from '@/lib/email/gmailService';
import { sendPushBroadcast } from '@/lib/pwa/webPushService';

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
  const statusFilter = searchParams.get('status');
  const categoryFilter = searchParams.get('category');

  try {
    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.ANNOUNCEMENTS);

    if (statusFilter && statusFilter !== 'all') {
      query = query.where('status', '==', statusFilter);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      query = query.where('category', '==', categoryFilter);
    }

    const snap = await query.get();
    const announcements: InstitutionalAnnouncement[] = [];

    snap.forEach((doc) => {
      announcements.push({ ...(doc.data() as InstitutionalAnnouncement), id: doc.id });
    });

    announcements.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return NextResponse.json({
      success: true,
      count: announcements.length,
      announcements,
    });
  } catch (error: unknown) {
    console.error('Error al consultar comunicados:', error);
    return NextResponse.json(
      { error: 'Error al consultar comunicados en Firestore.' },
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
      title,
      message,
      category,
      targetAudience,
      targetGroupId,
      targetGroupName,
      targetMinistryId,
      targetMinistryName,
      targetRoles,
      publishDate,
      status = 'published', // 'draft' | 'published'
      sendEmail = false,
      relatedUrl,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json(
        { error: 'El título del comunicado es obligatorio (mínimo 3 caracteres).' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json(
        { error: 'El cuerpo del mensaje es obligatorio (mínimo 5 caracteres).' },
        { status: 400 }
      );
    }

    const validCategories: AnnouncementCategory[] = [
      'general',
      'eventos',
      'ministerios',
      'pastoral',
      'urgente',
    ];
    const finalCategory: AnnouncementCategory = validCategories.includes(category)
      ? category
      : 'general';

    const validTargets: AnnouncementTarget[] = ['all', 'group', 'ministry', 'roles'];
    const finalTarget: AnnouncementTarget = validTargets.includes(targetAudience)
      ? targetAudience
      : 'all';

    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];
    const isPublished = status === 'published';

    // 1. Obtener la lista de usuarios destinatarios en el servidor
    const eligibleUsers: UserProfile[] = [];

    if (finalTarget === 'group' && targetGroupId) {
      const appSnap = await db
        .collection(FIRESTORE_COLLECTIONS.GROUP_APPLICATIONS)
        .where('groupId', '==', targetGroupId)
        .where('status', '==', 'approved')
        .get();

      const userIds = new Set<string>();
      appSnap.forEach((doc) => {
        const d = doc.data();
        if (d.userId) userIds.add(d.userId);
      });

      if (userIds.size > 0) {
        const userDocs = await Promise.all(
          Array.from(userIds).map((uid) =>
            db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get()
          )
        );
        userDocs.forEach((doc) => {
          if (doc.exists) {
            eligibleUsers.push({ ...(doc.data() as UserProfile), uid: doc.id });
          }
        });
      }
    } else if (finalTarget === 'ministry' && targetMinistryId) {
      const appSnap = await db
        .collection(FIRESTORE_COLLECTIONS.MINISTRY_APPLICATIONS)
        .where('ministryId', '==', targetMinistryId)
        .where('status', '==', 'approved')
        .get();

      const userIds = new Set<string>();
      appSnap.forEach((doc) => {
        const d = doc.data();
        if (d.userId) userIds.add(d.userId);
      });

      if (userIds.size > 0) {
        const userDocs = await Promise.all(
          Array.from(userIds).map((uid) =>
            db.collection(FIRESTORE_COLLECTIONS.USERS).doc(uid).get()
          )
        );
        userDocs.forEach((doc) => {
          if (doc.exists) {
            eligibleUsers.push({ ...(doc.data() as UserProfile), uid: doc.id });
          }
        });
      }
    } else if (finalTarget === 'roles' && targetRoles && Array.isArray(targetRoles)) {
      const usersSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).get();
      usersSnap.forEach((doc) => {
        const data = doc.data() as UserProfile;
        if (targetRoles.includes(data.role)) {
          eligibleUsers.push({ ...data, uid: doc.id });
        }
      });
    } else {
      // Todos los usuarios
      const usersSnap = await db.collection(FIRESTORE_COLLECTIONS.USERS).get();
      usersSnap.forEach((doc) => {
        eligibleUsers.push({ ...(doc.data() as UserProfile), uid: doc.id });
      });
    }

    // 2. Preparar datos del comunicado
    const announcementData: Omit<InstitutionalAnnouncement, 'id'> = {
      title: title.trim(),
      message: message.trim(),
      category: finalCategory,
      targetAudience: finalTarget,
      targetGroupId: targetGroupId || undefined,
      targetGroupName: targetGroupName || undefined,
      targetMinistryId: targetMinistryId || undefined,
      targetMinistryName: targetMinistryName || undefined,
      targetRoles: targetRoles || undefined,
      status: isPublished ? 'published' : 'draft',
      publishDate: publishDate || today,
      sendEmail: Boolean(sendEmail),
      emailSent: false,
      inAppNotificationSent: isPublished,
      inAppRecipientsCount: isPublished ? eligibleUsers.length : 0,
      createdByUid: authCheck.uid || 'admin',
      createdByName: authCheck.displayName || 'Administrador Pastoral',
      createdAt: nowIso,
      publishedAt: isPublished ? nowIso : undefined,
    };

    const docRef = await db
      .collection(FIRESTORE_COLLECTIONS.ANNOUNCEMENTS)
      .add(announcementData);

    const announcementId = docRef.id;

    // 3. Si se publica inmediatamente: despachar notificaciones in-app
    if (isPublished && eligibleUsers.length > 0) {
      // Guardar notificaciones in-app en lotes de 400
      const batchSize = 400;
      for (let i = 0; i < eligibleUsers.length; i += batchSize) {
        const batch = db.batch();
        const chunk = eligibleUsers.slice(i, i + batchSize);

        for (const user of chunk) {
          const notifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
          batch.set(notifRef, {
            userId: user.uid,
            title: title.trim(),
            message: message.trim(),
            category: finalCategory,
            relatedUrl: relatedUrl || undefined,
            read: false,
            createdAt: nowIso,
            announcementId,
            createdByUid: authCheck.uid,
            createdByName: authCheck.displayName,
          });
        }
        await batch.commit();
      }

      // Despacho de Web Push a dispositivos suscritos
      const targetUids = eligibleUsers.map((u) => u.uid).filter(Boolean);
      if (targetUids.length > 0) {
        sendPushBroadcast(targetUids, {
          title: `FAMA: ${title.trim()}`,
          body: message.trim().slice(0, 140),
          url: relatedUrl || '/perfil?tab=notificaciones',
          tag: `announcement-${announcementId}`,
        }).catch((pushErr) => {
          console.warn('[Announcements] Error en Web Push broadcast:', pushErr);
        });
      }
    }

    // 4. Si se seleccionó enviar por correo electrónico: despachar lote controlado
    let emailSummary = undefined;
    if (isPublished && sendEmail && eligibleUsers.length > 0) {
      const emailRecipients: BroadcastBatchRecipient[] = eligibleUsers
        .filter((u) => u.email && u.email.includes('@'))
        .map((u) => ({
          email: u.email,
          name: u.displayName || u.email.split('@')[0],
          communicationPreferences: u.communicationPreferences,
        }));

      const batchResult = await sendControlledEmailBatch({
        recipients: emailRecipients,
        category: finalCategory,
        subject: `Comunicado RENACER CHURCH: ${title.trim()}`,
        title: title.trim(),
        message: message.trim(),
        categoryLabel:
          finalCategory === 'urgente'
            ? 'Aviso Urgente'
            : finalCategory === 'pastoral'
            ? 'Mensaje Pastoral'
            : finalCategory === 'eventos'
            ? 'Aviso de Evento'
            : finalCategory === 'ministerios'
            ? 'Grupos & Ministerios'
            : 'Comunicado Oficial',
        relatedUrl,
        announcementId,
      });

      emailSummary = {
        attempted: batchResult.attempted,
        acceptedBySmtp: batchResult.acceptedBySmtp,
        failed: batchResult.failed,
        skippedDueToPreferences: batchResult.skippedDueToPreferences,
        sentAt: new Date().toISOString(),
      };

      // Guardar registro de auditoría en email_broadcasts
      const broadcastLog: Omit<EmailBroadcastLog, 'id'> = {
        announcementId,
        subject: `Comunicado RENACER CHURCH: ${title.trim()}`,
        category: finalCategory,
        authorUid: authCheck.uid || 'admin',
        authorName: authCheck.displayName || 'Pastor',
        totalRecipientsExpected: emailRecipients.length,
        acceptedBySmtpCount: batchResult.acceptedBySmtp,
        failedCount: batchResult.failed,
        skippedCount: batchResult.skippedDueToPreferences,
        recipientsLog: batchResult.logs,
        startedAt: nowIso,
        completedAt: new Date().toISOString(),
      };

      await db.collection(FIRESTORE_COLLECTIONS.EMAIL_BROADCASTS).add(broadcastLog);

      // Actualizar el comunicado con el resumen del envío de correos
      await docRef.update({
        emailSent: true,
        emailDeliverySummary: emailSummary,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: isPublished
          ? 'Comunicado publicado exitosamente y notificaciones despachadas.'
          : 'Borrador de comunicado guardado exitosamente.',
        announcement: {
          id: announcementId,
          ...announcementData,
          emailSent: Boolean(sendEmail),
          emailDeliverySummary: emailSummary,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error al registrar comunicado:', error);
    return NextResponse.json(
      { error: 'Error al procesar el comunicado en el servidor.' },
      { status: 500 }
    );
  }
}
