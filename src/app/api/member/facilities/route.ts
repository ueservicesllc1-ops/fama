import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyFacilityRequest,
  sanitizeTicketFinancials,
  sendFacilityNotification,
  createFacilityAuditEntry,
} from '@/lib/facilities/facilityAuthHelper';
import {
  MaintenanceTicket,
  MaintenanceCategory,
  MaintenancePriority,
  FacilityArea,
  EventFacilityPreparation,
} from '@/types/models';
import { EMERGENCY_PROTOCOLS } from '@/lib/facilities/facilityClientHelper';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated || !authCheck.uid) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const uid = authCheck.uid;

    // 1. Incidencias reportadas por el miembro
    const ticketsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS)
      .where('reportedByUid', '==', uid)
      .get();

    const myTickets: MaintenanceTicket[] = ticketsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MaintenanceTicket[];

    // Ordenar por fecha descendente
    myTickets.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

    // 2. Tareas de preparación de eventos asignadas al voluntario
    const prepsSnap = await db.collection(FIRESTORE_COLLECTIONS.EVENT_PREPARATIONS).get();
    const myPreparationTasks: {
      prepId: string;
      eventTitle: string;
      eventDate: string;
      facilityName: string;
      taskId: string;
      text: string;
      completed: boolean;
      completedAt?: string;
    }[] = [];

    prepsSnap.docs.forEach((doc) => {
      const prep = doc.data() as EventFacilityPreparation;
      if (prep.tasks && Array.isArray(prep.tasks)) {
        prep.tasks.forEach((t) => {
          if (t.assignedVolunteerUid === uid) {
            myPreparationTasks.push({
              prepId: doc.id,
              eventTitle: prep.eventTitle,
              eventDate: prep.eventDate,
              facilityName: prep.facilityName,
              taskId: t.id,
              text: t.text,
              completed: t.completed,
              completedAt: t.completedAt,
            });
          }
        });
      }
    });

    // 3. Catálogo de instalaciones disponibles para selección
    const facilitiesSnap = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).get();
    const facilities = facilitiesSnap.docs.map((doc) => {
      const data = doc.data() as FacilityArea;
      return {
        id: doc.id,
        code: data.code,
        name: data.name,
        location: data.location,
        operationalStatus: data.operationalStatus,
      };
    });

    const sanitizedTickets = sanitizeTicketFinancials(myTickets, authCheck.canViewFinancials);

    return NextResponse.json({
      myTickets: sanitizedTickets,
      myPreparationTasks,
      facilities,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al obtener datos de miembro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated || !authCheck.uid) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { facilityId, category, priority, description, photoUrl, isEmergencyRisk, emergencyType } = body;

    if (!facilityId || typeof facilityId !== 'string') {
      return NextResponse.json({ error: 'Debe seleccionar el área física afectada.' }, { status: 400 });
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Debe indicar la categoría del problema.' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Debe detallar la descripción del problema.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const facilityDoc = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(facilityId).get();
    if (!facilityDoc.exists) {
      return NextResponse.json({ error: 'El área física no existe.' }, { status: 404 });
    }
    const facilityData = facilityDoc.data() as FacilityArea;

    const validPriorities: MaintenancePriority[] = ['baja', 'normal', 'alta', 'urgente'];
    const assignedPriority: MaintenancePriority = validPriorities.includes(priority) ? priority : 'normal';

    const countSnapshot = await db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).get();
    const ticketSeq = String(countSnapshot.size + 1).padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const ticketNumber = `INC-${currentYear}-${ticketSeq}`;

    let emergencyInstructions: string | undefined;
    const isEmergency = isEmergencyRisk === true || assignedPriority === 'urgente';
    if (isEmergency) {
      const typeKey = emergencyType && EMERGENCY_PROTOCOLS[emergencyType] ? emergencyType : 'general';
      const protocol = EMERGENCY_PROTOCOLS[typeKey];
      emergencyInstructions = `${protocol.title}: ${protocol.instructions.join(' ')} Contacto: ${protocol.contactNotice}`;
    }

    const now = new Date().toISOString();
    const reporterName = authCheck.profile?.displayName || authCheck.email || 'Miembro';

    const auditEntry = createFacilityAuditEntry(
      authCheck.uid,
      reporterName,
      'reporte_miembro',
      `Incidencia reportada desde portal del miembro (${assignedPriority}).`
    );

    const newTicket: Omit<MaintenanceTicket, 'id'> = {
      ticketNumber,
      facilityId,
      facilityName: facilityData.name,
      facilityCode: facilityData.code,
      category: category as MaintenanceCategory,
      priority: assignedPriority,
      description: description.trim(),
      reportedAt: now,
      photoUrl: photoUrl?.trim() || undefined,
      isEmergencyRisk: isEmergency,
      emergencyType: isEmergency ? (emergencyType || 'general') : undefined,
      emergencyInstructions,
      reportedByUid: authCheck.uid,
      reportedByName: reporterName,
      reportedByEmail: authCheck.email || undefined,
      status: 'reportado',
      createdAt: now,
      updatedAt: now,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).add(newTicket);

    // Si es urgente, alertar al encargado de área
    if (isEmergency && facilityData.managerUid) {
      await sendFacilityNotification({
        userId: facilityData.managerUid,
        title: `⚠️ INCIDENCIA URGENTE: ${facilityData.name}`,
        message: `Se reportó una emergencia de mantenimiento (${ticketNumber}): ${description.trim().substring(0, 80)}...`,
        type: 'facility_urgent_alert',
        link: '/admin?tab=mantenimiento',
        deduplicationKey: `member-urgent-${docRef.id}`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        ticket: { id: docRef.id, ...newTicket },
        message: isEmergency
          ? '⚠️ Reporte urgente enviado. Por favor mantente alejado del área afectada y sigue las instrucciones de seguridad.'
          : 'Reporte de incidencia enviado satisfactoriamente al equipo de mantenimiento.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al registrar reporte de miembro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
