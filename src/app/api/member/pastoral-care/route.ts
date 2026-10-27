/**
 * FAMA — API Segura de Atención Pastoral del Miembro
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN SERVIDOR.
 * Requiere autenticación de miembro.
 * Garantiza estricta privacidad:
 *  - Los miembros solo pueden consultar sus propias solicitudes.
 *  - Las notas internas y logs de auditoría son estrictamente purgados antes de responder.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { verifyMemberRequest } from '@/lib/firebase/memberAuthHelper';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  PastoralCareRequest,
  PastoralRequestType,
  PastoralAuditEntry,
  AppNotification,
} from '@/types/models';

/**
 * GET: Obtener las solicitudes de atención pastoral del miembro autenticado
 */
export async function GET(request: NextRequest) {
  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS)
      .where('userId', '==', authCheck.uid)
      .get();

    const requests: PastoralCareRequest[] = [];

    snap.forEach((doc) => {
      const data = doc.data() as PastoralCareRequest;
      // Estricta purga de notas internas y auditoría confidencial para el miembro
      const sanitized: PastoralCareRequest = {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        userPhone: data.userPhone,
        type: data.type,
        status: data.status,
        appointmentDetails: data.appointmentDetails,
        prayerDetails: data.prayerDetails,
        orientationDetails: data.orientationDetails,
        memberNotificationOptIn: data.memberNotificationOptIn !== false,
        assignedPastorName: data.assignedPastorName,
        publicResponse: data.publicResponse,
        respondedAt: data.respondedAt,
        respondedByName: data.respondedByName,
        rescheduleProposedDate: data.rescheduleProposedDate,
        rescheduleProposedTimeSlot: data.rescheduleProposedTimeSlot,
        rescheduleReason: data.rescheduleReason,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        completedAt: data.completedAt,
        cancelledAt: data.cancelledAt,
        cancelReason: data.cancelReason,
        // NUNCA incluir internalNotes ni auditLog en el perfil del miembro
      };
      requests.push(sanitized);
    });

    // Ordenar de más reciente a más antigua
    requests.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error: unknown) {
    console.error('[PastoralMemberAPI] Error consultando solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al consultar las solicitudes de atención pastoral.' },
      { status: 500 }
    );
  }
}

/**
 * POST: Crear una nueva solicitud pastoral (Cita, Petición de Oración u Orientación)
 */
export async function POST(request: NextRequest) {
  const authCheck = await verifyMemberRequest(request);
  if (!authCheck.authorized || !authCheck.uid) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json({ error: 'Base de datos no disponible.' }, { status: 500 });
  }

  try {
    const body = await request.json();

    const validTypes: PastoralRequestType[] = ['cita', 'oracion', 'orientacion'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { error: 'Tipo de solicitud inválido. Debe ser cita, oracion u orientacion.' },
        { status: 400 }
      );
    }

    const type: PastoralRequestType = body.type;
    const now = new Date().toISOString();

    // Obtener datos del perfil del usuario para coherencia
    let memberName = authCheck.name || 'Miembro';
    let memberEmail = authCheck.email || '';
    let memberPhone = typeof body.userPhone === 'string' ? body.userPhone.trim().slice(0, 30) : '';

    const userDoc = await db.collection(FIRESTORE_COLLECTIONS.USERS).doc(authCheck.uid).get();
    if (userDoc.exists) {
      const uData = userDoc.data();
      if (uData?.displayName) memberName = uData.displayName;
      if (uData?.email) memberEmail = uData.email;
      if (uData?.phone && !memberPhone) memberPhone = uData.phone;
    }

    const newRequest: Partial<PastoralCareRequest> = {
      userId: authCheck.uid,
      userName: memberName,
      userEmail: memberEmail,
      userPhone: memberPhone,
      type,
      status: 'pending', // Siempre inicia como Pendiente; NUNCA confirmada de forma automática
      memberNotificationOptIn: body.memberNotificationOptIn !== false,
      createdAt: now,
      updatedAt: now,
      internalNotes: [],
      auditLog: [
        {
          action: 'creada',
          performedByUid: authCheck.uid,
          performedByName: memberName,
          performedByRole: 'member',
          timestamp: now,
          noteSummary: `Solicitud de ${type} creada por el miembro.`,
        },
      ],
    };

    // Validaciones específicas por tipo
    if (type === 'cita') {
      const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
      if (!reason) {
        return NextResponse.json({ error: 'Debe especificar el motivo general de la cita.' }, { status: 400 });
      }

      const validModalities = ['presencial', 'telefonica', 'videollamada'];
      const modality = validModalities.includes(body.modality) ? body.modality : 'presencial';

      const preferredDate = typeof body.preferredDate === 'string' ? body.preferredDate.trim().slice(0, 20) : '';
      if (!preferredDate) {
        return NextResponse.json({ error: 'Debe seleccionar una fecha preferida.' }, { status: 400 });
      }

      const preferredTimeSlot = typeof body.preferredTimeSlot === 'string' ? body.preferredTimeSlot.trim().slice(0, 50) : '';
      if (!preferredTimeSlot) {
        return NextResponse.json({ error: 'Debe indicar una franja horaria preferida.' }, { status: 400 });
      }

      const validContact = ['whatsapp', 'telefono', 'email', 'presencial'];
      const preferredContactMethod = validContact.includes(body.preferredContactMethod)
        ? body.preferredContactMethod
        : 'whatsapp';

      const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 1000) : undefined;

      newRequest.appointmentDetails = {
        reason,
        modality,
        preferredDate,
        preferredTimeSlot,
        preferredContactMethod,
        comments,
      };
    } else if (type === 'oracion') {
      const requestText = typeof body.requestText === 'string' ? body.requestText.trim().slice(0, 1000) : '';
      if (!requestText) {
        return NextResponse.json({ error: 'La petición de oración no puede estar vacía.' }, { status: 400 });
      }

      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 150) : undefined;
      const validPrivacy = ['privada', 'grupo_autorizado', 'congregacion'];
      const privacyLevel = validPrivacy.includes(body.privacyLevel) ? body.privacyLevel : 'privada';

      const allowPrayerGroup = Boolean(body.allowPrayerGroup);
      // Solo permitir autorizar muro congregacional si la privacidad es 'congregacion'
      const allowPublicWall = privacyLevel === 'congregacion' && Boolean(body.allowPublicWall);

      newRequest.prayerDetails = {
        title,
        requestText,
        privacyLevel,
        allowPrayerGroup,
        allowPublicWall,
        approvedForPublicWall: false, // Requiere aprobación pastoral explícita
      };
    } else if (type === 'orientacion') {
      const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 200) : '';
      if (!topic) {
        return NextResponse.json({ error: 'Debe indicar el área o tema de orientación.' }, { status: 400 });
      }

      const description = typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : '';
      if (!description) {
        return NextResponse.json({ error: 'Por favor describa brevemente su consulta u orientación.' }, { status: 400 });
      }

      const validContact = ['whatsapp', 'telefono', 'email', 'presencial'];
      const preferredContactMethod = validContact.includes(body.preferredContactMethod)
        ? body.preferredContactMethod
        : 'whatsapp';

      const urgencyLevel = body.urgencyLevel === 'alta' ? 'alta' : 'normal';

      newRequest.orientationDetails = {
        topic,
        description,
        preferredContactMethod,
        urgencyLevel,
      };
    }

    // Persistir solicitud en Firestore
    const docRef = await db.collection(FIRESTORE_COLLECTIONS.PASTORAL_REQUESTS).add(newRequest);
    const requestId = docRef.id;

    // 1. Notificación discreta al miembro
    if (newRequest.memberNotificationOptIn) {
      const memberNotifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
      const memberNotif: AppNotification = {
        id: memberNotifRef.id,
        userId: authCheck.uid,
        title: 'Solicitud Pastoral Registrada',
        message: `Hemos recibido tu solicitud de atención pastoral (#${requestId.slice(-5).toUpperCase()}). El equipo pastoral la revisará con discreción.`,
        category: 'pastoral',
        relatedUrl: '/perfil?tab=pastoral',
        read: false,
        createdAt: now,
      };
      await memberNotifRef.set(memberNotif);
    }

    // 2. Notificación discreta al personal pastoral autorizado
    try {
      const pastorsSnap = await db
        .collection(FIRESTORE_COLLECTIONS.USERS)
        .where('role', 'in', ['pastor', 'admin'])
        .get();

      const batch = db.batch();
      let pastorNotifCount = 0;

      pastorsSnap.forEach((pDoc) => {
        const pData = pDoc.data();
        // Solo notificar si es pastor o admin con pastoralAccess
        if (pData.role === 'pastor' || pData.pastoralAccess === true) {
          const staffNotifRef = db.collection(FIRESTORE_COLLECTIONS.NOTIFICATIONS).doc();
          batch.set(staffNotifRef, {
            id: staffNotifRef.id,
            userId: pDoc.id,
            title: 'Nueva Solicitud Pastoral',
            message: `Se ha recibido una nueva solicitud (${type}) pendiente de revisión pastoral.`,
            category: 'pastoral',
            relatedUrl: '/admin?tab=pastoral',
            read: false,
            createdAt: now,
          });
          pastorNotifCount++;
        }
      });

      if (pastorNotifCount > 0) {
        await batch.commit();
      }
    } catch (notifErr) {
      console.warn('[PastoralMemberAPI] Error al notificar al equipo pastoral:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud de atención pastoral registrada correctamente.',
      requestId,
    });
  } catch (error: unknown) {
    console.error('[PastoralMemberAPI] Error creando solicitud pastoral:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud de atención pastoral.' },
      { status: 500 }
    );
  }
}
