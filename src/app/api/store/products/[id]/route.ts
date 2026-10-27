import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyStoreAdminRequest,
  sanitizeProductFinancials,
  createStoreAuditEntry,
} from '@/lib/store/storeAuthHelper';
import { StoreProduct, ProductVariant, StoreCategory, ProductPublicationStatus } from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyStoreAdminRequest(request, false);
    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    let productDoc = await db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(id).get();

    // Si no se encuentra por ID, intentar buscar por slug
    if (!productDoc.exists) {
      const slugQuery = await db
        .collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS)
        .where('slug', '==', id)
        .limit(1)
        .get();

      if (!slugQuery.empty) {
        productDoc = slugQuery.docs[0];
      }
    }

    if (!productDoc.exists) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    const product = { id: productDoc.id, ...productDoc.data() } as StoreProduct;

    // Si está en borrador y no es administrador, no exponerlo al público
    if (product.status === 'draft' && !authCheck.canManage) {
      return NextResponse.json({ error: 'Producto no disponible para la venta.' }, { status: 404 });
    }

    const sanitized = sanitizeProductFinancials(product, authCheck.canViewFinancials);
    return NextResponse.json({ product: sanitized });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al obtener producto';
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
      return NextResponse.json({ error: 'No autorizado para modificar productos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    const current = docSnap.data() as StoreProduct;
    const body = await request.json();
    const now = new Date().toISOString();
    const operatorName = authCheck.profile?.displayName || authCheck.email || 'Administrador';

    const updates: Partial<StoreProduct> = {
      updatedAt: now,
    };

    if (body.name && typeof body.name === 'string') updates.name = body.name.trim();
    if (body.description !== undefined) updates.description = body.description?.trim() || '';
    if (body.shortDescription !== undefined) updates.shortDescription = body.shortDescription?.trim() || '';
    if (typeof body.price === 'number' && body.price > 0) updates.price = body.price;
    if (body.compareAtPrice !== undefined) updates.compareAtPrice = body.compareAtPrice;
    if (authCheck.canViewFinancials && body.costPrice !== undefined) updates.costPrice = body.costPrice;
    if (body.category) updates.category = body.category as StoreCategory;
    if (body.subcategory !== undefined) updates.subcategory = body.subcategory;
    if (Array.isArray(body.images)) updates.images = body.images;
    if (body.status) updates.status = body.status as ProductPublicationStatus;
    if (body.isFeatured !== undefined) updates.isFeatured = Boolean(body.isFeatured);
    if (body.shippingInfo !== undefined) updates.shippingInfo = body.shippingInfo;
    if (body.returnPolicy !== undefined) updates.returnPolicy = body.returnPolicy;
    if (Array.isArray(body.tags)) updates.tags = body.tags;

    // Actualización de variantes y recálculo de existencias totales
    if (Array.isArray(body.variants)) {
      const formattedVariants: ProductVariant[] = (body.variants as Array<Partial<ProductVariant>>).map((v, idx: number) => ({
        id: v.id || `var-${idx + 1}`,
        name: v.name || `Variante ${idx + 1}`,
        sku: v.sku || `SKU-${idx + 1}`,
        price: typeof v.price === 'number' && v.price > 0 ? v.price : undefined,
        stock: typeof v.stock === 'number' && v.stock >= 0 ? v.stock : 0,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        active: v.active !== false,
      }));

      updates.variants = formattedVariants;
      updates.totalStock = formattedVariants.reduce((sum, v) => sum + (v.active ? v.stock : 0), 0);
    }

    const auditEntry = createStoreAuditEntry(
      authCheck.uid || 'admin',
      operatorName,
      'editar_producto',
      `Actualización de producto. Estado: ${updates.status || current.status}. Existencias: ${updates.totalStock ?? current.totalStock}`
    );

    updates.auditLog = [...(current.auditLog || []), auditEntry];

    await docRef.update(updates);

    const updatedProduct = { ...current, ...updates, id };
    const sanitized = sanitizeProductFinancials(updatedProduct, authCheck.canViewFinancials);

    return NextResponse.json({
      success: true,
      product: sanitized,
      message: 'Producto actualizado exitosamente.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al modificar producto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyStoreAdminRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json({ error: 'No autorizado para eliminar productos.' }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docRef = db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado del catálogo.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al eliminar producto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
