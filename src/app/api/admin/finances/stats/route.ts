/**
 * FAMA - API de Estadísticas e Informes Financieros Pastorales
 * Ruta: GET /api/admin/finances/stats
 *
 * USO EXCLUSIVO EN SERVIDOR CON AUTORIZACIÓN PASTORAL / ADMIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_COLLECTIONS } from '@/lib/firebase/firestore';
import { verifyAdminRequest } from '@/lib/firebase/adminAuthHelper';
import { FinancialSummary, FinancialTransaction } from '@/types/models';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/finances/constants';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Verificación de permisos de administrador o pastor
  const authResult = await verifyAdminRequest(request);
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const db = getAdminFirestore();
  if (!db) {
    return NextResponse.json(
      { error: 'Servicio de base de datos no disponible en el servidor.' },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year') || String(new Date().getFullYear());
    const monthParam = searchParams.get('month'); // '01'..'12' o 'all'
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Determinar rango de fechas
    let startDate = '';
    let endDate = '';
    let periodLabel = '';

    if (customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
      periodLabel = `Rango personalizado: ${startDate} al ${endDate}`;
    } else if (monthParam && monthParam !== 'all') {
      const padMonth = monthParam.padStart(2, '0');
      startDate = `${yearParam}-${padMonth}-01`;
      // Último día del mes
      const lastDay = new Date(Number(yearParam), Number(padMonth), 0).getDate();
      endDate = `${yearParam}-${padMonth}-${String(lastDay).padStart(2, '0')}`;
      
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
      ];
      periodLabel = `${monthNames[Number(padMonth) - 1]} ${yearParam}`;
    } else {
      startDate = `${yearParam}-01-01`;
      endDate = `${yearParam}-12-31`;
      periodLabel = `Año ${yearParam}`;
    }

    // Consultar transacciones en Firestore
    // Leemos las transacciones para agregación
    const snap = await db
      .collection(FIRESTORE_COLLECTIONS.FINANCIAL_TRANSACTIONS)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    let totalIncome = 0;
    let totalExpenses = 0;
    let activeTransactionsCount = 0;
    let voidedTransactionsCount = 0;

    // Inicializar mapas de categorías
    const incomeByCategory: Record<string, { label: string; amount: number; count: number }> = {};
    for (const [key, val] of Object.entries(INCOME_CATEGORIES)) {
      incomeByCategory[key] = { label: val.label, amount: 0, count: 0 };
    }

    const expensesByCategory: Record<string, { label: string; amount: number; count: number }> = {};
    for (const [key, val] of Object.entries(EXPENSE_CATEGORIES)) {
      expensesByCategory[key] = { label: val.label, amount: 0, count: 0 };
    }

    // Inicializar desglose mensual (12 meses para el año seleccionado)
    const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthlyMap = new Map<string, { income: number; expenses: number }>();

    for (let m = 1; m <= 12; m++) {
      const key = `${yearParam}-${String(m).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expenses: 0 });
    }

    snap.forEach((doc) => {
      const t = doc.data() as FinancialTransaction;
      
      // Control crucial: Las transacciones anuladas NO se suman a ingresos, gastos ni balance
      if (t.status === 'voided') {
        voidedTransactionsCount++;
        return;
      }

      activeTransactionsCount++;
      const amount = Number(t.amount) || 0;
      const tMonth = (t.date || '').substring(0, 7); // 'YYYY-MM'

      if (t.type === 'income') {
        totalIncome += amount;
        if (!incomeByCategory[t.category]) {
          incomeByCategory[t.category] = { label: t.category, amount: 0, count: 0 };
        }
        incomeByCategory[t.category].amount += amount;
        incomeByCategory[t.category].count += 1;

        if (monthlyMap.has(tMonth)) {
          const curr = monthlyMap.get(tMonth)!;
          curr.income += amount;
        }
      } else if (t.type === 'expense') {
        totalExpenses += amount;
        if (!expensesByCategory[t.category]) {
          expensesByCategory[t.category] = { label: t.category, amount: 0, count: 0 };
        }
        expensesByCategory[t.category].amount += amount;
        expensesByCategory[t.category].count += 1;

        if (monthlyMap.has(tMonth)) {
          const curr = monthlyMap.get(tMonth)!;
          curr.expenses += amount;
        }
      }
    });

    const netBalance = totalIncome - totalExpenses;

    const monthlyBreakdown = Array.from(monthlyMap.entries()).map(([month, data]) => {
      const monthNum = parseInt(month.split('-')[1], 10);
      return {
        month,
        monthName: monthNamesShort[monthNum - 1] || month,
        income: Math.round(data.income * 100) / 100,
        expenses: Math.round(data.expenses * 100) / 100,
        balance: Math.round((data.income - data.expenses) * 100) / 100,
      };
    });

    const summary: FinancialSummary = {
      periodLabel,
      startDate,
      endDate,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      activeTransactionsCount,
      voidedTransactionsCount,
      incomeByCategory,
      expensesByCategory,
      monthlyBreakdown,
    };

    return NextResponse.json({ summary });
  } catch (err: unknown) {
    console.error('[API /admin/finances/stats] Error:', err);
    return NextResponse.json(
      { error: 'Error al calcular el resumen financiero pastoral.' },
      { status: 500 }
    );
  }
}
