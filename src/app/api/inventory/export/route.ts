import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyInventoryRequest } from '@/lib/inventory/inventoryAuthHelper';
import { getCategoryLabel } from '@/lib/inventory/inventoryClientHelper';
import { InventoryItem, ResourceLoan } from '@/types/models';

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para exportar datos de inventario.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get('type') || 'inventory'; // 'inventory' | 'loans'

    if (exportType === 'loans') {
      const snap = await db.collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS).get();
      const loans: ResourceLoan[] = [];
      snap.forEach((doc) => loans.push({ id: doc.id, ...doc.data() } as ResourceLoan));

      const headers = [
        'ID Préstamo',
        'Código Recurso',
        'Nombre Recurso',
        'Cantidad',
        'Solicitante',
        'Correo Solicitante',
        'Teléfono',
        'Ministerio / Actividad',
        'Motivo',
        'Estado',
        'Fecha Solicitud',
        'Fecha Entrega',
        'Fecha Prevista Devolución',
        'Fecha Real Devolución',
        'Autorizado Por',
        'Observaciones Entrega',
        'Observaciones Devolución',
      ];

      const rows = loans.map((l) => [
        escapeCsvCell(l.id),
        escapeCsvCell(l.resourceCode),
        escapeCsvCell(l.resourceName),
        escapeCsvCell(l.quantity),
        escapeCsvCell(l.borrowerName),
        escapeCsvCell(l.borrowerEmail),
        escapeCsvCell(l.borrowerPhone || ''),
        escapeCsvCell(l.ministryName || ''),
        escapeCsvCell(l.purpose),
        escapeCsvCell(l.status),
        escapeCsvCell(l.requestedAt ? new Date(l.requestedAt).toLocaleString('es-EC') : ''),
        escapeCsvCell(l.checkoutDate ? new Date(l.checkoutDate).toLocaleString('es-EC') : ''),
        escapeCsvCell(l.expectedReturnDate ? new Date(l.expectedReturnDate).toLocaleDateString('es-EC') : ''),
        escapeCsvCell(l.actualReturnDate ? new Date(l.actualReturnDate).toLocaleString('es-EC') : ''),
        escapeCsvCell(l.approvedByName || ''),
        escapeCsvCell(l.checkoutNotes || ''),
        escapeCsvCell(l.returnNotes || ''),
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="fama-prestamos-recursos-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Exportación de Inventario General
    const snap = await db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).get();
    const items: InventoryItem[] = [];
    snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as InventoryItem));

    const headers = [
      'Código Interno',
      'Nombre del Recurso',
      'Categoría',
      'Marca',
      'Modelo',
      'Número de Serie',
      'Cantidad Total',
      'Cantidad Disponible',
      'Ubicación Habitual',
      'Estado Físico',
      'Responsable / Custodio',
      ...(authCheck.canViewFinancials ? ['Costo Adquisición (USD)'] : []),
      'Fecha Adquisición',
      'Observaciones',
    ];

    const rows = items.map((i) => {
      const row = [
        escapeCsvCell(i.code),
        escapeCsvCell(i.name),
        escapeCsvCell(getCategoryLabel(i.category)),
        escapeCsvCell(i.brand || ''),
        escapeCsvCell(i.model || ''),
        escapeCsvCell(i.serialNumber || ''),
        escapeCsvCell(i.quantityTotal),
        escapeCsvCell(i.quantityAvailable),
        escapeCsvCell(i.location),
        escapeCsvCell(i.status),
        escapeCsvCell(i.currentCustodian || ''),
      ];

      if (authCheck.canViewFinancials) {
        row.push(escapeCsvCell(i.acquisitionCost !== undefined ? i.acquisitionCost.toFixed(2) : ''));
      }

      row.push(escapeCsvCell(i.acquisitionDate || ''));
      row.push(escapeCsvCell(i.notes || ''));
      return row;
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="fama-inventario-recursos-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al exportar';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
