import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyFacilityRequest, createFacilityAuditEntry } from '@/lib/facilities/facilityAuthHelper';
import { FacilityArea, FacilityOperationalStatus } from '@/types/models';

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

    const doc = await db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Instalación no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ facility: { id: doc.id, ...doc.data() } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al obtener instalación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyFacilityRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: 'No autorizado para modificar instalaciones físicas.' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Instalación no encontrada.' }, { status: 404 });
    }

    const currentData = docSnap.data() as FacilityArea;
    const body = await request.json();

    const updates: Partial<FacilityArea> = {
      updatedAt: new Date().toISOString(),
    };

    // Validar cambio de código si se proporciona
    if (body.code && body.code.trim().toUpperCase() !== currentData.code) {
      const normalizedCode = body.code.trim().toUpperCase();
      const duplicateCheck = await db
        .collection(FIRESTORE_COLLECTIONS.FACILITIES)
        .where('code', '==', normalizedCode)
        .limit(1)
        .get();

      if (!duplicateCheck.empty && duplicateCheck.docs[0].id !== id) {
        return NextResponse.json(
          { error: `El código "${normalizedCode}" ya está en uso por otra instalación.` },
          { status: 409 }
        );
      }
      updates.code = normalizedCode;
    }

    if (body.name && typeof body.name === 'string') updates.name = body.name.trim();
    if (body.location && typeof body.location === 'string') updates.location = body.location.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || '';
    if (body.operationalStatus) updates.operationalStatus = body.operationalStatus as FacilityOperationalStatus;
    if (body.managerUid !== undefined) updates.managerUid = body.managerUid || null;
    if (body.managerName !== undefined) updates.managerName = body.managerName || null;
    if (body.capacity !== undefined) updates.capacity = body.capacity;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || '';

    const auditEntry = createFacilityAuditEntry(
      authCheck.uid || 'admin',
      authCheck.profile?.displayName || 'Administrador',
      'edicion_instalacion',
      `Actualización de datos. Estado operativo: ${updates.operationalStatus || currentData.operationalStatus}`
    );

    const updatedAuditLog = [...(currentData.auditLog || []), auditEntry];
    updates.auditLog = updatedAuditLog;

    await docRef.update(updates);

    return NextResponse.json({
      success: true,
      facility: { ...currentData, ...updates, id },
      message: 'Instalación actualizada exitosamente.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al actualizar instalación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyFacilityRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para eliminar instalaciones.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.FACILITIES).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Instalación no encontrada.' }, { status: 404 });
    }

    // Verificar si existen reportes o tareas activas
    const activeTicketsSnap = await db
      .collection(FIRESTORE_COLLECTIONS.MAINTENANCE_TICKETS)
      .where('facilityId', '==', id)
      .where('status', 'in', ['reportado', 'en_revision', 'asignado', 'en_proceso', 'pendiente_materiales'])
      .limit(1)
      .get();

    if (!activeTicketsSnap.empty) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar un área con solicitudes de mantenimiento activas. Márquela como fuera de servicio.',
        },
        { status: 400 }
      );
    }

    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Área eliminada del catálogo.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al eliminar instalación';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
