import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { StoreProduct, ProductVariant } from '@/types/models';

interface CartValidateRequestItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const body = await request.json();
    const { items, deliveryType } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        isValid: false,
        error: 'El carrito no contiene artículos para validar.',
        items: [],
        subtotal: 0,
        shippingCost: 0,
        taxCost: 0,
        total: 0,
      });
    }

    const validatedItems = [];
    const errors: string[] = [];
    let subtotal = 0;

    for (const rawItem of items as CartValidateRequestItem[]) {
      if (!rawItem.productId || typeof rawItem.quantity !== 'number' || rawItem.quantity <= 0) {
        continue;
      }

      const productDoc = await db
        .collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS)
        .doc(rawItem.productId)
        .get();

      if (!productDoc.exists) {
        errors.push(`El producto solicitado ya no se encuentra en el catálogo.`);
        continue;
      }

      const product = { id: productDoc.id, ...productDoc.data() } as StoreProduct;

      if (product.status !== 'published') {
        errors.push(`El producto "${product.name}" no está disponible para compra.`);
        continue;
      }

      // Buscar variante respetando active !== false
      let matchedVariant: ProductVariant | undefined;
      if (rawItem.variantId && Array.isArray(product.variants)) {
        matchedVariant = product.variants.find((v) => v.id === rawItem.variantId && v.active !== false);
      } else if (Array.isArray(product.variants) && product.variants.length > 0) {
        matchedVariant = product.variants.find((v) => v.active !== false);
      }

      const availableStock = matchedVariant ? matchedVariant.stock : product.totalStock;

      if (availableStock <= 0) {
        errors.push(
          `La opción "${matchedVariant?.name || 'Estándar'}" de "${product.name}" está agotada.`
        );
        continue;
      }

      const legitimateUnitPrice =
        matchedVariant && typeof matchedVariant.price === 'number' && matchedVariant.price > 0
          ? matchedVariant.price
          : matchedVariant &&
            typeof (matchedVariant as any).priceOverride === 'number' &&
            (matchedVariant as any).priceOverride > 0
          ? (matchedVariant as any).priceOverride
          : product.price;

      const safeQuantity = Math.min(rawItem.quantity, availableStock);
      if (safeQuantity < rawItem.quantity) {
        errors.push(
          `Solo hay ${availableStock} unidades disponibles de "${product.name} (${matchedVariant?.name || 'Estándar'})". Cantidad ajustada.`
        );
      }

      const itemSubtotal = legitimateUnitPrice * safeQuantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        variantId: matchedVariant?.id,
        variantName: matchedVariant?.name,
        sku: matchedVariant?.sku || product.slug.toUpperCase(),
        unitPrice: legitimateUnitPrice,
        quantity: safeQuantity,
        maxStock: availableStock,
        image: product.images?.[0] || undefined,
        subtotal: itemSubtotal,
      });
    }

    // Cálculo de costos de envío e impuestos
    const shippingCost = deliveryType === 'envio_domicilio' ? 5.0 : 0.0;
    const taxCost = 0.0; // Configurado por RENACER CHURCH según régimen sin impuestos adicionales en donaciones/merchandise
    const total = subtotal + shippingCost + taxCost;

    return NextResponse.json({
      isValid: errors.length === 0 && validatedItems.length > 0,
      errors,
      items: validatedItems,
      subtotal,
      shippingCost,
      taxCost,
      total,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al validar carrito';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
