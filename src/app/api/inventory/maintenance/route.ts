import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sanitizeMaintenanceFinancials,
} from '@/lib/inventory/inventoryAuthHelper';
import { ResourceMaintenance, InventoryItem, MaintenanceStatus } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para ver mantenimientos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const resourceId = searchParams.get('resourceId');

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.RESOURCE_MAINTENANCE);

    if (resourceId) {
      query = query.where('resourceId', '==', resourceId);
    }
    if (statusParam && statusParam !== 'all') {
      query = query.where('status', '==', statusParam);
    }

    const snapshot = await query.get();
    const records: ResourceMaintenance[] = [];

    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() } as ResourceMaintenance);
    });

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const sanitized = sanitizeMaintenanceFinancials(records, authCheck.canViewFinancials);

    return NextResponse.json({ records: sanitized, count: sanitized.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar mantenimientos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para registrar mantenimientos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const body = await request.json();
    const {
      resourceId,
      problemDescription,
      assignedTechnician,
      repairCost,
      status = 'reportado',
      markResourceAsDamaged = true,
    } = body;

    if (!resourceId || typeof resourceId !== 'string') {
      return NextResponse.json({ error: 'Debe especificar el recurso a reportar.' }, { status: 400 });
    }
    if (!problemDescription || typeof problemDescription !== 'string' || !problemDescription.trim()) {
      return NextResponse.json({ error: 'La descripción del problema es obligatoria.' }, { status: 400 });
    }

    const resourceRef = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(resourceId);
    const resourceDoc = await resourceRef.get();
    if (!resourceDoc.exists) {
      return NextResponse.json({ error: 'El recurso especificado no existe.' }, { status: 404 });
    }

    const item = resourceDoc.data() as InventoryItem;
    const now = new Date().toISOString();

    const auditEntry = {
      action: 'mantenimiento_iniciado',
      performedByUid: authCheck.uid!,
      performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
      timestamp: now,
      details: `Reporte de falla: ${problemDescription.trim()}`,
    };

    const newRecordData: Omit<ResourceMaintenance, 'id'> = {
      resourceId,
      resourceName: item.name,
      resourceCode: item.code,
      reportedDate: now.slice(0, 10),
      problemDescription: problemDescription.trim(),
      reportedByUid: authCheck.uid!,
      reportedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
      assignedTechnician: assignedTechnician ? String(assignedTechnician).trim() : undefined,
      repairCost:
        authCheck.canViewFinancials && typeof repairCost === 'number' && repairCost >= 0
          ? repairCost
          : undefined,
      status: status as MaintenanceStatus,
      createdAt: now,
      updatedAt: now,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.RESOURCE_MAINTENANCE).add(newRecordData);

    // Si se indicó marcar el recurso como dañado o fuera de servicio, actualizar su catálogo
    if (markResourceAsDamaged) {
      const resourceAudit = Array.isArray(item.auditLog) ? [...item.auditLog] : [];
      resourceAudit.push(auditEntry);

      await resourceRef.update({
        status: 'requiere_revision',
        quantityAvailable: 0, // Inhabilitar para préstamos mientras esté en revisión
        updatedAt: now,
        auditLog: resourceAudit,
      });
    }

    const createdRecord: ResourceMaintenance = { id: docRef.id, ...newRecordData };
    const sanitized = sanitizeMaintenanceFinancials(createdRecord, authCheck.canViewFinancials);

    return NextResponse.json({ success: true, record: sanitized }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar mantenimiento';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
