import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyStoreAdminRequest } from '@/lib/store/storeAuthHelper';
import { INITIAL_DEMO_PRODUCTS } from '@/lib/store/storeClientHelper';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyStoreAdminRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para inicializar catálogo.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const existingSnap = await db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).get();
    if (existingSnap.size > 0) {
      return NextResponse.json({
        message: 'El catálogo ya contiene productos. No se aplicó seed.',
        count: existingSnap.size,
      });
    }

    const batch = db.batch();
    const created = [];

    for (const demo of INITIAL_DEMO_PRODUCTS) {
      const docRef = db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc();
      batch.set(docRef, demo);
      created.push({ id: docRef.id, name: demo.name, status: demo.status });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Se crearon ${created.length} productos de demostración iniciales en estado BORRADOR (draft).`,
      products: created,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al inicializar catálogo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
