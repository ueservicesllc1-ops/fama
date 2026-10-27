import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sanitizeItemFinancials,
} from '@/lib/inventory/inventoryAuthHelper';
import { InventoryItem, ResourceStatus, ResourceCategory } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json(
        { error: authCheck.error || 'Autenticación requerida' },
        { status: 401 }
      );
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json(
        { error: 'Base de datos no disponible' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const location = searchParams.get('location');
    const search = searchParams.get('search')?.toLowerCase().trim();
    const lendableOnly = searchParams.get('lendable') === 'true';

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS);

    if (category && category !== 'all') {
      query = query.where('category', '==', category);
    }
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    if (location && location !== 'all') {
      query = query.where('location', '==', location);
    }

    const snapshot = await query.get();
    let items: InventoryItem[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as InventoryItem;
      items.push({ ...data, id: doc.id });
    });

    // Filtro en memoria para búsqueda textual por nombre, código o número de serie
    if (search) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.code.toLowerCase().includes(search) ||
          (item.serialNumber && item.serialNumber.toLowerCase().includes(search)) ||
          (item.brand && item.brand.toLowerCase().includes(search)) ||
          (item.model && item.model.toLowerCase().includes(search))
      );
    }

    // Filtro para catálogo de préstamos de miembros (solo equipos aptos y disponibles)
    if (lendableOnly) {
      items = items.filter(
        (item) =>
          (item.status === 'nuevo' || item.status === 'bueno') &&
          item.quantityAvailable > 0
      );
    }

    // Ordenar alfabéticamente por código y nombre
    items.sort((a, b) => a.code.localeCompare(b.code));

    // Sanitizar costos financieros según permisos del usuario
    const sanitizedItems = sanitizeItemFinancials(items, authCheck.canViewFinancials);

    return NextResponse.json({
      items: sanitizedItems,
      totalCount: sanitizedItems.length,
      canManage: authCheck.canManage,
      canViewFinancials: authCheck.canViewFinancials,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al obtener inventario';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, true);
    if (!authCheck.authenticated || !authCheck.canManage) {
      return NextResponse.json(
        { error: authCheck.error || 'Permisos insuficientes para registrar recursos.' },
        { status: 403 }
      );
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 });
    }

    const body = await request.json();
    const {
      name,
      category,
      code,
      brand,
      model,
      serialNumber,
      quantityTotal,
      location,
      status = 'bueno',
      acquisitionDate,
      acquisitionCost,
      imageUrl,
      notes,
      currentCustodian,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del recurso es obligatorio.' }, { status: 400 });
    }
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'La categoría es obligatoria.' }, { status: 400 });
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { error: 'El código interno único es obligatorio (ej: REN-SND-001).' },
        { status: 400 }
      );
    }
    if (typeof quantityTotal !== 'number' || quantityTotal < 1) {
      return NextResponse.json(
        { error: 'La cantidad total debe ser al menos 1.' },
        { status: 400 }
      );
    }
    if (!location || typeof location !== 'string' || !location.trim()) {
      return NextResponse.json(
        { error: 'La ubicación habitual del recurso es obligatoria.' },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();

    // 1. Validar que el código interno sea estrictamente único
    const duplicateCodeSnap = await db
      .collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS)
      .where('code', '==', normalizedCode)
      .limit(1)
      .get();

    if (!duplicateCodeSnap.empty) {
      return NextResponse.json(
        {
          error: `El código interno "${normalizedCode}" ya está registrado en otro recurso. Debe ser único.`,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const isLendableStatus = status === 'nuevo' || status === 'bueno';
    // Si el estado inicial es dañado o fuera de servicio, la cantidad disponible es 0
    const quantityAvailable = isLendableStatus ? quantityTotal : 0;

    const auditEntry = {
      action: 'creado',
      performedByUid: authCheck.uid!,
      performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
      timestamp: now,
      details: `Recurso registrado con código ${normalizedCode} (${quantityTotal} unidades)`,
    };

    const newItemData: Omit<InventoryItem, 'id'> = {
      name: name.trim(),
      category: category as ResourceCategory,
      code: normalizedCode,
      brand: brand ? String(brand).trim() : undefined,
      model: model ? String(model).trim() : undefined,
      serialNumber: serialNumber ? String(serialNumber).trim() : undefined,
      quantityTotal,
      quantityAvailable,
      location: location.trim(),
      status: status as ResourceStatus,
      acquisitionDate: acquisitionDate ? String(acquisitionDate) : undefined,
      acquisitionCost:
        typeof acquisitionCost === 'number' && acquisitionCost >= 0
          ? acquisitionCost
          : undefined,
      imageUrl: imageUrl ? String(imageUrl).trim() : undefined,
      notes: notes ? String(notes).trim() : undefined,
      currentCustodian: currentCustodian ? String(currentCustodian).trim() : undefined,
      createdByUid: authCheck.uid!,
      createdByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
      createdAt: now,
      updatedAt: now,
      auditLog: [auditEntry],
    };

    const docRef = await db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).add(newItemData);
    const createdItem: InventoryItem = {
      id: docRef.id,
      ...newItemData,
    };

    const sanitized = sanitizeItemFinancials(createdItem, authCheck.canViewFinancials);

    return NextResponse.json({ success: true, item: sanitized }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar recurso';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
