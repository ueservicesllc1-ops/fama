'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  Scale,
  Search,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
  Ban,
  Building,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  FinancialTransaction,
  FinancialSummary,
  IncomeCategory,
  ExpenseCategory,
  FinancialPaymentMethod,
} from '@/types/models';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  formatCurrency,
} from '@/lib/finances/constants';

interface FinancesManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type TabType = 'resumen' | 'ingresos' | 'gastos' | 'historial' | 'informes';

export function FinancesManager({ onNotify }: FinancesManagerProps) {
  const { user } = useAuth();

  // Estados de pestañas y filtros
  const [activeTab, setActiveTab] = useState<TabType>('resumen');
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' o '01'..'12'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'voided'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Estados de datos
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showIncomeModal, setShowIncomeModal] = useState<boolean>(false);
  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
  const [voidingTransaction, setVoidingTransaction] = useState<FinancialTransaction | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Formulario de Ingreso
  const [incomeForm, setIncomeForm] = useState({
    amount: '',
    date: new Date().toISOString().substring(0, 10),
    category: 'diezmo' as IncomeCategory,
    method: 'efectivo' as FinancialPaymentMethod,
    referenceNumber: '',
    description: '',
    donorName: '',
    purposeDetails: '',
  });

  // Formulario de Gasto
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    date: new Date().toISOString().substring(0, 10),
    category: 'servicios_basicos' as ExpenseCategory,
    method: 'transferencia' as FinancialPaymentMethod,
    beneficiary: '',
    referenceNumber: '',
    description: '',
  });

  // 1. Cargar resumen financiero
  const loadSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({
        year: selectedYear,
        month: selectedMonth,
      });

      const res = await fetch(`/api/admin/finances/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo cargar el resumen financiero.');
      }

      const data = await res.json();
      setSummary(data.summary);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      setError(msg);
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, selectedYear, selectedMonth, onNotify]);

  // 2. Cargar transacciones
  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setLoadingTransactions(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();

      if (activeTab === 'ingresos') params.set('type', 'income');
      if (activeTab === 'gastos') params.set('type', 'expense');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (searchQuery) params.set('search', searchQuery);

      // Calcular rango según mes y año
      if (selectedMonth !== 'all') {
        const padMonth = selectedMonth.padStart(2, '0');
        const start = `${selectedYear}-${padMonth}-01`;
        const lastDay = new Date(Number(selectedYear), Number(padMonth), 0).getDate();
        const end = `${selectedYear}-${padMonth}-${String(lastDay).padStart(2, '0')}`;
        params.set('startDate', start);
        params.set('endDate', end);
      } else {
        params.set('startDate', `${selectedYear}-01-01`);
        params.set('endDate', `${selectedYear}-12-31`);
      }

      const res = await fetch(`/api/admin/finances/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al obtener transacciones.');
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar lista';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setLoadingTransactions(false);
    }
  }, [user, activeTab, statusFilter, categoryFilter, searchQuery, selectedYear, selectedMonth, onNotify]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // 3. Registrar Ingreso
  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        type: 'income',
        amount: parseFloat(incomeForm.amount),
        currency: 'USD',
        date: incomeForm.date,
        category: incomeForm.category,
        method: incomeForm.method,
        referenceNumber: incomeForm.referenceNumber || undefined,
        description: incomeForm.description,
        donorName: incomeForm.donorName || undefined,
        purposeDetails: incomeForm.purposeDetails || undefined,
      };

      const res = await fetch('/api/admin/finances/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el ingreso.');
      }

      if (onNotify) onNotify(data.message || 'Ingreso registrado con éxito.', 'success');
      setShowIncomeModal(false);
      setIncomeForm({
        amount: '',
        date: new Date().toISOString().substring(0, 10),
        category: 'diezmo',
        method: 'efectivo',
        referenceNumber: '',
        description: '',
        donorName: '',
        purposeDetails: '',
      });
      loadSummary();
      loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Registrar Gasto
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const payload = {
        type: 'expense',
        amount: parseFloat(expenseForm.amount),
        currency: 'USD',
        date: expenseForm.date,
        category: expenseForm.category,
        method: expenseForm.method,
        beneficiary: expenseForm.beneficiary || undefined,
        referenceNumber: expenseForm.referenceNumber || undefined,
        description: expenseForm.description,
      };

      const res = await fetch('/api/admin/finances/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar el gasto.');
      }

      if (onNotify) onNotify(data.message || 'Gasto registrado con éxito.', 'success');
      setShowExpenseModal(false);
      setExpenseForm({
        amount: '',
        date: new Date().toISOString().substring(0, 10),
        category: 'servicios_basicos',
        method: 'transferencia',
        beneficiary: '',
        referenceNumber: '',
        description: '',
      });
      loadSummary();
      loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Anular Transacción
  const handleVoidTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !voidingTransaction) return;
    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/finances/transactions/${voidingTransaction.id}/void`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voidReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo anular la transacción.');
      }

      if (onNotify) onNotify(data.message || 'Transacción anulada correctamente.', 'info');
      setVoidingTransaction(null);
      setSelectedTransaction(null);
      setVoidReason('');
      loadSummary();
      loadTransactions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al anular';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Exportación Segura a CSV
  const handleExportCSV = () => {
    if (!transactions || transactions.length === 0) {
      if (onNotify) onNotify('No hay transacciones para exportar en este período.', 'info');
      return;
    }

    const headers = [
      'ID Transaccion',
      'Tipo',
      'Fecha',
      'Categoria',
      'Descripcion',
      'Beneficiario / Donante',
      'Metodo de Pago',
      'Comprobante / Ref',
      'Importe',
      'Moneda',
      'Estado',
      'Registrado Por',
      'Fecha Registro',
      'Motivo Anulacion',
      'Anulado Por',
    ];

    // Función para escapar campos CSV de forma segura contra inyecciones y caracteres especiales
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '""';
      let str = String(value).trim();
      // Prevención de inyección de fórmulas de hoja de cálculo (=, +, -, @)
      if (/^[=+\-@]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = transactions.map((t) => [
      escapeCSV(t.id),
      escapeCSV(t.type === 'income' ? 'Ingreso' : 'Gasto'),
      escapeCSV(t.date),
      escapeCSV(t.categoryLabel || t.category),
      escapeCSV(t.description),
      escapeCSV(t.beneficiary || (t.donorName ? `[Donante Confidencial: ${t.donorName}]` : '')),
      escapeCSV(PAYMENT_METHODS[t.method] || t.method),
      escapeCSV(t.referenceNumber || 'N/A'),
      escapeCSV(t.amount.toFixed(2)),
      escapeCSV(t.currency || 'USD'),
      escapeCSV(t.status === 'active' ? 'Activo' : 'Anulado'),
      escapeCSV(t.createdByName || t.createdByEmail),
      escapeCSV(t.createdAt),
      escapeCSV(t.voidReason || ''),
      escapeCSV(t.voidedByName || ''),
    ]);

    // Agregar UTF-8 BOM (\uFEFF) para visualización correcta en Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `fama_finanzas_${selectedYear}_${selectedMonth !== 'all' ? selectedMonth : 'anual'}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onNotify) onNotify('Reporte CSV generado y descargado con éxito.', 'success');
  };

  const currentMonthOptions = [
    { value: 'all', label: 'Todo el Año' },
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Cálculo de porcentajes para gráficos de categoría
  const topIncomeCategories = useMemo(() => {
    if (!summary || summary.totalIncome === 0) return [];
    return Object.entries(summary.incomeByCategory)
      .filter(([, v]) => v.amount > 0)
      .map(([key, v]) => ({
        key,
        label: v.label,
        amount: v.amount,
        count: v.count,
        percent: Math.round((v.amount / summary.totalIncome) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [summary]);

  const topExpenseCategories = useMemo(() => {
    if (!summary || summary.totalExpenses === 0) return [];
    return Object.entries(summary.expensesByCategory)
      .filter(([, v]) => v.amount > 0)
      .map(([key, v]) => ({
        key,
        label: v.label,
        amount: v.amount,
        count: v.count,
        percent: Math.round((v.amount / summary.totalExpenses) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* 1. Barra de Herramientas y Filtro Temporal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <span>Período:</span>
          </div>

          {/* Selector de Año */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-xs font-semibold text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="2027">2027</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>

          {/* Selector de Mes */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-xs font-semibold text-white focus:outline-none focus:border-[#D4AF37]"
          >
            {currentMonthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              loadSummary();
              loadTransactions();
            }}
            disabled={loading || loadingTransactions}
            title="Recargar datos financieros"
            className="p-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-slate-300 hover:text-white hover:bg-[#1E2D4A] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingTransactions ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>

          {summary && (
            <span className="text-[11px] text-slate-400 font-medium px-2 py-0.5 rounded-md bg-[#141E33]/70">
              {summary.periodLabel}
            </span>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1E2D4A] hover:bg-[#141E33] text-slate-200 text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Registrar Gasto</span>
          </button>

          <button
            onClick={() => setShowIncomeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Registrar Ingreso</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas KPI Principales */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] animate-pulse p-4" />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Ingresos */}
          <div className="p-4 rounded-2xl bg-[#0E1626] border border-emerald-500/20 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Total Ingresos</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-emerald-400 tracking-tight">
                {formatCurrency(summary.totalIncome)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.activeTransactionsCount} transacciones activas
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60" />
          </div>

          {/* Gastos */}
          <div className="p-4 rounded-2xl bg-[#0E1626] border border-rose-500/20 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Total Gastos</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-rose-400 tracking-tight">
                {formatCurrency(summary.totalExpenses)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Egresos operativos del período</p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500 opacity-60" />
          </div>

          {/* Balance Neto */}
          <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#D4AF37]/30 flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Balance Neto</span>
              <div className="p-2 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37]">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p
                className={`text-2xl font-black tracking-tight ${
                  summary.netBalance >= 0 ? 'text-[#D4AF37]' : 'text-rose-400'
                }`}
              >
                {formatCurrency(summary.netBalance)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {summary.netBalance >= 0 ? 'Superávit congregacional' : 'Déficit operativo'}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4AF37] to-amber-300 opacity-60" />
          </div>

          {/* Transacciones Anuladas */}
          <div className="p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Auditoría & Anuladas</span>
              <div className="p-2 rounded-xl bg-[#141E33] text-slate-400">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-2xl font-black text-slate-200 tracking-tight">
                {summary.voidedTransactionsCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Excluidas de los balances activos
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Navegación Secundaria por Pestañas */}
      <div className="flex items-center gap-1 border-b border-[#1E2D4A] pb-1 overflow-x-auto">
        {[
          { key: 'resumen', label: 'Resumen & Gráficos', icon: Landmark },
          { key: 'ingresos', label: 'Ingresos', icon: TrendingUp },
          { key: 'gastos', label: 'Gastos', icon: TrendingDown },
          { key: 'historial', label: 'Historial Completo', icon: FileText },
          { key: 'informes', label: 'Informes & Desglose', icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#141E33]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. CONTENIDO: PESTAÑA RESUMEN & CATEGORÍAS */}
      {activeTab === 'resumen' && summary && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Categorías de Ingreso */}
          <div className="p-5 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Ingresos por Categoría</span>
              </h3>
              <span className="text-xs font-bold text-emerald-400">
                {formatCurrency(summary.totalIncome)}
              </span>
            </div>

            {topIncomeCategories.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No se registraron ingresos en este período.
              </p>
            ) : (
              <div className="space-y-3">
                {topIncomeCategories.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        {c.label}{' '}
                        <span className="text-[10px] text-slate-500">({c.count} reg.)</span>
                      </span>
                      <span className="font-bold text-white">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#141E33] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.max(4, c.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categorías de Gasto */}
          <div className="p-5 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <span>Gastos por Categoría</span>
              </h3>
              <span className="text-xs font-bold text-rose-400">
                {formatCurrency(summary.totalExpenses)}
              </span>
            </div>

            {topExpenseCategories.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic">
                No se registraron gastos en este período.
              </p>
            ) : (
              <div className="space-y-3">
                {topExpenseCategories.map((c) => (
                  <div key={c.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">
                        {c.label}{' '}
                        <span className="text-[10px] text-slate-500">({c.count} reg.)</span>
                      </span>
                      <span className="font-bold text-white">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#141E33] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${Math.min(100, Math.max(4, c.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evolución Mensual del Año */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D4AF37]" />
              <span>Desglose Mensual — Año {selectedYear}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E2D4A] text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-2 px-3">Mes</th>
                    <th className="py-2 px-3 text-right">Ingresos</th>
                    <th className="py-2 px-3 text-right">Gastos</th>
                    <th className="py-2 px-3 text-right">Balance Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D4A]/50">
                  {summary.monthlyBreakdown.map((m) => (
                    <tr key={m.month} className="hover:bg-[#141E33]/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">{m.monthName}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-medium">
                        {m.income > 0 ? formatCurrency(m.income) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-medium">
                        {m.expenses > 0 ? formatCurrency(m.expenses) : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          m.balance > 0
                            ? 'text-emerald-400'
                            : m.balance < 0
                              ? 'text-rose-400'
                              : 'text-slate-500'
                        }`}
                      >
                        {m.income === 0 && m.expenses === 0 ? '—' : formatCurrency(m.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TABLA DE TRANSACCIONES (INGRESOS / GASTOS / HISTORIAL) */}
      {(activeTab === 'ingresos' || activeTab === 'gastos' || activeTab === 'historial') && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros de Tabla */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por descripción, referencia, beneficiario o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'voided')}
                className="px-3 py-2 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs text-slate-300 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Solo Activos</option>
                <option value="voided">Solo Anulados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="rounded-2xl bg-[#0E1626] border border-[#1E2D4A] overflow-hidden">
            {loadingTransactions ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Cargando movimientos financieros...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Landmark className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">No se encontraron transacciones</p>
                <p className="text-xs text-slate-500">
                  No hay movimientos registrados para los filtros o período seleccionados.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2D4A] bg-[#141E33]/50 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Tipo & Categoría</th>
                      <th className="py-3 px-4">Descripción</th>
                      <th className="py-3 px-4">Beneficiario / Detalle</th>
                      <th className="py-3 px-4">Método</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                      <th className="py-3 px-4 text-center">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2D4A]">
                    {transactions.map((t) => {
                      const isVoided = t.status === 'voided';
                      return (
                        <tr
                          key={t.id}
                          className={`hover:bg-[#141E33]/60 transition-colors ${
                            isVoided ? 'opacity-60 bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {t.date}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  t.type === 'income' ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                              <span className="font-semibold text-slate-200">
                                {t.categoryLabel || t.category}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 max-w-xs truncate text-slate-300 font-medium">
                            {t.description}
                            {t.referenceNumber && (
                              <span className="block text-[10px] text-slate-500 font-mono">
                                Ref: {t.referenceNumber}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                            {t.type === 'expense' && t.beneficiary ? (
                              <span className="text-slate-300 flex items-center gap-1">
                                <Building className="w-3 h-3 text-slate-500" />
                                {t.beneficiary}
                              </span>
                            ) : t.type === 'income' && t.donorName ? (
                              <span className="text-slate-400 italic text-[11px]">
                                Donante reservado
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                            {PAYMENT_METHODS[t.method] || t.method}
                          </td>

                          <td
                            className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                              isVoided
                                ? 'text-slate-500 line-through'
                                : t.type === 'income'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                            }`}
                          >
                            {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount, t.currency)}
                          </td>

                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isVoided ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                                <Ban className="w-3 h-3" /> Anulada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Vigente
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedTransaction(t)}
                              className="px-2.5 py-1 rounded-lg bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold transition-colors"
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. PESTAÑA INFORMES Y REPORTES */}
      {activeTab === 'informes' && summary && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0E1626] border border-[#1E2D4A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#D4AF37]" />
                  <span>Informe Financiero Pastoral Consolidado</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Resumen de auditoría de ingresos y egresos de {summary.periodLabel}. No incluye transacciones anuladas.
                </p>
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs transition-colors self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Informe CSV</span>
              </button>
            </div>

            {/* Cuadro de Cifras */}
            <div className="grid gap-4 sm:grid-cols-3 pt-4 border-t border-[#1E2D4A]">
              <div className="p-4 rounded-xl bg-[#141E33] border border-emerald-500/20">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Ingresos Consolidados</span>
                <p className="text-xl font-black text-emerald-400 mt-1">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#141E33] border border-rose-500/20">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Egresos Consolidados</span>
                <p className="text-xl font-black text-rose-400 mt-1">
                  {formatCurrency(summary.totalExpenses)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#141E33] border border-[#D4AF37]/30">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Balance del Ejercicio</span>
                <p
                  className={`text-xl font-black mt-1 ${
                    summary.netBalance >= 0 ? 'text-[#D4AF37]' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(summary.netBalance)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR INGRESO                                  */}
      {/* ========================================================= */}
      {showIncomeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1626] border border-[#1E2D4A] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Registrar Ingreso Pastoral</h3>
              </div>
              <button
                onClick={() => setShowIncomeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Importe (USD) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Fecha de Recepción <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Categoría de Ingreso <span className="text-rose-400">*</span>
                </label>
                <select
                  value={incomeForm.category}
                  onChange={(e) =>
                    setIncomeForm({ ...incomeForm, category: e.target.value as IncomeCategory })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  {Object.entries(INCOME_CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label} — {val.description}
                    </option>
                  ))}
                </select>
              </div>

              {incomeForm.category === 'donacion_proposito' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Destino o Propósito Específico
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Fondo Pro-Templo, Misiones, Instrumentos..."
                    value={incomeForm.purposeDetails}
                    onChange={(e) => setIncomeForm({ ...incomeForm, purposeDetails: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Método de Recepción <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={incomeForm.method}
                    onChange={(e) =>
                      setIncomeForm({ ...incomeForm, method: e.target.value as FinancialPaymentMethod })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Comprobante / Recibo (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nº Sobre, Depósito o Transf."
                    value={incomeForm.referenceNumber}
                    onChange={(e) => setIncomeForm({ ...incomeForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Donante (Confidencial / Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Nombre o familia donante (solo visible para administración)"
                  value={incomeForm.donorName}
                  onChange={(e) => setIncomeForm({ ...incomeForm, donorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descripción u Observaciones <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalle del culto o reunión de recepción..."
                  value={incomeForm.description}
                  onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#1E2D4A] text-slate-300 text-xs font-medium hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Ingreso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR GASTO                                    */}
      {/* ========================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1626] border border-[#1E2D4A] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Registrar Gasto Pastoral</h3>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Importe (USD) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-sm focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Fecha de Pago <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Categoría de Gasto <span className="text-rose-400">*</span>
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                >
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.label} — {val.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Beneficiario / Proveedor
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre o empresa proveedora"
                    value={expenseForm.beneficiary}
                    onChange={(e) => setExpenseForm({ ...expenseForm, beneficiary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Método de Pago <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={expenseForm.method}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, method: e.target.value as FinancialPaymentMethod })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Número de Factura / Comprobante
                </label>
                <input
                  type="text"
                  placeholder="Nº Factura física o digital"
                  value={expenseForm.referenceNumber}
                  onChange={(e) => setExpenseForm({ ...expenseForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descripción del Gasto <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detalle y justificación pastoral del egreso..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#1E2D4A] text-slate-300 text-xs font-medium hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Gasto</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETALLE DE TRANSACCIÓN                             */}
      {/* ========================================================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1626] border border-[#1E2D4A] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="text-base font-bold text-white">Detalle de Transacción</h3>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTransaction.status === 'voided' && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <Ban className="w-4 h-4" />
                  <span>Transacción Anulada</span>
                </div>
                <p>
                  <strong>Motivo:</strong> {selectedTransaction.voidReason}
                </p>
                <p className="text-[11px] text-rose-300/80">
                  Anulado por {selectedTransaction.voidedByName} el{' '}
                  {selectedTransaction.voidedAt
                    ? new Date(selectedTransaction.voidedAt).toLocaleString()
                    : 'fecha no disponible'}
                  .
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                <span className="text-[10px] text-slate-400 block font-bold">Tipo</span>
                <span className="text-slate-200 font-semibold capitalize">
                  {selectedTransaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                <span className="text-[10px] text-slate-400 block font-bold">Importe</span>
                <span
                  className={`text-sm font-black ${
                    selectedTransaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                <span className="text-[10px] text-slate-400 block font-bold">Fecha Operación</span>
                <span className="text-slate-200 font-semibold">{selectedTransaction.date}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                <span className="text-[10px] text-slate-400 block font-bold">Método</span>
                <span className="text-slate-200 font-semibold">
                  {PAYMENT_METHODS[selectedTransaction.method] || selectedTransaction.method}
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                <span className="text-[10px] text-slate-400 block font-bold">Categoría</span>
                <span className="text-slate-200 font-semibold">
                  {selectedTransaction.categoryLabel || selectedTransaction.category}
                </span>
              </div>

              {selectedTransaction.referenceNumber && (
                <div className="col-span-2 p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    Referencia / Comprobante
                  </span>
                  <span className="text-slate-200 font-mono">
                    {selectedTransaction.referenceNumber}
                  </span>
                </div>
              )}

              {selectedTransaction.beneficiary && (
                <div className="col-span-2 p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                  <span className="text-[10px] text-slate-400 block font-bold">Beneficiario / Proveedor</span>
                  <span className="text-slate-200 font-semibold">
                    {selectedTransaction.beneficiary}
                  </span>
                </div>
              )}

              {selectedTransaction.donorName && (
                <div className="col-span-2 p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    Donante Registrado (Confidencial)
                  </span>
                  <span className="text-slate-200">{selectedTransaction.donorName}</span>
                </div>
              )}

              <div className="col-span-2 p-3 rounded-xl bg-[#141E33] border border-[#1E2D4A]">
                <span className="text-[10px] text-slate-400 block font-bold">Descripción</span>
                <p className="text-slate-200 text-xs mt-0.5 whitespace-pre-wrap">
                  {selectedTransaction.description}
                </p>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-[#141E33]/60 border border-[#1E2D4A] text-[11px] text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">Registro de Auditoría</span>
                <p>
                  Registrado por: <strong>{selectedTransaction.createdByName}</strong> (
                  {selectedTransaction.createdByEmail})
                </p>
                <p>Fecha creación: {new Date(selectedTransaction.createdAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1E2D4A]">
              {selectedTransaction.status === 'active' ? (
                <button
                  onClick={() => {
                    setVoidingTransaction(selectedTransaction);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold hover:bg-rose-900 transition-colors flex items-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Anular Transacción</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500 italic">Movimiento ya anulado</span>
              )}

              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ANULACIÓN                                */}
      {/* ========================================================= */}
      {voidingTransaction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1626] border border-rose-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Anular Transacción Financiera</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Para preservar la integridad y trazabilidad pastoral,{' '}
              <strong className="text-rose-300">las transacciones no se borran silenciosamente</strong>.
              Al anularla, quedará registrada con tu usuario y motivo, y se excluirá inmediatamente de
              los ingresos, gastos y balances vigentes.
            </p>

            <form onSubmit={handleVoidTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Motivo de Anulación <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Indica la razón (ej. Duplicación de asiento, error en el importe, comprobante devuelto...)"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => {
                    setVoidingTransaction(null);
                    setVoidReason('');
                  }}
                  className="px-4 py-2 rounded-xl border border-[#1E2D4A] text-slate-300 text-xs font-medium hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || voidReason.trim().length < 5}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Anulación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
