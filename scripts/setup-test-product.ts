/**
 * Script de creación de producto de prueba temporal y controlado para auditoría
 * FAMA STORE — RENACER CHURCH
 */

import { getAdminFirestore } from '../src/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '../src/lib/firebase/firestore';
import { StoreProduct } from '../src/types/models';

export const TEST_PRODUCT_ID = 'test-prod-auditoria-controlada';

export const testProductData: StoreProduct = {
  id: TEST_PRODUCT_ID,
  name: '[PRUEBA AUDITORÍA] Camiseta Oficial FAMA',
  slug: 'test-camiseta-oficial-fama',
  description: 'Producto temporal para verificación funcional integrada de compra, carrito y checkout.',
  category: 'ropa',
  price: 10.0,
  costPrice: 4.0,
  images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'],
  totalStock: 10,
  status: 'published',
  isFeatured: true,
  variants: [
    {
      id: 'var-test-s',
      name: 'Talla S / Blanco Marfil',
      sku: 'TEST-FAMA-S-WHT',
      stock: 5,
      price: 10.0,
      active: true,
      size: 'S',
      color: 'Blanco Marfil',
    },
    {
      id: 'var-test-m',
      name: 'Talla M / Negro Carbón',
      sku: 'TEST-FAMA-M-BLK',
      stock: 5,
      price: 12.0,
      active: true,
      size: 'M',
      color: 'Negro Carbón',
    },
  ],
  tags: ['prueba', 'auditoria', 'controlada'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function createTestProduct() {
  const db = getAdminFirestore();
  if (!db) throw new Error('Firestore DB no disponible.');
  await db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(TEST_PRODUCT_ID).set(testProductData);
  console.log(`✅ Producto de prueba temporal registrado con ID: ${TEST_PRODUCT_ID}`);
}

createTestProduct().catch((err) => {
  console.error('Error al registrar producto de prueba:', err);
  process.exit(1);
});
