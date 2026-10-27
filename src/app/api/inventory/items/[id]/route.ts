import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sanitizeItemFinancials,
} from '@/lib/inventory/inventoryAuthHelper';
import { InventoryItem, ResourceStatus, ResourceCategory, ResourceLoan } from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: authCheck.error || 'No autorizado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docSnap = await db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Recurso no encontrado' }, { status: 404 });
    }

    const item = { id: docSnap.id, ...docSnap.data() } as InventoryItem;
    const sanitized = sanitizeItemFinancials(item, authCheck.canViewFinancials);

    return NextResponse.json({ item: sanitized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar recurso';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: authCheck.error || 'Permisos insuficientes para editar recursos.' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Recurso no encontrado.' }, { status: 404 });
    }

    const currentData = docSnap.data() as InventoryItem;
    const body = await request.json();

    const updates: Partial<InventoryItem> = {};
    const now = new Date().toISOString();

    // 1. Si cambia el código, verificar que no duplique a otro recurso
    if (body.code && typeof body.code === 'string') {
      const normalizedCode = body.code.trim().toUpperCase();
      if (normalizedCode !== currentData.code) {
        const dupCheck = await db
          .collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS)
          .where('code', '==', normalizedCode)
          .limit(1)
          .get();

        if (!dupCheck.empty && dupCheck.docs[0].id !== id) {
          return NextResponse.json(
            { error: `El código "${normalizedCode}" ya está registrado en otro recurso.` },
            { status: 409 }
          );
        }
        updates.code = normalizedCode;
      }
    }

    if (body.name && typeof body.name === 'string') updates.name = body.name.trim();
    if (body.category && typeof body.category === 'string') updates.category = body.category as ResourceCategory;
    if (body.brand !== undefined) updates.brand = body.brand ? String(body.brand).trim() : undefined;
    if (body.model !== undefined) updates.model = body.model ? String(body.model).trim() : undefined;
    if (body.serialNumber !== undefined) updates.serialNumber = body.serialNumber ? String(body.serialNumber).trim() : undefined;
    if (body.location && typeof body.location === 'string') updates.location = body.location.trim();
    if (body.acquisitionDate !== undefined) updates.acquisitionDate = body.acquisitionDate ? String(body.acquisitionDate) : undefined;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl ? String(body.imageUrl).trim() : undefined;
    if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : undefined;
    if (body.currentCustodian !== undefined) updates.currentCustodian = body.currentCustodian ? String(body.currentCustodian).trim() : undefined;

    // Solo actualizar costo si tiene permisos financieros
    if (authCheck.canViewFinancials && body.acquisitionCost !== undefined) {
      updates.acquisitionCost = typeof body.acquisitionCost === 'number' && body.acquisitionCost >= 0
        ? body.acquisitionCost
        : undefined;
    }

    // 2. Gestionar cambios de cantidad y estado
    const targetTotal = typeof body.quantityTotal === 'number' ? body.quantityTotal : currentData.quantityTotal;
    const targetStatus = (body.status as ResourceStatus) || currentData.status;

    if (targetTotal < 1) {
      return NextResponse.json({ error: 'La cantidad total no puede ser inferior a 1.' }, { status: 400 });
    }

    // Consultar préstamos activos para calcular disponibilidad real
    const activeLoansSnap = await db
      .collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS)
      .where('resourceId', '==', id)
      .where('status', 'in', ['entregado', 'aprobado'])
      .get();

    let currentlyLentQuantity = 0;
    activeLoansSnap.forEach((doc) => {
      const loan = doc.data() as ResourceLoan;
      currentlyLentQuantity += loan.quantity || 1;
    });

    if (targetTotal < currentlyLentQuantity) {
      return NextResponse.json(
        {
          error: `No es posible reducir la cantidad total a ${targetTotal} porque actualmente hay ${currentlyLentQuantity} unidades en préstamo activo o reservadas.`,
        },
        { status: 400 }
      );
    }

    updates.quantityTotal = targetTotal;
    updates.status = targetStatus;

    // Si el estado es dañado o fuera de servicio, la cantidad disponible para préstamos es 0
    if (targetStatus === 'danado' || targetStatus === 'fuera_de_servicio' || targetStatus === 'requiere_revision') {
      updates.quantityAvailable = 0;
    } else {
      updates.quantityAvailable = Math.max(0, targetTotal - currentlyLentQuantity);
    }

    // Registrar en historial de auditoría
    const auditEntry = {
      action: 'actualizado',
      performedByUid: authCheck.uid!,
      performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
      timestamp: now,
      details: body.auditReason || 'Edición de datos del recurso',
    };

    const currentAudit = Array.isArray(currentData.auditLog) ? currentData.auditLog : [];
    updates.updatedAt = now;
    updates.auditLog = [...currentAudit, auditEntry];

    await docRef.update(updates);

    const updatedSnap = await docRef.get();
    const updatedItem = { id: updatedSnap.id, ...updatedSnap.data() } as InventoryItem;
    const sanitized = sanitizeItemFinancials(updatedItem, authCheck.canViewFinancials);

    return NextResponse.json({ success: true, item: sanitized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar recurso';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'Solo personal autorizado puede dar de baja recursos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Recurso no encontrado.' }, { status: 404 });
    }

    // Verificar si tiene préstamos activos
    const activeLoans = await db
      .collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS)
      .where('resourceId', '==', id)
      .where('status', 'in', ['solicitado', 'aprobado', 'entregado'])
      .get();

    if (!activeLoans.empty) {
      return NextResponse.json(
        {
          error:
            'No se puede dar de baja un recurso que tiene solicitudes o préstamos activos. Concluya o cancele los préstamos antes.',
        },
        { status: 400 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true, message: 'Recurso eliminado del catálogo.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al eliminar recurso';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
