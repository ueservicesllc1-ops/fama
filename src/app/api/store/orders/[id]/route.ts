import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyStoreAdminRequest,
  sendStoreNotification,
  createStoreAuditEntry,
} from '@/lib/store/storeAuthHelper';
import { StoreOrder, StoreProduct, OrderStatus, PaymentStatus } from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const authCheck = await verifyStoreAdminRequest(request, false);
    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    let orderDoc = await db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS).doc(id).get();

    // Intentar buscar por orderNumber si no coincide por ID directo
    if (!orderDoc.exists) {
      const orderNumQuery = await db
        .collection(FIRESTORE_COLLECTIONS.STORE_ORDERS)
        .where('orderNumber', '==', id)
        .limit(1)
        .get();

      if (!orderNumQuery.empty) {
        orderDoc = orderNumQuery.docs[0];
      }
    }

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    }

    const orderData = orderDoc.data() as StoreOrder;
    const order: StoreOrder = { ...orderData, id: orderDoc.id };

    // Verificar permisos:
    // 1. Administrador/staff con permisos de gestión
    // 2. Comprador propietario autenticado (customerUid o userId)
    // 3. Comprador invitado con token de acceso seguro
    const isOwner =
      authCheck.authenticated &&
      Boolean(authCheck.uid) &&
      (order.customerUid === authCheck.uid || order.userId === authCheck.uid);
    const hasValidGuestToken = Boolean(
      token && order.guestAccessToken && token === order.guestAccessToken
    );

    if (!authCheck.canManage && !isOwner && !hasValidGuestToken) {
      return NextResponse.json(
        { error: 'No tienes autorización para consultar este pedido.' },
        { status: 403 }
      );
    }

    // Proteger privacidad: visitantes y clientes regulares no ven notas internas de administración
    if (!authCheck.canManage) {
      delete (order as any).internalNotes;
    }

    return NextResponse.json({ order });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al obtener pedido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyStoreAdminRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para gestionar pedidos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const orderRef = db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS).doc(id);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Pedido no encontrado.' }, { status: 404 });
    }

    const order = orderSnap.data() as StoreOrder;
    const body = await request.json();
    const { orderStatus, paymentStatus, trackingNumber, carrier, internalNotes } = body;

    const now = new Date().toISOString();
    const operatorName = authCheck.profile?.displayName || authCheck.email || 'Administrador';

    const updates: Partial<StoreOrder> = {
      updatedAt: now,
    };

    // Si el pedido se cancela y no estaba cancelado previamente, reintegrar existencias en transacción
    if (orderStatus === 'cancelado' && order.orderStatus !== 'cancelado') {
      await db.runTransaction(async (transaction) => {
        for (const item of order.items) {
          const productRef = db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(item.productId);
          const pDoc = await transaction.get(productRef);
          if (pDoc.exists) {
            const product = pDoc.data() as StoreProduct;
            const variants = product.variants || [];
            const vIdx = variants.findIndex((v) => v.id === item.variantId);
            if (vIdx >= 0) {
              const updatedVariants = [...variants];
              updatedVariants[vIdx] = {
                ...updatedVariants[vIdx],
                stock: updatedVariants[vIdx].stock + item.quantity,
              };
              const totalStock = updatedVariants.reduce((sum, v) => sum + (v.active !== false ? v.stock : 0), 0);
              transaction.update(productRef, {
                variants: updatedVariants,
                totalStock,
                updatedAt: now,
              });
            }
          }
        }
      });
    }

    if (orderStatus) updates.orderStatus = orderStatus as OrderStatus;
    if (paymentStatus) updates.paymentStatus = paymentStatus as PaymentStatus;
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber.trim();
    if (carrier !== undefined) updates.carrier = carrier.trim();
    if (internalNotes !== undefined) updates.internalNotes = internalNotes.trim();

    const auditEntry = createStoreAuditEntry(
      authCheck.uid || 'admin',
      operatorName,
      'actualizar_pedido',
      `Estado: ${updates.orderStatus || order.orderStatus}. Pago: ${updates.paymentStatus || order.paymentStatus}.`
    );

    updates.auditLog = [...(order.auditLog || []), auditEntry];

    await orderRef.update(updates);

    // Notificar al cliente sobre la actualización de su pedido
    if (order.customerUid && updates.orderStatus && updates.orderStatus !== order.orderStatus) {
      await sendStoreNotification({
        userId: order.customerUid,
        title: `Actualización de Pedido: ${order.orderNumber}`,
        message: `El estado de tu pedido ha cambiado a: ${updates.orderStatus.replace('_', ' ').toUpperCase()}.`,
        type: 'store_order_updated',
        link: '/perfil?tab=pedidos',
        deduplicationKey: `order-status-${id}-${updates.orderStatus}`,
      });
    }

    return NextResponse.json({
      success: true,
      order: { ...order, ...updates, id },
      message: 'Pedido actualizado exitosamente.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al modificar pedido';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
