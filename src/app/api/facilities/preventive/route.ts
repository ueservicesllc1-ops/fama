import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyFacilityRequest,
  sendFacilityNotification,
  createFacilityAuditEntry,
} from '@/lib/facilities/facilityAuthHelper';
import {
  PreventiveTask,
  PreventiveFrequency,
  PreventiveChecklistItem,
  FacilityArea,
} from '@/types/models';

function calculateNextDate(startDate: string, frequency: PreventiveFrequency): string {
  const d = new Date(startDate);
  switch (frequency) {
    case 'diaria':
      d.setDate(d.getDate() + 1);
      break;
    case 'semanal':
      d.setDate(d.getDate() + 7);
      break;
    case 'quincenal':
      d.setDate(d.getDate() + 14);
      break;
    case 'mensual':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'trimestral':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'semestral':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'anual':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().split('T')[0];
}

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
    const statusParam = searchParams.get('status');
    const assignedToUid = searchParams.get('assignedToUid');

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.PREVENTIVE_TASKS);

    if (facilityId && facilityId !== 'todos') {
      query = query.where('facilityId', '==', facilityId);
    }
    if (statusParam && statusParam !== 'todos') {
      query = query.where('status', '==', statusParam);
    }
    if (assignedToUid) {
      query = query.where('assignedToUid', '==', assignedToUid);
    }

    const snapshot = await query.get();
    const today = new Date().toISOString().split('T')[0];

    const tasks: PreventiveTask[] = snapshot.docs.map((doc) => {
      const data = doc.data() as PreventiveTask;
      // Detección dinámica de tarea vencida
      let status = data.status;
      if (status !== 'completado' && status !== 'cancelado' && data.scheduledDate < today) {
        status = 'vencido';
      }
      return {
        ...data,
        id: doc.id,
        status,
      };
    });

    // Ordenar por fecha programada ascendente
    tasks.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al listar tareas preventivas';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyFacilityRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: 'No autorizado para programar mantenimientos preventivos.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      facilityId,
      frequency,
      assignedToUid,
      assignedToName,
      scheduledDate,
      checklist,
      observations,
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'El título de la tarea o inspección es obligatorio.' }, { status: 400 });
    }

    if (!facilityId || typeof facilityId !== 'string') {
      return NextResponse.json({ error: 'Debe seleccionar el área o instalación relacionada.' }, { status: 400 });
    }

    if (!scheduledDate || typeof scheduledDate !== 'string') {
      return NextResponse.json({ error: 'La fecha programada es obligatoria.' }, { status: 400 });
    }

    if (!assignedToUid || !assignedToName) {
      return NextResponse.json({ error: 'Debe designar un responsable técnico para la tarea.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const facilityDoc = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(facilityId).get();
    if (!facilityDoc.exists) {
      return NextResponse.json({ error: 'El área física seleccionada no existe.' }, { status: 404 });
    }
    const facilityData = facilityDoc.data() as FacilityArea;

    // Generar código de tarea preventiva
    const countSnapshot = await db.collection(FIRESTORE_COLLECTIONS.PREVENTIVE_TASKS).get();
    const seq = String(countSnapshot.size + 1).padStart(4, '0');
    const taskCode = `PREV-${facilityData.code.replace(/[^A-Z0-9]/g, '')}-${seq}`;

    const validFrequency: PreventiveFrequency = (frequency as PreventiveFrequency) || 'mensual';
    const nextScheduledDate = calculateNextDate(scheduledDate, validFrequency);

    // Preparar checklist estructurado
    const formattedChecklist: PreventiveChecklistItem[] = Array.isArray(checklist)
      ? checklist.map((item, index) => ({
          id: item.id || `chk-${index + 1}`,
          text: typeof item === 'string' ? item : item.text || 'Punto de revisión',
          completed: false,
        }))
      : [
          { id: 'chk-1', text: 'Inspección visual general del área', completed: false },
          { id: 'chk-2', text: 'Verificación de iluminación y suministros', completed: false },
          { id: 'chk-3', text: 'Comprobación de orden y seguridad de accesos', completed: false },
        ];

    const now = new Date().toISOString();
    const operatorName = authCheck.profile?.displayName || 'Administrador';

    const auditEntry = createFacilityAuditEntry(
      authCheck.uid || 'admin',
      operatorName,
      'programacion_preventivo',
      `Tarea preventiva "${title.trim()}" (${taskCode}) programada para ${scheduledDate}.`
    );

    const newTask: Omit<PreventiveTask, 'id'> = {
      taskCode,
      title: title.trim(),
      facilityId,
      facilityName: facilityData.name,
      frequency: validFrequency,
      assignedToUid,
      assignedToName,
      scheduledDate,
      nextScheduledDate,
      checklist: formattedChecklist,
      status: 'pendiente',
      result: 'pendiente',
      observations: observations?.trim() || '',
      createdAt: now,
      updatedAt: now,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.PREVENTIVE_TASKS).add(newTask);

    // Notificar al técnico asignado
    await sendFacilityNotification({
      userId: assignedToUid,
      title: `Mantenimiento Preventivo Programado: ${facilityData.name}`,
      message: `Se te ha asignado la inspección periódica "${title.trim()}" programada para el ${scheduledDate}.`,
      type: 'preventive_task_assigned',
      link: '/admin?tab=mantenimiento',
      deduplicationKey: `preventive-${docRef.id}`,
    });

    return NextResponse.json(
      {
        success: true,
        task: { id: docRef.id, ...newTask },
        message: 'Mantenimiento preventivo programado exitosamente.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al programar preventivo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
