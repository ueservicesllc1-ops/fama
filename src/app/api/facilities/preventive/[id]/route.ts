import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyFacilityRequest,
  createFacilityAuditEntry,
  sendFacilityNotification,
} from '@/lib/facilities/facilityAuthHelper';
import { PreventiveTask, PreventiveTaskResult } from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const doc = await db.collection(FIRESTORE_COLLECTIONS.PREVENTIVE_TASKS).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Tarea preventiva no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ task: { id: doc.id, ...doc.data() } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar tarea preventiva';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyFacilityRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.PREVENTIVE_TASKS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Tarea preventiva no encontrada.' }, { status: 404 });
    }

    const task = { id: docSnap.id, ...docSnap.data() } as PreventiveTask;

    // Verificar permisos: el asignado o un administrador/encargado
    if (!authCheck.canManage && task.assignedToUid !== authCheck.uid) {
      return NextResponse.json(
        { error: 'No autorizado para modificar esta tarea preventiva.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;
    const operatorName = authCheck.profile?.displayName || authCheck.email || 'Operador';
    const now = new Date().toISOString();

    const updates: Partial<PreventiveTask> = {
      updatedAt: now,
    };

    // 1. Alternar estado de un ítem del checklist
    if (action === 'toggle_checklist') {
      const { checklistItemId, completed } = body;
      const updatedChecklist = task.checklist.map((item) => {
        if (item.id === checklistItemId) {
          return {
            ...item,
            completed: Boolean(completed),
            completedAt: completed ? now : undefined,
          };
        }
        return item;
      });

      updates.checklist = updatedChecklist;
      const allDone = updatedChecklist.every((i) => i.completed);
      if (allDone && task.status === 'pendiente') {
        updates.status = 'en_progreso';
      }
    }

    // 2. Registrar inspección y completar tarea
    else if (action === 'complete_inspection') {
      const { result, observations } = body;
      const validResults: PreventiveTaskResult[] = ['aprobado', 'requiere_atencion', 'fallido'];
      const chosenResult = validResults.includes(result) ? result : 'aprobado';

      updates.status = 'completado';
      updates.result = chosenResult;
      updates.completedAt = now;
      updates.completedByUid = authCheck.uid || 'admin';
      updates.completedByName = operatorName;
      if (observations) updates.observations = observations.trim();

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'finalizacion_preventivo',
        `Inspección completada con resultado "${chosenResult}".`
      );
      updates.auditLog = [...(task.auditLog || []), auditEntry];

      // Si requiere atención o falló, avisar a los administradores
      if (chosenResult === 'requiere_atencion' || chosenResult === 'fallido') {
        await sendFacilityNotification({
          userId: 'admin',
          title: `⚠️ Alerta en Mantenimiento Preventivo: ${task.facilityName}`,
          message: `La inspección "${task.title}" finalizó con resultado "${chosenResult}". Observaciones: ${observations || 'Sin notas.'}`,
          type: 'preventive_inspection_warning',
          link: '/admin?tab=mantenimiento',
          deduplicationKey: `prev-warn-${id}`,
        });
      }
    }

    // 3. Verificación Administrativa
    else if (action === 'verify') {
      if (!authCheck.canManage) {
        return NextResponse.json({ error: 'Solo administradores pueden verificar preventivos.' }, { status: 403 });
      }

      const { verificationNotes } = body;
      updates.verifiedByUid = authCheck.uid || 'admin';
      updates.verifiedByName = operatorName;
      updates.verifiedAt = now;
      updates.verificationNotes = verificationNotes?.trim() || 'Verificado conforme.';

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'verificacion_preventivo',
        `Inspección preventiva verificada por supervisor.`
      );
      updates.auditLog = [...(task.auditLog || []), auditEntry];
    }

    // 4. Edición general
    else {
      if (body.title) updates.title = body.title.trim();
      if (body.scheduledDate) updates.scheduledDate = body.scheduledDate;
      if (body.assignedToUid && body.assignedToName) {
        updates.assignedToUid = body.assignedToUid;
        updates.assignedToName = body.assignedToName;
      }
      if (body.observations !== undefined) updates.observations = body.observations.trim();
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      task: { ...task, ...updates },
      message: 'Mantenimiento preventivo actualizado.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al modificar tarea preventiva';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
