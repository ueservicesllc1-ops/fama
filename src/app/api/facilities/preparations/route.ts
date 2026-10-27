import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyFacilityRequest,
  createFacilityAuditEntry,
  sendFacilityNotification,
} from '@/lib/facilities/facilityAuthHelper';
import { EventFacilityPreparation, EventPreparationTask, FacilityArea } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const facilityId = searchParams.get('facilityId');
    const statusParam = searchParams.get('status');

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.EVENT_PREPARATIONS);

    if (eventId) {
      query = query.where('eventId', '==', eventId);
    }
    if (facilityId && facilityId !== 'todos') {
      query = query.where('facilityId', '==', facilityId);
    }
    if (statusParam && statusParam !== 'todos') {
      query = query.where('status', '==', statusParam);
    }

    const snapshot = await query.get();
    const preparations: EventFacilityPreparation[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EventFacilityPreparation[];

    // Ordenar por fecha del evento descendente
    preparations.sort((a, b) => b.eventDate.localeCompare(a.eventDate));

    return NextResponse.json({ preparations });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar preparaciones de eventos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: 'No autorizado para configurar listas de preparación de eventos.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { eventId, eventTitle, eventDate, eventType, facilityId, customTasks, notes } = body;

    if (!eventTitle || typeof eventTitle !== 'string' || !eventTitle.trim()) {
      return NextResponse.json({ error: 'El título del evento o culto es obligatorio.' }, { status: 400 });
    }

    if (!eventDate || typeof eventDate !== 'string') {
      return NextResponse.json({ error: 'La fecha del evento es obligatoria.' }, { status: 400 });
    }

    if (!facilityId || typeof facilityId !== 'string') {
      return NextResponse.json({ error: 'Debe seleccionar el área o instalación a preparar.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const facilityDoc = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(facilityId).get();
    if (!facilityDoc.exists) {
      return NextResponse.json({ error: 'El área física seleccionada no existe.' }, { status: 404 });
    }
    const facilityData = facilityDoc.data() as FacilityArea;

    // Tareas estándar sugeridas según la especificación de FAMA
    const defaultTasks: EventPreparationTask[] = [
      { id: 'prep-1', text: 'Verificar limpieza profunda del auditorio y pasillos', completed: false },
      { id: 'prep-2', text: 'Preparar área de recepción, bienvenida y folletos', completed: false },
      { id: 'prep-3', text: 'Comprobar insumos, orden e higiene adecuada en baños', completed: false },
      { id: 'prep-4', text: 'Revisar orden y distribución de sillas y mobiliario', completed: false },
      { id: 'prep-5', text: 'Confirmar preparación del escenario, atriles y tarima', completed: false },
      { id: 'prep-6', text: 'Verificar que las áreas asignadas estén listas y señalizadas', completed: false },
    ];

    const tasksToSave: EventPreparationTask[] = Array.isArray(customTasks) && customTasks.length > 0
      ? customTasks.map((t, idx) => ({
          id: t.id || `prep-${idx + 1}`,
          text: typeof t === 'string' ? t : t.text || 'Tarea de preparación',
          completed: false,
          assignedVolunteerUid: t.assignedVolunteerUid,
          assignedVolunteerName: t.assignedVolunteerName,
          notes: t.notes,
        }))
      : defaultTasks;

    const now = new Date().toISOString();
    const operatorName = authCheck.profile?.displayName || 'Administrador';

    const auditEntry = createFacilityAuditEntry(
      authCheck.uid || 'admin',
      operatorName,
      'creacion_lista_preparacion',
      `Lista de preparación generada para "${eventTitle}" en ${facilityData.name}.`
    );

    const newPreparation: Omit<EventFacilityPreparation, 'id'> = {
      eventId: eventId || undefined,
      eventTitle: eventTitle.trim(),
      eventDate,
      eventType: eventType || 'culto_general',
      facilityId,
      facilityName: facilityData.name,
      tasks: tasksToSave,
      status: 'pendiente', // NUNCA marcar automáticamente como lista sin completar tareas
      notes: notes?.trim() || '',
      createdAt: now,
      updatedAt: now,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.EVENT_PREPARATIONS).add(newPreparation);

    // Notificar a voluntarios asignados si los hubiere
    for (const t of tasksToSave) {
      if (t.assignedVolunteerUid) {
        await sendFacilityNotification({
          userId: t.assignedVolunteerUid,
          title: `Tarea de Preparación para Culto: ${eventTitle}`,
          message: `Se te ha asignado la tarea "${t.text}" para el evento del ${eventDate} en ${facilityData.name}.`,
          type: 'event_prep_assigned',
          link: '/perfil?tab=mantenimiento',
          deduplicationKey: `prep-vol-${docRef.id}-${t.id}`,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        preparation: { id: docRef.id, ...newPreparation },
        message: 'Lista de preparación creada exitosamente.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al crear lista de preparación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
