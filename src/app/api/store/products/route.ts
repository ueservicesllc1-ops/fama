import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyStoreAdminRequest,
  sanitizeProductFinancials,
  createStoreAuditEntry,
} from '@/lib/store/storeAuthHelper';
import {
  StoreProduct,
  StoreCategory,
  ProductVariant,
} from '@/types/models';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyStoreAdminRequest(request, false);
    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const statusParam = searchParams.get('status');

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS);

    // Los usuarios no autorizados o invitados SOLO pueden consultar productos publicados
    if (!authCheck.canManage) {
      query = query.where('status', '==', 'published');
    } else if (statusParam && statusParam !== 'todos') {
      query = query.where('status', '==', statusParam);
    }

    if (category && category !== 'todos') {
      query = query.where('category', '==', category);
    }

    if (featured === 'true') {
      query = query.where('isFeatured', '==', true);
    }

    const snapshot = await query.get();
    let products: StoreProduct[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StoreProduct[];

    // Filtrado por texto en nombre, descripción o etiquetas
    if (search) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(search))) ||
          (p.variants && p.variants.some((v) => (v.sku || '').toLowerCase().includes(search)))
      );
    }

    // Ordenar: destacados primero, luego por fecha de actualización descendente
    products.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Sanitizar costos de adquisición
    const sanitized = sanitizeProductFinancials(products, authCheck.canViewFinancials);

    return NextResponse.json({ products: sanitized });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al consultar productos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyStoreAdminRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: 'No autorizado para crear productos en FAMA Store.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      shortDescription,
      price,
      compareAtPrice,
      costPrice,
      category,
      subcategory,
      images,
      variants,
      status,
      isFeatured,
      shippingInfo,
      returnPolicy,
      tags,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del producto es obligatorio.' }, { status: 400 });
    }

    if (typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'El precio debe ser un número positivo mayor a 0.' }, { status: 400 });
    }

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'Debe seleccionar una categoría válida.' }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const baseSlug = slugify(name);
    let finalSlug = baseSlug;

    // Verificar unicidad de slug
    const duplicateSlug = await db
      .collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS)
      .where('slug', '==', finalSlug)
      .limit(1)
      .get();

    if (!duplicateSlug.empty) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Validar variantes y calcular existencias totales
    const formattedVariants: ProductVariant[] = Array.isArray(variants) && variants.length > 0
      ? variants.map((v, idx) => ({
          id: v.id || `var-${idx + 1}-${Date.now().toString().slice(-4)}`,
          name: v.name || `Opción ${idx + 1}`,
          sku: v.sku || `${finalSlug.toUpperCase().slice(0, 8)}-${idx + 1}`,
          price: typeof v.price === 'number' && v.price > 0 ? v.price : undefined,
          stock: typeof v.stock === 'number' && v.stock >= 0 ? v.stock : 0,
          size: v.size,
          color: v.color,
          colorHex: v.colorHex,
          active: v.active !== false,
        }))
      : [
          {
            id: 'var-default',
            name: 'Estándar',
            sku: `${finalSlug.toUpperCase().slice(0, 10)}-STD`,
            stock: 10,
            active: true,
          },
        ];

    const totalStock = formattedVariants.reduce((sum, v) => sum + (v.active ? v.stock : 0), 0);
    const now = new Date().toISOString();
    const operatorName = authCheck.profile?.displayName || authCheck.email || 'Administrador';

    const auditEntry = createStoreAuditEntry(
      authCheck.uid || 'admin',
      operatorName,
      'crear_producto',
      `Producto creado con ${formattedVariants.length} variantes. Stock inicial: ${totalStock}. Estado: ${status || 'draft'}.`
    );

    const newProduct: Omit<StoreProduct, 'id'> = {
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || '',
      shortDescription: shortDescription?.trim() || '',
      price,
      compareAtPrice: typeof compareAtPrice === 'number' && compareAtPrice > 0 ? compareAtPrice : undefined,
      costPrice: authCheck.canViewFinancials && typeof costPrice === 'number' ? costPrice : undefined,
      category: category as StoreCategory,
      subcategory: subcategory?.trim() || undefined,
      images: Array.isArray(images) && images.length > 0 ? images : [],
      variants: formattedVariants,
      totalStock,
      status: status === 'published' ? 'published' : 'draft', // Por defecto borrador salvo indicación explícita
      isFeatured: Boolean(isFeatured),
      shippingInfo: shippingInfo?.trim() || undefined,
      returnPolicy: returnPolicy?.trim() || undefined,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now,
      createdByUid: authCheck.uid || 'admin',
      createdByName: operatorName,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.STORE_PRODUCTS).add(newProduct);

    return NextResponse.json(
      {
        success: true,
        product: { id: docRef.id, ...newProduct },
        message: 'Producto registrado exitosamente en el catálogo.',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error al crear producto';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
