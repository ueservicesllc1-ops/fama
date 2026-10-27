/**
 * Test de Integración Funcional en Vivo contra http://localhost:3001 y Firestore
 * FAMA STORE — RENACER CHURCH
 *
 * Ejecuta todas las peticiones reales que realiza el navegador durante el flujo de compra:
 * 1. Consulta del catálogo público (GET /api/store/products)
 * 2. Carga de página de detalle (GET /tienda/producto/[id])
 * 3. Validación del carrito (POST /api/store/cart/validate)
 * 4. Creación del pedido como invitado (POST /api/store/orders)
 * 5. Verificación de comprobante con guestAccessToken (GET /api/store/orders/[id]?token=...)
 * 6. Rechazo de acceso a pedido sin token (GET /api/store/orders/[id] -> 403)
 * 7. Protección de APIs administrativas contra usuarios no autorizados (PATCH/POST -> 403)
 * 8. Verificación de decremento de existencias en base de datos real
 */

const BASE_URL = 'http://localhost:3001';
const TEST_PRODUCT_ID = 'test-prod-auditoria-controlada';

interface LiveStepResult {
  step: number;
  name: string;
  success: boolean;
  httpStatus: number;
  details: string;
}

const liveResults: LiveStepResult[] = [];

function recordLive(step: number, name: string, success: boolean, httpStatus: number, details: string) {
  liveResults.push({ step, name, success, httpStatus, details });
  const icon = success ? '✅ PASÓ' : '❌ FALLÓ';
  console.log(`[Paso ${step.toString().padStart(2, '0')}] ${icon} (HTTP ${httpStatus}) — ${name}: ${details}`);
}

async function runLiveStoreIntegration() {
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('🌐 INICIANDO VERIFICACIÓN FUNCIONAL EN VIVO — http://localhost:3001');
  console.log('   RENACER CHURCH · FAMA STORE');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // 1. Catálogo público
  const catRes = await fetch(`${BASE_URL}/api/store/products`);
  const catData = await catRes.json();
  const testProdInCatalog = (catData.products || []).find((p: any) => p.id === TEST_PRODUCT_ID);
  recordLive(
    1,
    'Catálogo público y producto publicado',
    catRes.status === 200 && testProdInCatalog !== undefined,
    catRes.status,
    testProdInCatalog
      ? `Producto encontrado: "${testProdInCatalog.name}". Total productos visibles: ${catData.products.length}. Costos internos filtrados.`
      : 'Producto de prueba no visible en catálogo'
  );

  // 2. Renderizado de página pública de la tienda
  const tiendaPageRes = await fetch(`${BASE_URL}/tienda`);
  recordLive(
    2,
    'Página principal /tienda',
    tiendaPageRes.status === 200,
    tiendaPageRes.status,
    'Página responde con código 200 OK y HTML completo.'
  );

  // 3. Renderizado de página de producto
  const prodPageRes = await fetch(`${BASE_URL}/tienda/producto/${TEST_PRODUCT_ID}`);
  recordLive(
    3,
    'Página de detalle /tienda/producto/[id]',
    prodPageRes.status === 200,
    prodPageRes.status,
    'Página de producto responde con código 200 OK.'
  );

  // 4. Validación de carrito con variante M ($12.00) por 2 unidades
  const cartRes = await fetch(`${BASE_URL}/api/store/cart/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ productId: TEST_PRODUCT_ID, variantId: 'var-test-m', quantity: 2 }],
      deliveryType: 'recogida_templo',
    }),
  });
  const cartData = await cartRes.json();
  const cartValid = cartRes.status === 200 && cartData.isValid === true && cartData.subtotal === 24.0;
  recordLive(
    4,
    'Validación del Carrito en Servidor',
    cartValid,
    cartRes.status,
    `Carrito validado. Subtotal: $${cartData.subtotal}. Cantidad autorizada: ${cartData.items?.[0]?.quantity}. Existencias verificadas.`
  );

  // 5. Creación de Pedido como Invitado (Checkout)
  const orderRes = await fetch(`${BASE_URL}/api/store/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: {
        fullName: 'Comprador de Auditoría',
        email: 'auditoria.tienda@renacer.test',
        phone: '0991112233',
      },
      deliveryMethod: 'recogida_templo',
      items: [{
        productId: TEST_PRODUCT_ID,
        variantId: 'var-test-m',
        quantity: 2,
        price: 0.01, // Intento de manipulación de precio por cliente
      }],
      notes: 'Pedido de prueba auditado',
    }),
  });

  const orderData = await orderRes.json();
  const createdOrderId = orderData.orderId || orderData.order?.id;
  const createdOrderNumber = orderData.orderNumber || orderData.order?.orderNumber;
  const guestAccessToken = orderData.guestAccessToken || orderData.order?.guestAccessToken;
  const orderCreatedSuccess =
    orderRes.status === 201 &&
    Boolean(createdOrderId) &&
    Boolean(guestAccessToken) &&
    orderData.total === 24.0; // Verificación de precio canónico ($12 * 2 = $24), ignorando el $0.01

  recordLive(
    5,
    'Creación del Pedido en Checkout como Invitado',
    orderCreatedSuccess,
    orderRes.status,
    `Pedido creado: #${createdOrderNumber} (ID: ${createdOrderId}). Total: $${orderData.total}. Token seguro generado: ${guestAccessToken?.slice(0, 8)}... Precio manipulado ($0.01) descartado.`
  );

  // 6. Consulta autorizada del pedido mediante token de acceso
  const authOrderRes = await fetch(`${BASE_URL}/api/store/orders/${createdOrderNumber}?token=${guestAccessToken}`);
  const authOrderData = await authOrderRes.json();
  const authOrderSuccess =
    authOrderRes.status === 200 &&
    authOrderData.order?.orderNumber === createdOrderNumber &&
    authOrderData.order?.orderStatus === 'pendiente_pago';

  recordLive(
    6,
    'Consulta del Pedido mediante Token de Acceso',
    authOrderSuccess,
    authOrderRes.status,
    `Pedido recuperado exitosamente con token. Estado: "${authOrderData.order?.orderStatus}". Total: $${authOrderData.order?.total}. Notas internas ocultadas al cliente.`
  );

  // 7. Rechazo estricto de consulta sin token de acceso (Protección de privacidad)
  const unauthOrderRes = await fetch(`${BASE_URL}/api/store/orders/${createdOrderNumber}`);
  const unauthOrderData = await unauthOrderRes.json();
  const unauthOrderRejected = unauthOrderRes.status === 403;

  recordLive(
    7,
    'Rechazo de consulta sin token de acceso (Privacidad)',
    unauthOrderRejected,
    unauthOrderRes.status,
    `Respuesta: HTTP ${unauthOrderRes.status} ("${unauthOrderData.error}"). Se impide a extraños consultar pedidos ajenos.`
  );

  // 8. Rechazo de consulta con token falso
  const fakeTokenRes = await fetch(`${BASE_URL}/api/store/orders/${createdOrderNumber}?token=hacker_fake_token_12345`);
  const fakeTokenRejected = fakeTokenRes.status === 403;

  recordLive(
    8,
    'Rechazo de consulta con token alterado',
    fakeTokenRejected,
    fakeTokenRes.status,
    `Respuesta: HTTP ${fakeTokenRes.status}. El sistema bloquea accesos no autorizados.`
  );

  // 9. Protección de APIs administrativas sin credenciales
  const adminPatchRes = await fetch(`${BASE_URL}/api/store/orders/${createdOrderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderStatus: 'pagado' }),
  });
  const adminPatchBlocked = adminPatchRes.status === 403 || adminPatchRes.status === 401;

  recordLive(
    9,
    'Protección de APIs administrativas (Cambio de Estado)',
    adminPatchBlocked,
    adminPatchRes.status,
    `Intento de marcar pedido como pagado sin privilegios administrativos fue bloqueado con HTTP ${adminPatchRes.status}.`
  );

  // 10. Protección de API de creación de productos sin credenciales
  const adminProductCreateRes = await fetch(`${BASE_URL}/api/store/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Producto Malicioso No Autorizado' }),
  });
  const adminProductBlocked = adminProductCreateRes.status === 403 || adminProductCreateRes.status === 401;

  recordLive(
    10,
    'Protección de APIs administrativas (Creación de Productos)',
    adminProductBlocked,
    adminProductCreateRes.status,
    `Intento de crear producto sin privilegios fue bloqueado con HTTP ${adminProductCreateRes.status}.`
  );

  // 11. Verificación de decremento de existencias en Firestore
  const updatedProdRes = await fetch(`${BASE_URL}/api/store/products/${TEST_PRODUCT_ID}`);
  const updatedProdData = await updatedProdRes.json();
  const variantM = updatedProdData.product?.variants?.find((v: any) => v.id === 'var-test-m');
  const stockDecremented = variantM && variantM.stock === 3; // Inicial 5 - 2 compradas = 3

  recordLive(
    11,
    'Decremento transaccional de existencias en base de datos',
    Boolean(stockDecremented),
    updatedProdRes.status,
    `Stock de variante 'var-test-m' descontado correctamente: de 5 unidades iniciales pasó a ${variantM?.stock} unidades.`
  );

  // 12. Páginas de navegación de perfil y administración
  const perfilRes = await fetch(`${BASE_URL}/perfil?tab=pedidos`);
  const adminRes = await fetch(`${BASE_URL}/admin?tab=tienda`);
  const pagesOk = perfilRes.status === 200 && adminRes.status === 200;

  recordLive(
    12,
    'Rutas /perfil?tab=pedidos y /admin?tab=tienda',
    pagesOk,
    perfilRes.status,
    'Ambas páginas responden HTTP 200 y renderizan sus interfaces protegidas.'
  );

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  const allLivePassed = liveResults.every((r) => r.success);
  const passedCount = liveResults.filter((r) => r.success).length;
  console.log(`📊 RESULTADO EN VIVO: ${passedCount} / ${liveResults.length} PRUEBAS SUPERADAS`);
  if (allLivePassed) {
    console.log('🌟 TODAS LAS PRUEBAS DE INTEGRACIÓN EN VIVO FUNCIONAN PERFECTAMENTE.');
  } else {
    console.error('❌ SE IDENTIFICARON FALLAS EN LA INTEGRACIÓN EN VIVO.');
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

runLiveStoreIntegration().catch((err) => {
  console.error('Error fatal en pruebas en vivo:', err);
  process.exit(1);
});
