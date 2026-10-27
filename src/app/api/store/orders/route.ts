import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyStoreAdminRequest,
  sendStoreNotification,
  createStoreAuditEntry,
} from '@/lib/store/storeAuthHelper';
import {
  StoreOrder,
  StoreProduct,
  OrderItemSnapshot,
  OrderStatus,
  PaymentStatus,
} from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyStoreAdminRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'Debe iniciar sesión para consultar pedidos.' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const searchParam = searchParams.get('search')?.toLowerCase().trim();

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS);

    // Los clientes regulares SOLO pueden ver sus propios pedidos
    if (!authCheck.canManage) {
      query = query.where('customerUid', '==', authCheck.uid);
    } else if (statusParam && statusParam !== 'todos') {
      query = query.where('orderStatus', '==', statusParam);
    }

    const snapshot = await query.get();
    let orders: StoreOrder[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StoreOrder[];

    if (searchParam) {
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(searchParam) ||
          ((o.customerInfo?.name || o.customerInfo?.fullName || o.customer?.fullName || '').toLowerCase().includes(searchParam)) ||
          ((o.customerInfo?.email || o.customer?.email || '').toLowerCase().includes(searchParam)) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(searchParam))
      );
    }

    // Ordenar por fecha de creación descendente
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ orders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar pedidos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyStoreAdminRequest(request, false);
    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const body = await request.json();

    // Comprobación de idempotencia: si se reenvía la misma solicitud, devolver el pedido existente
    if (body.idempotencyKey && typeof body.idempotencyKey === 'string') {
      const existingSnap = await db
        .collection(FIRESTORE_COLLECTIONS.STORE_ORDERS)
        .where('idempotencyKey', '==', body.idempotencyKey.trim())
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existingOrder = existingSnap.docs[0].data() as StoreOrder;
        return NextResponse.json({
          success: true,
          orderId: existingSnap.docs[0].id,
          orderNumber: existingOrder.orderNumber,
          guestAccessToken: existingOrder.guestAccessToken,
          order: {
            id: existingSnap.docs[0].id,
            orderNumber: existingOrder.orderNumber,
            guestAccessToken: existingOrder.guestAccessToken,
            total: existingOrder.total,
            orderStatus: existingOrder.orderStatus,
            status: existingOrder.status || existingOrder.orderStatus,
          },
          total: existingOrder.total,
          message: 'Pedido ya registrado previamente con esta clave de idempotencia.',
        });
      }
    }

    // 1. Normalizar y validar datos del comprador (soporta customerInfo o customer)
    const rawCustomer = body.customerInfo || body.customer || {};
    if (!rawCustomer || typeof rawCustomer !== 'object') {
      return NextResponse.json({ error: 'Los datos del comprador son obligatorios.' }, { status: 400 });
    }

    const name = (rawCustomer.name || rawCustomer.fullName || '').trim();
    const email = (rawCustomer.email || '').trim().toLowerCase();
    const phone = (rawCustomer.phone || '').trim();
    const deliveryType =
      rawCustomer.deliveryType || body.deliveryMethod || body.deliveryType || 'recogida_templo';
    const shippingAddress = rawCustomer.shippingAddress || body.shippingAddress;
    const notes = (rawCustomer.notes || body.notes || '').trim();

    if (!name) {
      return NextResponse.json({ error: 'El nombre completo del comprador es obligatorio.' }, { status: 400 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Correo electrónico válido es obligatorio.' }, { status: 400 });
    }
    if (deliveryType === 'envio_domicilio') {
      if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
        return NextResponse.json(
          { error: 'Para envío a domicilio, la calle y ciudad de entrega son obligatorias.' },
          { status: 400 }
        );
      }
    }

    // 2. Validar artículos recibidos
    const items = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El pedido no contiene productos.' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const ordersSnap = await db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS).get();
    const orderSeq = String(ordersSnap.size + 1).padStart(4, '0');
    const orderNumber = `PED-${currentYear}-${orderSeq}`;

    let subtotal = 0;
    const orderItems: OrderItemSnapshot[] = [];
    const now = new Date().toISOString();
    const guestAccessToken = !authCheck.authenticated ? crypto.randomBytes(24).toString('hex') : undefined;

    // 3. Transacción atómica de Firestore: verificación de stock, precio y descuento
    const newOrderId = await db.runTransaction(async (transaction) => {
      // Leer y validar todos los productos primero
      const productDocs = await Promise.all(
        items.map((it: { productId: string }) =>
          transaction.get(db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(it.productId))
        )
      );

      // Verificar disponibilidad y calcular precios legítimos
      for (let i = 0; i < items.length; i++) {
        const itemReq = items[i];
        const pDoc = productDocs[i];

        if (!pDoc.exists) {
          throw new Error(`Uno de los productos seleccionados ya no existe en el catálogo.`);
        }

        const product = pDoc.data() as StoreProduct;
        if (product.status !== 'published') {
          throw new Error(`El producto "${product.name}" no está disponible para compra.`);
        }

        // Buscar variante respetando active !== false
        const variants = product.variants || [];
        const variantIdx = itemReq.variantId
          ? variants.findIndex((v) => v.id === itemReq.variantId && v.active !== false)
          : 0;

        if (variantIdx < 0 || !variants[variantIdx]) {
          throw new Error(`La variante seleccionada para "${product.name}" no existe o está inactiva.`);
        }

        const variant = variants[variantIdx];
        const requestedQty = Number(itemReq.quantity);

        if (requestedQty <= 0) {
          throw new Error(`La cantidad solicitada debe ser de al menos 1 unidad.`);
        }

        if (variant.stock < requestedQty) {
          throw new Error(
            `Existencias insuficientes para "${product.name} (${variant.name})". Disponibles: ${variant.stock}.`
          );
        }

        // Precio unitario tomado OBLIGATORIAMENTE de la base de datos (rechaza cualquier precio manipulado por el cliente)
        const unitPrice =
          typeof variant.price === 'number' && variant.price > 0
            ? variant.price
            : typeof (variant as any).priceOverride === 'number' && (variant as any).priceOverride > 0
            ? (variant as any).priceOverride
            : product.price;

        const lineSubtotal = unitPrice * requestedQty;
        subtotal += lineSubtotal;

        orderItems.push({
          productId: pDoc.id,
          productName: product.name,
          variantId: variant.id,
          variantName: variant.name,
          sku: variant.sku,
          unitPrice,
          quantity: requestedQty,
          image: product.images?.[0] || undefined,
          subtotal: lineSubtotal,
        });

        // Actualizar existencias de la variante y del producto
        const updatedVariants = [...variants];
        updatedVariants[variantIdx] = {
          ...variant,
          stock: variant.stock - requestedQty,
        };
        const updatedTotalStock = updatedVariants.reduce(
          (sum, v) => sum + (v.active !== false ? v.stock : 0),
          0
        );

        transaction.update(pDoc.ref, {
          variants: updatedVariants,
          totalStock: updatedTotalStock,
          updatedAt: now,
        });
      }

      // Costos finales calculados por el servidor
      const shippingCost = deliveryType === 'envio_domicilio' ? 5.0 : 0.0;
      const taxCost = 0.0;
      const total = subtotal + shippingCost + taxCost;

      const auditEntry = createStoreAuditEntry(
        authCheck.authenticated && authCheck.uid ? authCheck.uid : 'guest',
        name,
        'creacion_pedido',
        `Pedido ${orderNumber} registrado por un total de $${total.toFixed(2)}. Estado: pendiente_pago.`
      );

      const newOrderRef = db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS).doc();

      const custObj: Record<string, any> = {
        name,
        fullName: name,
        email,
        phone,
        deliveryType,
      };
      if (rawCustomer.documentId?.trim()) custObj.documentId = rawCustomer.documentId.trim();
      if (deliveryType === 'envio_domicilio' && shippingAddress) custObj.shippingAddress = shippingAddress;
      if (notes) custObj.notes = notes;

      const newOrder: Record<string, any> = {
        orderNumber,
        customerInfo: custObj,
        customer: custObj,
        items: orderItems,
        subtotal,
        shippingCost,
        taxCost,
        taxAmount: taxCost,
        total,
        orderStatus: 'pendiente_pago' as OrderStatus,
        status: 'pendiente_pago' as OrderStatus,
        paymentStatus: 'pendiente' as PaymentStatus,
        paymentMethod: deliveryType === 'recogida_templo' ? 'presencial_templo' : 'coordinacion_manual',
        deliveryMethod: deliveryType,
        createdAt: now,
        updatedAt: now,
        auditLog: [auditEntry],
      };

      if (authCheck.authenticated && authCheck.uid) {
        newOrder.customerUid = authCheck.uid;
        newOrder.userId = authCheck.uid;
      }
      if (deliveryType === 'envio_domicilio' && shippingAddress) {
        newOrder.shippingAddress = shippingAddress;
      }
      if (notes) newOrder.notes = notes;
      if (guestAccessToken) newOrder.guestAccessToken = guestAccessToken;
      if (body.idempotencyKey) newOrder.idempotencyKey = String(body.idempotencyKey).trim();

      transaction.set(newOrderRef, newOrder);
      return newOrderRef.id;
    });

    // 4. Notificar al cliente autenticado si tiene cuenta
    if (authCheck.authenticated && authCheck.uid) {
      await sendStoreNotification({
        userId: authCheck.uid,
        title: `Pedido Recibido: ${orderNumber}`,
        message: `Tu pedido por $${(subtotal + (deliveryType === 'envio_domicilio' ? 5 : 0)).toFixed(2)} ha sido registrado con éxito. Estado: Pendiente de Pago.`,
        type: 'store_order_created',
        link: '/perfil?tab=pedidos',
        deduplicationKey: `order-created-${newOrderId}`,
      });
    }

    const grandTotal = subtotal + (deliveryType === 'envio_domicilio' ? 5.0 : 0.0);

    return NextResponse.json(
      {
        success: true,
        orderId: newOrderId,
        orderNumber,
        guestAccessToken,
        order: {
          id: newOrderId,
          orderNumber,
          guestAccessToken,
          total: grandTotal,
          orderStatus: 'pendiente_pago',
          status: 'pendiente_pago',
        },
        total: grandTotal,
        message:
          'Pedido registrado con éxito. Debido a que la pasarela de pagos en línea se encuentra en proceso de integración, tu pedido queda reservado en estado Pendiente de Pago para coordinar su abono.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al procesar el pedido';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
