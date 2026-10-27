import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sanitizeMaintenanceFinancials,
} from '@/lib/inventory/inventoryAuthHelper';
import { ResourceMaintenance, InventoryItem, MaintenanceStatus } from '@/types/models';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para gestionar mantenimientos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.RESOURCE_MAINTENANCE).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Registro de mantenimiento no encontrado.' }, { status: 404 });
    }

    const currentRecord = docSnap.data() as ResourceMaintenance;
    const body = await request.json();
    const { status, resolutionNotes, assignedTechnician, repairCost, restoreResourceAvailability = false } = body;

    const now = new Date().toISOString();
    const updates: Partial<ResourceMaintenance> = { updatedAt: now };

    if (status) updates.status = status as MaintenanceStatus;
    if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes ? String(resolutionNotes).trim() : undefined;
    if (assignedTechnician !== undefined) updates.assignedTechnician = assignedTechnician ? String(assignedTechnician).trim() : undefined;

    if (authCheck.canViewFinancials && repairCost !== undefined) {
      updates.repairCost = typeof repairCost === 'number' && repairCost >= 0 ? repairCost : undefined;
    }

    if (status === 'completado') {
      updates.completedDate = now.slice(0, 10);
    }

    const auditLog = Array.isArray(currentRecord.auditLog) ? [...currentRecord.auditLog] : [];
    auditLog.push({
      action: status === 'completado' ? 'mantenimiento_completado' : 'mantenimiento_actualizado',
      performedByUid: authCheck.uid!,
      performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
      timestamp: now,
      details: resolutionNotes ? `Actualización: ${resolutionNotes}` : `Estado actualizado a "${status}"`,
    });
    updates.auditLog = auditLog;

    await docRef.update(updates);

    // Si se completó la reparación y se solicita restaurar el recurso a buen estado
    if (status === 'completado' && restoreResourceAvailability && currentRecord.resourceId) {
      const resourceRef = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(currentRecord.resourceId);
      const resDoc = await resourceRef.get();
      if (resDoc.exists) {
        const item = resDoc.data() as InventoryItem;
        await resourceRef.update({
          status: 'bueno',
          quantityAvailable: item.quantityTotal, // Restablece disponibilidad
          updatedAt: now,
        });
      }
    }

    const updatedDoc = await docRef.get();
    const updatedRecord = { id: updatedDoc.id, ...updatedDoc.data() } as ResourceMaintenance;
    const sanitized = sanitizeMaintenanceFinancials(updatedRecord, authCheck.canViewFinancials);

    return NextResponse.json({ success: true, record: sanitized });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al actualizar mantenimiento';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
