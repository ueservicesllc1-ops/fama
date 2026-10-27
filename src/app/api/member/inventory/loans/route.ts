import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sanitizeItemFinancials,
} from '@/lib/inventory/inventoryAuthHelper';
import { isLoanOverdue } from '@/lib/inventory/inventoryClientHelper';
import { ResourceLoan, InventoryItem, Ministry } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: authCheck.error || 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    // 1. Consultar préstamos propios del miembro
    const loansSnap = await db
      .collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS)
      .where('borrowerUid', '==', authCheck.uid)
      .get();

    const myLoans: ResourceLoan[] = [];
    loansSnap.forEach((doc) => {
      const loan = { id: doc.id, ...doc.data() } as ResourceLoan;
      if (loan.status === 'entregado' && isLoanOverdue(loan)) {
        loan.status = 'vencido';
      }
      myLoans.push(loan);
    });

    myLoans.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    // 2. Consultar catálogo de recursos aptos para préstamo (status nuevo o bueno con stock > 0)
    const itemsSnap = await db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).get();
    const lendableItems: InventoryItem[] = [];

    itemsSnap.forEach((doc) => {
      const item = { id: doc.id, ...doc.data() } as InventoryItem;
      if ((item.status === 'nuevo' || item.status === 'bueno') && item.quantityAvailable > 0) {
        lendableItems.push(item);
      }
    });

    lendableItems.sort((a, b) => a.name.localeCompare(b.name));

    // Sanitizar costos (ocultos para miembros comunes)
    const sanitizedLendable = sanitizeItemFinancials(lendableItems, authCheck.canViewFinancials);

    // 3. Consultar ministerios para seleccionar en solicitudes
    const minSnap = await db.collection(FIRESTORE_COLLECTIONS.MINISTRIES).get();
    const ministries: Array<{ id: string; name: string }> = [];
    minSnap.forEach((doc) => {
      const data = doc.data() as Ministry;
      ministries.push({ id: doc.id, name: data.name });
    });

    return NextResponse.json({
      myLoans,
      activeLoansCount: myLoans.filter((l) => l.status === 'entregado' || l.status === 'vencido').length,
      pendingRequestsCount: myLoans.filter((l) => l.status === 'solicitado').length,
      lendableItems: sanitizedLendable,
      ministries,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al obtener préstamos del miembro';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
