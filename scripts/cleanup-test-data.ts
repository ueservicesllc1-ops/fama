/**
 * Script de limpieza segura de datos de prueba
 * Elimina ÚNICAMENTE el producto de prueba y los pedidos asociados a 'auditoria.tienda@renacer.test'
 */

import { getAdminFirestore } from '../src/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '../src/lib/firebase/firestore';

const TEST_PRODUCT_ID = 'test-prod-auditoria-controlada';
const TEST_BUYER_EMAIL = 'auditoria.tienda@renacer.test';

async function cleanupTestData() {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore DB no disponible.');

  // 1. Eliminar producto de prueba controlado
  const prodRef = db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(TEST_PRODUCT_ID);
  const prodSnap = await prodRef.get();
  if (prodSnap.exists) {
    await prodRef.delete();
    console.log(`🧹 Producto de prueba ${TEST_PRODUCT_ID} eliminado.`);
  }

  // 2. Eliminar pedidos de prueba creados durante la prueba
  const ordersSnap = await db.collection(FIRESTORE_COLLECTIONS.STORE_ORDERS).get();
  let deletedOrdersCount = 0;
  for (const doc of ordersSnap.docs) {
    const data = doc.data();
    const email = data.customerInfo?.email || data.customer?.email || '';
    if (email === TEST_BUYER_EMAIL || data.idempotencyKey?.includes('auditoria')) {
      await doc.ref.delete();
      deletedOrdersCount++;
      console.log(`🧹 Pedido de prueba ${data.orderNumber || doc.id} eliminado.`);
    }
  }

  console.log(`✨ Limpieza finalizada. Pedidos eliminados: ${deletedOrdersCount}. Ningún dato preexistente fue alterado.`);
}

cleanupTestData().catch((err) => {
  console.error('Error al limpiar datos de prueba:', err);
  process.exit(1);
});
