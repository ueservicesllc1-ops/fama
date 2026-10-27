import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sendInventoryNotification,
} from '@/lib/inventory/inventoryAuthHelper';
import { isLoanOverdue } from '@/lib/inventory/inventoryClientHelper';
import { ResourceLoan, InventoryItem, LoanStatus } from '@/types/models';

export async function GET(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: authCheck.error || 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const resourceId = searchParams.get('resourceId');
    const overdueOnly = searchParams.get('overdue') === 'true';

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS);

    // Si es miembro común, aislar estrictamente sus préstamos
    if (!authCheck.canManage) {
      query = query.where('borrowerUid', '==', authCheck.uid);
    } else {
      const borrowerFilter = searchParams.get('borrowerUid');
      if (borrowerFilter) {
        query = query.where('borrowerUid', '==', borrowerFilter);
      }
    }

    if (resourceId) {
      query = query.where('resourceId', '==', resourceId);
    }
    if (statusParam && statusParam !== 'all' && statusParam !== 'vencido') {
      query = query.where('status', '==', statusParam);
    }

    const snapshot = await query.get();
    let loans: ResourceLoan[] = [];

    snapshot.forEach((doc) => {
      const loan = { id: doc.id, ...doc.data() } as ResourceLoan;

      // Detectar estado vencido dinámicamente si no fue devuelto a tiempo
      if (loan.status === 'entregado' && isLoanOverdue(loan)) {
        loan.status = 'vencido';
      }

      loans.push(loan);
    });

    if (statusParam === 'vencido' || overdueOnly) {
      loans = loans.filter((l) => l.status === 'vencido');
    }

    // Ordenar de más reciente a más antiguo
    loans.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

    return NextResponse.json({ loans, count: loans.length, canManage: authCheck.canManage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar préstamos';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: authCheck.error || 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const body = await request.json();
    const {
      resourceId,
      quantity = 1,
      expectedReturnDate,
      purpose,
      ministryId,
      ministryName,
      eventId,
      eventTitle,
      borrowerUid,
      borrowerName,
      borrowerEmail,
      borrowerPhone,
      immediateCheckout = false,
      conditionOnCheckout = 'bueno',
      checkoutNotes,
    } = body;

    if (!resourceId || typeof resourceId !== 'string') {
      return NextResponse.json({ error: 'Debe especificar el recurso a solicitar.' }, { status: 400 });
    }
    if (!expectedReturnDate || typeof expectedReturnDate !== 'string') {
      return NextResponse.json({ error: 'La fecha prevista de devolución es obligatoria.' }, { status: 400 });
    }
    if (!purpose || typeof purpose !== 'string' || !purpose.trim()) {
      return NextResponse.json({ error: 'Debe especificar el motivo o actividad del préstamo.' }, { status: 400 });
    }

    const requestedQty = Number(quantity);
    if (isNaN(requestedQty) || requestedQty < 1) {
      return NextResponse.json({ error: 'La cantidad solicitada debe ser al menos 1.' }, { status: 400 });
    }

    // Validar fecha futura de devolución
    const expectedTime = new Date(expectedReturnDate).getTime();
    if (isNaN(expectedTime) || expectedTime <= Date.now()) {
      return NextResponse.json(
        { error: 'La fecha prevista de devolución debe ser posterior al momento actual.' },
        { status: 400 }
      );
    }

    // Determinar destinatario del préstamo
    // Un miembro común solo puede solicitar para sí mismo
    const effectiveBorrowerUid = authCheck.canManage && borrowerUid ? borrowerUid : authCheck.uid!;
    const effectiveBorrowerName =
      authCheck.canManage && borrowerName
        ? borrowerName
        : authCheck.profile?.displayName || authCheck.email || 'Miembro FAMA';
    const effectiveBorrowerEmail =
      authCheck.canManage && borrowerEmail ? borrowerEmail : authCheck.email || '';
    const effectiveBorrowerPhone =
      authCheck.canManage && borrowerPhone ? borrowerPhone : authCheck.profile?.phone || '';

    // Ejecutar verificación y asignación con Firestore Transaction para garantizar consistencia atómica
    const result = await db.runTransaction(async (transaction) => {
      const resourceRef = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(resourceId);
      const resourceDoc = await transaction.get(resourceRef);

      if (!resourceDoc.exists) {
        throw new Error('El recurso especificado no existe en el catálogo.');
      }

      const item = resourceDoc.data() as InventoryItem;

      // 1. Bloquear préstamos de recursos dañados o fuera de servicio
      if (item.status === 'danado' || item.status === 'fuera_de_servicio' || item.status === 'requiere_revision') {
        throw new Error(
          `El recurso "${item.name}" se encuentra en estado "${item.status}" y no está disponible para préstamo.`
        );
      }

      // 2. Comprobar cantidad disponible
      if (item.quantityAvailable < requestedQty) {
        throw new Error(
          `Cantidad solicitada (${requestedQty}) superior a la disponible (${item.quantityAvailable} unidades de ${item.quantityTotal} totales).`
        );
      }

      // 3. Determinar estado inicial
      // REGLA: Los miembros comunes NO pueden aprobar sus propias solicitudes.
      // Su estado inicial es estrictamente 'solicitado'.
      let initialStatus: LoanStatus = 'solicitado';
      let checkoutDate: string | undefined = undefined;
      let approvedByUid: string | undefined = undefined;
      let approvedByName: string | undefined = undefined;
      let approvedAt: string | undefined = undefined;
      let deliveredByUid: string | undefined = undefined;
      let deliveredByName: string | undefined = undefined;

      const now = new Date().toISOString();

      if (authCheck.canManage && immediateCheckout) {
        initialStatus = 'entregado';
        checkoutDate = now;
        approvedByUid = authCheck.uid!;
        approvedByName = authCheck.profile?.displayName || authCheck.email || 'Encargado';
        approvedAt = now;
        deliveredByUid = authCheck.uid!;
        deliveredByName = approvedByName;

        // Descontar inmediatamente de la cantidad disponible en el catálogo
        transaction.update(resourceRef, {
          quantityAvailable: item.quantityAvailable - requestedQty,
          updatedAt: now,
        });
      }

      const loanDocRef = db.collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS).doc();

      const auditEntry = {
        action: initialStatus === 'entregado' ? 'entregado' : 'prestamo_solicitado',
        performedByUid: authCheck.uid!,
        performedByName: authCheck.profile?.displayName || authCheck.email || 'Usuario',
        timestamp: now,
        details:
          initialStatus === 'entregado'
            ? `Préstamo directo de ${requestedQty} unidad(es) registrado por administración.`
            : `Solicitud de préstamo de ${requestedQty} unidad(es) enviada por el miembro.`,
      };

      const newLoanData: ResourceLoan = {
        id: loanDocRef.id,
        resourceId,
        resourceName: item.name,
        resourceCode: item.code,
        category: item.category,
        quantity: requestedQty,
        borrowerUid: effectiveBorrowerUid,
        borrowerName: effectiveBorrowerName,
        borrowerEmail: effectiveBorrowerEmail,
        borrowerPhone: effectiveBorrowerPhone,
        ministryId: ministryId || undefined,
        ministryName: ministryName || undefined,
        eventId: eventId || undefined,
        eventTitle: eventTitle || undefined,
        purpose: purpose.trim(),
        requestedAt: now,
        checkoutDate,
        expectedReturnDate,
        approvedByUid,
        approvedByName,
        approvedAt,
        deliveredByUid,
        deliveredByName,
        conditionOnCheckout: conditionOnCheckout || 'bueno',
        checkoutNotes: checkoutNotes ? String(checkoutNotes).trim() : undefined,
        status: initialStatus,
        createdAt: now,
        updatedAt: now,
        auditLog: [auditEntry],
      };

      transaction.set(loanDocRef, newLoanData);

      return { newLoan: newLoanData, item };
    });

    // Enviar notificación interna
    if (result.newLoan.status === 'entregado') {
      await sendInventoryNotification({
        userId: effectiveBorrowerUid,
        title: 'Recurso Entregado en Préstamo',
        message: `Has recibido ${result.newLoan.quantity}x ${result.newLoan.resourceName} (${result.newLoan.resourceCode}). Devolución prevista: ${new Date(result.newLoan.expectedReturnDate).toLocaleDateString()}.`,
        type: 'resource_loan',
        deduplicationKey: `loan_checkout_${result.newLoan.id}`,
      });
    } else {
      await sendInventoryNotification({
        userId: effectiveBorrowerUid,
        title: 'Solicitud de Préstamo Recibida',
        message: `Tu solicitud para ${result.newLoan.quantity}x ${result.newLoan.resourceName} está en revisión por el encargado de inventario.`,
        type: 'resource_loan',
        deduplicationKey: `loan_request_${result.newLoan.id}`,
      });
    }

    return NextResponse.json({ success: true, loan: result.newLoan }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar préstamo';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
