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
  MaintenanceTicketStatus,
  FacilityArea,
} from '@/types/models';
import { EMERGENCY_PROTOCOLS } from '@/lib/facilities/facilityClientHelper';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const facilityId = searchParams.get('facilityId');
    const priority = searchParams.get('priority');
    const statusParam = searchParams.get('status');
    const category = searchParams.get('category');
    const searchParam = searchParams.get('search')?.toLowerCase().trim();

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS);

    // Si el usuario no tiene permisos administrativos globales, solo puede consultar sus propios reportes
    if (!authCheck.canManage) {
      query = query.where('reportedByUid', '==', authCheck.uid);
    } else {
      if (facilityId && facilityId !== 'todos') {
        query = query.where('facilityId', '==', facilityId);
      }
      if (priority && priority !== 'todos') {
        query = query.where('priority', '==', priority);
      }
      if (statusParam && statusParam !== 'todos') {
        query = query.where('status', '==', statusParam);
      }
      if (category && category !== 'todos') {
        query = query.where('category', '==', category);
      }
    }

    const snapshot = await query.get();
    let tickets: MaintenanceTicket[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MaintenanceTicket[];

    if (searchParam) {
      tickets = tickets.filter(
        (t) =>
          t.ticketNumber.toLowerCase().includes(searchParam) ||
          t.description.toLowerCase().includes(searchParam) ||
          t.facilityName.toLowerCase().includes(searchParam) ||
          (t.assignedToName && t.assignedToName.toLowerCase().includes(searchParam))
      );
    }

    // Ordenar: urgentes primero, luego por fecha descendente
    const priorityWeight: Record<MaintenancePriority, number> = {
      urgente: 4,
      alta: 3,
      normal: 2,
      baja: 1,
    };

    tickets.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
    });

    // Sanitizar costos si no es administrador
    const sanitizedTickets = sanitizeTicketFinancials(tickets, authCheck.canViewFinancials);

    return NextResponse.json({ tickets: sanitizedTickets });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar incidencias';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      facilityId,
      category,
      priority,
      description,
      photoUrl,
      isEmergencyRisk,
      emergencyType,
      estimatedCost,
      materials,
    } = body;

    if (!facilityId || typeof facilityId !== 'string') {
      return NextResponse.json({ error: 'Debe especificar el área afectada.' }, { status: 400 });
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Debe seleccionar una categoría de problema.' }, { status: 400 });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'La descripción del problema es obligatoria.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    // Consultar datos del área
    const facilityDoc = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(facilityId).get();
    if (!facilityDoc.exists) {
      return NextResponse.json({ error: 'El área física especificada no existe.' }, { status: 404 });
    }
    const facilityData = facilityDoc.data() as FacilityArea;

    const validPriorities: MaintenancePriority[] = ['baja', 'normal', 'alta', 'urgente'];
    const assignedPriority: MaintenancePriority = validPriorities.includes(priority) ? priority : 'normal';

    // Generar número correlativo de ticket
    const countSnapshot = await db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).get();
    const ticketSeq = String(countSnapshot.size + 1).padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const ticketNumber = `INC-${currentYear}-${ticketSeq}`;

    // Determinar instrucciones de emergencia si hay peligro
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
      authCheck.uid || 'anon',
      reporterName,
      'creacion_incidencia',
      `Reporte creado con prioridad ${assignedPriority}. Área: ${facilityData.name}`
    );

    const initialStatus: MaintenanceTicketStatus = 'reportado';

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
      reportedByUid: authCheck.uid || 'anon',
      reportedByName: reporterName,
      reportedByEmail: authCheck.email || undefined,
      status: initialStatus,
      materials: authCheck.canViewFinancials && Array.isArray(materials) ? materials : [],
      estimatedCost: authCheck.canViewFinancials && typeof estimatedCost === 'number' ? estimatedCost : undefined,
      createdAt: now,
      updatedAt: now,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS).add(newTicket);

    // Si la prioridad es urgente o emergencia, emitir notificación inmediata a administradores o responsable del área
    if (assignedPriority === 'urgente' || isEmergency) {
      if (facilityData.managerUid) {
        await sendFacilityNotification({
          userId: facilityData.managerUid,
          title: `⚠️ INCIDENCIA URGENTE: ${facilityData.name}`,
          message: `Se reportó una emergencia de mantenimiento (${ticketNumber}): ${description.trim().substring(0, 80)}...`,
          type: 'facility_urgent_alert',
          link: '/admin?tab=mantenimiento',
          deduplicationKey: `urgent-${docRef.id}`,
        });
      }
    }

    const createdTicket = { id: docRef.id, ...newTicket };
    const sanitized = sanitizeTicketFinancials(createdTicket, authCheck.canViewFinancials);

    return NextResponse.json(
      {
        success: true,
        ticket: sanitized,
        message: isEmergency
          ? '⚠️ Reporte urgente registrado. Se han activado los protocolos de seguridad pertinentes.'
          : 'Solicitud de mantenimiento registrada exitosamente.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al registrar incidencia';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
