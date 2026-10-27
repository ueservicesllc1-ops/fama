import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyStoreAdminRequest } from '@/lib/store/storeAuthHelper';
import { StoreOrder } from '@/types/models';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value).replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyStoreAdminRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para exportar pedidos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const snap = await db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS).get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoreOrder));

    // Ordenar por fecha descendente
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const BOM = '\uFEFF';
    const headers = [
      'Número de Pedido',
      'Fecha Creación',
      'Cliente Nombre',
      'Cliente Email',
      'Cliente Teléfono',
      'Tipo Entrega',
      'Dirección Envío',
      'Artículos (Detalle)',
      'Cantidad Total',
      'Subtotal (USD)',
      'Envío (USD)',
      'Total (USD)',
      'Estado Pedido',
      'Estado Pago',
      'Guía / Courier',
    ];

    const rows = orders.map((o) => {
      const itemsSummary = o.items
        .map((it) => `${it.productName} [${it.variantName || 'Estándar'}] x${it.quantity} ($${it.unitPrice})`)
        .join('; ');

      const totalItemsQty = o.items.reduce((sum, it) => sum + it.quantity, 0);

      const addressStr = o.customerInfo.shippingAddress
        ? `${o.customerInfo.shippingAddress.street}, ${o.customerInfo.shippingAddress.city}`
        : 'Recogida presencial en RENACER';

      return [
        escapeCsv(o.orderNumber),
        escapeCsv(o.createdAt),
        escapeCsv(o.customerInfo.name),
        escapeCsv(o.customerInfo.email),
        escapeCsv(o.customerInfo.phone || ''),
        escapeCsv(o.customerInfo.deliveryType),
        escapeCsv(addressStr),
        escapeCsv(itemsSummary),
        escapeCsv(totalItemsQty),
        escapeCsv(o.subtotal.toFixed(2)),
        escapeCsv(o.shippingCost.toFixed(2)),
        escapeCsv(o.total.toFixed(2)),
        escapeCsv(o.orderStatus.toUpperCase()),
        escapeCsv(o.paymentStatus.toUpperCase()),
        escapeCsv(o.trackingNumber ? `${o.carrier || ''} ${o.trackingNumber}`.trim() : ''),
      ].join(',');
    });

    const csvContent = BOM + [headers.join(','), ...rows].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="FAMA_Store_Pedidos_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al exportar pedidos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
