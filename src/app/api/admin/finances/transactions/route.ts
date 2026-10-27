/**
 * FAMA - API de Transacciones Financieras (Ingresos y Gastos)
 * Rutas:
 *   GET  /api/admin/finances/transactions - Listar transacciones con filtros y búsqueda
 *   POST /api/admin/finances/transactions - Registrar un nuevo ingreso o gasto
 *
 * USO EXCLUSIVO EN SERVIDOR CON AUTORIZACIÓN PASTORAL / ADMIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import {
  FinancialTransaction,
  FinancialTransactionType,
  FinancialPaymentMethod,
  IncomeCategory,
  ExpenseCategory,
} from '@/types/models';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
} from '@/lib/finances/constants';

export const dynamic = 'force-dynamic';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// =========================================================================
// 1. GET: Consulta de transacciones con filtros avanzados
// =========================================================================
export async function GET(request: NextRequest) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: 'Base de datos no inicializada en el servidor.' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type'); // 'all' | 'income' | 'expense'
    const categoryFilter = searchParams.get('category');
    const statusFilter = searchParams.get('status'); // 'all' | 'active' | 'voided'
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    let query: FirebaseFirestore.Query = db.collection(FIRESTORE_COLLECTIONS.FINANCIAL_TRANSACTIONS);

    // Filtros de Firestore cuando apliquen
    if (typeFilter && (typeFilter === 'income' || typeFilter === 'expense')) {
      query = query.where('type', '==', typeFilter);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      query = query.where('category', '==', categoryFilter);
    }

    if (statusFilter && (statusFilter === 'active' || statusFilter === 'voided')) {
      query = query.where('status', '==', statusFilter);
    }

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const snap = await query.get();
    let transactions: FinancialTransaction[] = [];

    snap.forEach((doc) => {
      const data = doc.data() as FinancialTransaction;
      transactions.push({ ...data, id: doc.id });
    });

    // Ordenar en memoria por fecha descendente (y por createdAt descendente)
    transactions.sort((a, b) => {
      const dateDiff = (b.date || '').localeCompare(a.date || '');
      if (dateDiff !== 0) return dateDiff;
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    // Filtro de búsqueda en memoria (descripción, referencia, beneficiario, donante)
    if (searchQuery) {
      transactions = transactions.filter((t) => {
        const desc = (t.description || '').toLowerCase();
        const ref = (t.referenceNumber || '').toLowerCase();
        const ben = (t.beneficiary || '').toLowerCase();
        const don = (t.donorName || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const catLabel = (t.categoryLabel || '').toLowerCase();

        return (
          desc.includes(searchQuery) ||
          ref.includes(searchQuery) ||
          ben.includes(searchQuery) ||
          don.includes(searchQuery) ||
          cat.includes(searchQuery) ||
          catLabel.includes(searchQuery)
        );
      });
    }

    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (err: unknown) {
    console.error('[API /admin/finances/transactions GET] Error:', err);
    return NextResponse.json(
      { error: 'Error al consultar las transacciones financieras.' },
      { status: 500 }
    );
  }
}

// =========================================================================
// 2. POST: Registro de un nuevo ingreso o gasto
// =========================================================================
export async function POST(request: NextRequest) {
  const authResult = await verifyAdminRequest(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: 'Base de datos no inicializada en el servidor.' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const {
      type,
      amount,
      currency = 'USD',
      date,
      category,
      method,
      referenceNumber,
      description,
      donorName,
      purposeDetails,
      beneficiary,
    } = body;

    // 1. Validar Tipo
    if (type !== 'income' && type !== 'expense') {
      return NextResponse.json(
        { error: 'Tipo de transacción inválido. Debe ser ingreso o gasto.' },
        { status: 400 }
      );
    }

    // 2. Validar Importe
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: 'El importe debe ser un número positivo mayor a 0.' },
        { status: 400 }
      );
    }
    if (numAmount > 10000000) {
      return NextResponse.json(
        { error: 'El importe excede el límite máximo permitido por operación.' },
        { status: 400 }
      );
    }
    const cleanAmount = Math.round(numAmount * 100) / 100;

    // 3. Validar Fecha
    if (!date || typeof date !== 'string' || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { error: 'Fecha inválida. Debe tener formato YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    // 4. Validar Categoría
    let categoryLabel = '';
    if (type === 'income') {
      if (!category || !(category in INCOME_CATEGORIES)) {
        return NextResponse.json(
          { error: 'Categoría de ingreso inválida o no autorizada.' },
          { status: 400 }
        );
      }
      categoryLabel = INCOME_CATEGORIES[category as IncomeCategory].label;
    } else {
      if (!category || !(category in EXPENSE_CATEGORIES)) {
        return NextResponse.json(
          { error: 'Categoría de gasto inválida o no autorizada.' },
          { status: 400 }
        );
      }
      categoryLabel = EXPENSE_CATEGORIES[category as ExpenseCategory].label;
    }

    // 5. Validar Método de Pago
    if (!method || !(method in PAYMENT_METHODS)) {
      return NextResponse.json(
        { error: 'Método de pago / recepción no válido.' },
        { status: 400 }
      );
    }

    // 6. Validar Descripción
    if (!description || typeof description !== 'string' || description.trim().length < 2) {
      return NextResponse.json(
        { error: 'Por favor proporcione una descripción breve de la transacción (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }

    const cleanDescription = description.trim().substring(0, 300);
    const cleanRef = referenceNumber && typeof referenceNumber === 'string'
      ? referenceNumber.trim().substring(0, 80)
      : undefined;

    const nowIso = new Date().toISOString();
    const docRef = db.collection(FIRESTORE_COLLECTIONS.FINANCIAL_TRANSACTIONS).doc();

    const transactionData: FinancialTransaction = {
      id: docRef.id,
      type: type as FinancialTransactionType,
      amount: cleanAmount,
      currency: typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'USD',
      date,
      category: category as IncomeCategory | ExpenseCategory,
      categoryLabel,
      method: method as FinancialPaymentMethod,
      referenceNumber: cleanRef || undefined,
      description: cleanDescription,
      donorName: type === 'income' && donorName && typeof donorName === 'string' ? donorName.trim().substring(0, 100) : undefined,
      purposeDetails: type === 'income' && purposeDetails && typeof purposeDetails === 'string' ? purposeDetails.trim().substring(0, 200) : undefined,
      beneficiary: type === 'expense' && beneficiary && typeof beneficiary === 'string' ? beneficiary.trim().substring(0, 100) : undefined,
      status: 'active',
      createdByUid: authResult.uid || 'admin',
      createdByName: authResult.displayName || 'Administrador Pastoral',
      createdByEmail: authResult.email || 'admin@renacerchurch.org',
      createdAt: nowIso,
    };

    await docRef.set(transactionData);

    return NextResponse.json({
      success: true,
      transaction: transactionData,
      message: `${type === 'income' ? 'Ingreso' : 'Gasto'} registrado exitosamente.`,
    });
  } catch (err: unknown) {
    console.error('[API /admin/finances/transactions POST] Error:', err);
    return NextResponse.json(
      { error: 'Error al registrar la transacción financiera.' },
      { status: 500 }
    );
  }
}
