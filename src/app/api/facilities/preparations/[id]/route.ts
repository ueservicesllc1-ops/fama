import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyFacilityRequest,
  createFacilityAuditEntry,
} from '@/lib/facilities/facilityAuthHelper';
import { EventFacilityPreparation } from '@/types/models';

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

    const doc = await db.collection(FIRESTORE_COLLECTIONS.EVENT_PREPARATIONS).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Lista de preparación no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ preparation: { id: doc.id, ...doc.data() } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar lista de preparación';
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

    const docRef = db.collection(FIRESTORE_COLLECTIONS.EVENT_PREPARATIONS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Lista de preparación no encontrada.' }, { status: 404 });
    }

    const prep = { id: docSnap.id, ...docSnap.data() } as EventFacilityPreparation;
    const body = await request.json();
    const { action } = body;

    const operatorName = authCheck.profile?.displayName || authCheck.email || 'Operador';
    const now = new Date().toISOString();
    const updates: Partial<EventFacilityPreparation> = {
      updatedAt: now,
    };

    // 1. Marcar una tarea completada o pendiente
    if (action === 'toggle_task') {
      const { taskId, completed, volunteerName } = body;
      const updatedTasks = prep.tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            completed: Boolean(completed),
            completedAt: completed ? now : undefined,
            assignedVolunteerName: volunteerName || task.assignedVolunteerName,
          };
        }
        return task;
      });

      updates.tasks = updatedTasks;
      const allCompleted = updatedTasks.every((t) => t.completed);
      const someCompleted = updatedTasks.some((t) => t.completed);

      // Si no están todas completas, NUNCA marcar automáticamente como lista
      if (allCompleted) {
        updates.status = 'lista';
        updates.preparedAt = now;
        updates.preparedByUid = authCheck.uid || 'anon';
        updates.preparedByName = operatorName;
      } else if (someCompleted) {
        updates.status = 'en_preparacion';
      } else {
        updates.status = 'pendiente';
      }

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'anon',
        operatorName,
        'tarea_preparacion_actualizada',
        `Tarea "${taskId}" marcada como ${completed ? 'completada' : 'pendiente'}.`
      );
      updates.auditLog = [...(prep.auditLog || []), auditEntry];
    }

    // 2. Verificación final de preparación por un supervisor o encargado
    else if (action === 'verify_preparation') {
      if (!authCheck.canManage) {
        return NextResponse.json(
          { error: 'Solo personal administrativo o coordinadores pueden verificar la preparación del área.' },
          { status: 403 }
        );
      }

      const allCompleted = prep.tasks.every((t) => t.completed);
      if (!allCompleted) {
        return NextResponse.json(
          { error: 'No se puede certificar el área como preparada mientras existan tareas pendientes.' },
          { status: 400 }
        );
      }

      updates.status = 'lista';
      updates.verifiedByUid = authCheck.uid || 'admin';
      updates.verifiedByName = operatorName;
      updates.verifiedAt = now;

      const auditEntry = createFacilityAuditEntry(
        authCheck.uid || 'admin',
        operatorName,
        'verificacion_preparacion_evento',
        `Instalación física certificada como lista para el evento "${prep.eventTitle}".`
      );
      updates.auditLog = [...(prep.auditLog || []), auditEntry];
    }

    // 3. Edición general
    else {
      if (!authCheck.canManage) {
        return NextResponse.json({ error: 'No autorizado para editar la lista.' }, { status: 403 });
      }
      if (body.notes !== undefined) updates.notes = body.notes.trim();
      if (body.status) updates.status = body.status;
    }

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      preparation: { ...prep, ...updates },
      message: 'Preparación de evento actualizada.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al modificar preparación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
