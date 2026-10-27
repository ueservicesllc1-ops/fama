import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import {
  verifyInventoryRequest,
  sendInventoryNotification,
} from '@/lib/inventory/inventoryAuthHelper';
import { ResourceLoan, InventoryItem, LoanStatus } from '@/types/models';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const docSnap = await db.collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS).doc(id).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 });
    }

    const loan = { id: docSnap.id, ...docSnap.data() } as ResourceLoan;

    // Aislamiento: si es miembro común y no es su propio préstamo, denegar acceso
    if (!authCheck.canManage && loan.borrowerUid !== authCheck.uid) {
      return NextResponse.json({ error: 'Acceso denegado a este préstamo.' }, { status: 403 });
    }

    return NextResponse.json({ loan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al consultar préstamo';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const authCheck = await verifyInventoryRequest(request, false);
    if (!authCheck.authenticated) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const db = getAdminFirestore();
    if (!db) return NextResponse.json({ error: 'DB no disponible' }, { status: 500 });

    const body = await request.json();
    const { action, rejectionReason, conditionOnReturn, returnNotes, checkoutNotes } = body;

    const now = new Date().toISOString();

    const updatedLoan = await db.runTransaction(async (transaction) => {
      const loanRef = db.collection(FIRESTORE_COLLECTIONS.RESOURCE_LOANS).doc(id);
      const loanSnap = await transaction.get(loanRef);

      if (!loanSnap.exists) {
        throw new Error('Préstamo no encontrado.');
      }

      const loan = loanSnap.data() as ResourceLoan;
      const resourceRef = db.collection(FIRESTORE_COLLECTIONS.INVENTORY_ITEMS).doc(loan.resourceId);
      const resourceSnap = await transaction.get(resourceRef);

      const auditLog = Array.isArray(loan.auditLog) ? [...loan.auditLog] : [];

      // =========================================================================
      // ACCIÓN: CANCELAR (permitido al solicitante si aún está 'solicitado' o al manager)
      // =========================================================================
      if (action === 'cancel') {
        const isBorrower = loan.borrowerUid === authCheck.uid;
        if (!isBorrower && !authCheck.canManage) {
          throw new Error('No tienes permisos para cancelar esta solicitud.');
        }

        if (loan.status === 'entregado') {
          throw new Error('No puedes cancelar un recurso que ya fue entregado. Debe registrarse la devolución.');
        }
        if (loan.status === 'devuelto' || loan.status === 'cancelado') {
          throw new Error(`El préstamo ya se encuentra en estado "${loan.status}".`);
        }

        // Si ya estaba aprobado, liberar unidades si correspondiera
        auditLog.push({
          action: 'cancelado',
          performedByUid: authCheck.uid!,
          performedByName: authCheck.profile?.displayName || authCheck.email || 'Usuario',
          timestamp: now,
          details: rejectionReason || (isBorrower ? 'Cancelado por el solicitante' : 'Cancelado por administración'),
        });

        transaction.update(loanRef, {
          status: 'cancelado',
          rejectionReason: rejectionReason || 'Cancelado a solicitud del usuario',
          updatedAt: now,
          auditLog,
        });

        return { ...loan, status: 'cancelado' as LoanStatus };
      }

      // Para el resto de acciones (aprobar, entregar, devolver, rechazar)
      // REGLA: Los miembros NO pueden aprobar ni gestionar sus propias solicitudes
      if (!authCheck.canManage) {
        throw new Error('Se requiere rol de Encargado de Inventario o Administrador para autorizar, entregar o recibir devoluciones.');
      }

      // =========================================================================
      // ACCIÓN: APROBAR
      // =========================================================================
      if (action === 'approve') {
        if (loan.status !== 'solicitado') {
          throw new Error(`Solo se pueden aprobar solicitudes en estado "solicitado" (estado actual: ${loan.status}).`);
        }

        auditLog.push({
          action: 'prestamo_aprobado',
          performedByUid: authCheck.uid!,
          performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          timestamp: now,
          details: 'Solicitud aprobada por el encargado de inventario',
        });

        transaction.update(loanRef, {
          status: 'aprobado',
          approvedByUid: authCheck.uid!,
          approvedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          approvedAt: now,
          updatedAt: now,
          auditLog,
        });

        return { ...loan, status: 'aprobado' as LoanStatus };
      }

      // =========================================================================
      // ACCIÓN: RECHAZAR
      // =========================================================================
      if (action === 'reject') {
        if (loan.status !== 'solicitado' && loan.status !== 'aprobado') {
          throw new Error(`No se puede rechazar un préstamo en estado "${loan.status}".`);
        }

        auditLog.push({
          action: 'rechazado',
          performedByUid: authCheck.uid!,
          performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          timestamp: now,
          details: rejectionReason ? `Rechazado: ${rejectionReason}` : 'Solicitud rechazada',
        });

        transaction.update(loanRef, {
          status: 'cancelado',
          rejectedByUid: authCheck.uid!,
          rejectedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          rejectedAt: now,
          rejectionReason: rejectionReason || 'Solicitud no admitida',
          updatedAt: now,
          auditLog,
        });

        return { ...loan, status: 'cancelado' as LoanStatus };
      }

      // =========================================================================
      // ACCIÓN: ENTREGAR (CHECKOUT)
      // =========================================================================
      if (action === 'checkout') {
        if (loan.status !== 'aprobado' && loan.status !== 'solicitado') {
          throw new Error(`No se puede entregar un recurso en estado "${loan.status}".`);
        }

        if (!resourceSnap.exists) {
          throw new Error('El recurso ya no existe en el catálogo.');
        }

        const item = resourceSnap.data() as InventoryItem;

        if (item.status === 'danado' || item.status === 'fuera_de_servicio') {
          throw new Error(`El recurso se encuentra ${item.status} y no puede ser entregado.`);
        }

        if (item.quantityAvailable < loan.quantity) {
          throw new Error(`Stock insuficiente para entregar ${loan.quantity} unidades (disponibles: ${item.quantityAvailable}).`);
        }

        auditLog.push({
          action: 'entregado',
          performedByUid: authCheck.uid!,
          performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          timestamp: now,
          details: checkoutNotes ? `Entrega confirmada: ${checkoutNotes}` : 'Equipo entregado físicamente',
        });

        // Descontar del catálogo
        transaction.update(resourceRef, {
          quantityAvailable: Math.max(0, item.quantityAvailable - loan.quantity),
          updatedAt: now,
        });

        transaction.update(loanRef, {
          status: 'entregado',
          checkoutDate: now,
          deliveredByUid: authCheck.uid!,
          deliveredByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          checkoutNotes: checkoutNotes ? String(checkoutNotes).trim() : undefined,
          updatedAt: now,
          auditLog,
        });

        return { ...loan, status: 'entregado' as LoanStatus, checkoutDate: now };
      }

      // =========================================================================
      // ACCIÓN: DEVOLVER (RETURN)
      // =========================================================================
      if (action === 'return') {
        if (loan.status !== 'entregado' && loan.status !== 'vencido') {
          throw new Error(`Solo se pueden devolver préstamos activos o vencidos (estado actual: ${loan.status}).`);
        }

        auditLog.push({
          action: 'devuelto',
          performedByUid: authCheck.uid!,
          performedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          timestamp: now,
          details: `Devolución recibida en estado "${conditionOnReturn || 'bueno'}". ${returnNotes ? `Notas: ${returnNotes}` : ''}`,
        });

        if (resourceSnap.exists) {
          const item = resourceSnap.data() as InventoryItem;
          const resourceUpdates: Partial<InventoryItem> = {
            updatedAt: now,
          };

          // Si el recurso se devolvió dañado, actualizar su estado en el catálogo y alertar
          if (conditionOnReturn === 'danado') {
            resourceUpdates.status = 'danado';
            resourceUpdates.notes = `Dañado tras devolución de préstamo ${id}: ${returnNotes || 'Sin notas'}`;
            // Dañado no suma a disponibilidad
          } else if (conditionOnReturn === 'regular') {
            resourceUpdates.status = 'requiere_revision';
            resourceUpdates.notes = `Requiere revisión tras devolución: ${returnNotes || ''}`;
          } else {
            // Reincorporar stock a disponible
            resourceUpdates.quantityAvailable = Math.min(
              item.quantityTotal,
              item.quantityAvailable + loan.quantity
            );
          }

          transaction.update(resourceRef, resourceUpdates);
        }

        transaction.update(loanRef, {
          status: 'devuelto',
          actualReturnDate: now,
          receivedByUid: authCheck.uid!,
          receivedByName: authCheck.profile?.displayName || authCheck.email || 'Encargado',
          conditionOnReturn: conditionOnReturn || 'bueno',
          returnNotes: returnNotes ? String(returnNotes).trim() : undefined,
          updatedAt: now,
          auditLog,
        });

        return {
          ...loan,
          status: 'devuelto' as LoanStatus,
          actualReturnDate: now,
          conditionOnReturn: conditionOnReturn || 'bueno',
          returnNotes: returnNotes ? String(returnNotes).trim() : undefined,
        };
      }

      throw new Error(`Acción desconocida "${action}".`);
    });

    // Enviar notificaciones tras la acción
    if (action === 'approve') {
      await sendInventoryNotification({
        userId: updatedLoan.borrowerUid,
        title: 'Préstamo Aprobado',
        message: `Tu solicitud para ${updatedLoan.resourceName} (${updatedLoan.resourceCode}) fue aprobada. Ya puedes retirarlo en la fecha indicada.`,
        type: 'resource_loan',
        deduplicationKey: `loan_approved_${id}`,
      });
    } else if (action === 'reject') {
      await sendInventoryNotification({
        userId: updatedLoan.borrowerUid,
        title: 'Solicitud de Préstamo No Aprobada',
        message: `Tu solicitud para ${updatedLoan.resourceName} fue rechazada. Motivo: ${updatedLoan.rejectionReason || 'No disponible'}.`,
        type: 'resource_loan',
        deduplicationKey: `loan_rejected_${id}`,
      });
    } else if (action === 'checkout') {
      await sendInventoryNotification({
        userId: updatedLoan.borrowerUid,
        title: 'Recurso Entregado',
        message: `Has recibido ${updatedLoan.quantity}x ${updatedLoan.resourceName}. Recuerda devolverlo antes del ${new Date(updatedLoan.expectedReturnDate).toLocaleDateString()}.`,
        type: 'resource_loan',
        deduplicationKey: `loan_checkout_${id}`,
      });
    } else if (action === 'return') {
      await sendInventoryNotification({
        userId: updatedLoan.borrowerUid,
        title: 'Devolución Registrada con Éxito',
        message: `Se ha registrado la entrega de ${updatedLoan.resourceName}. ¡Gracias por cuidar los recursos de la casa de Dios!`,
        type: 'resource_loan',
        deduplicationKey: `loan_return_${id}`,
      });
    }

    return NextResponse.json({ success: true, loan: updatedLoan });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar acción sobre el préstamo';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
