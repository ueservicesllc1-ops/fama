'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RotateCcw,
  Calendar,
  Layers,
  Wrench,
  Download,
  DollarSign,
  Tag,
  MapPin,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Send,
  Eye,
  Edit,
  Trash2,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  InventoryItem,
  ResourceLoan,
  ResourceMaintenance,
  ResourceCategory,
  ResourceStatus,
  LoanStatus,
  RESOURCE_CATEGORIES,
} from '@/types/models';
import {
  canManageInventory,
  canViewFinancials,
  getCategoryLabel,
  RESOURCE_STATUS_CONFIG,
  LOAN_STATUS_CONFIG,
  isLoanOverdue,
} from '@/lib/inventory/inventoryClientHelper';

interface InventoryManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function InventoryManager({ onNotify }: InventoryManagerProps) {
  const { user, profile } = useAuth();
  const canManage = canManageInventory(profile);
  const canSeeFinancials = canViewFinancials(profile);

  const [activeTab, setActiveTab] = useState<'catalogo' | 'prestamos' | 'mantenimiento'>('catalogo');

  // Datos
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loans, setLoans] = useState<ResourceLoan[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<ResourceMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros y Búsqueda para Catálogo
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  // Filtros para Préstamos
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('all');

  // Modales
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ResourceLoan | null>(null);

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceItem, setMaintenanceItem] = useState<InventoryItem | null>(null);

  // Estados de Formulario de Recurso
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<ResourceCategory>('sonido_microfonos');
  const [itemCode, setItemCode] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemModel, setItemModel] = useState('');
  const [itemSerialNumber, setItemSerialNumber] = useState('');
  const [itemQuantityTotal, setItemQuantityTotal] = useState(1);
  const [itemLocation, setItemLocation] = useState('Altar Principal');
  const [itemStatus, setItemStatus] = useState<ResourceStatus>('bueno');
  const [itemAcquisitionCost, setItemAcquisitionCost] = useState<string>('');
  const [itemAcquisitionDate, setItemAcquisitionDate] = useState('');
  const [itemCustodian, setItemCustodian] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [submittingItem, setSubmittingItem] = useState(false);

  // Estados de Formulario de Préstamo Directo
  const [loanResourceId, setLoanResourceId] = useState('');
  const [loanQuantity, setLoanQuantity] = useState(1);
  const [loanBorrowerName, setLoanBorrowerName] = useState('');
  const [loanBorrowerEmail, setLoanBorrowerEmail] = useState('');
  const [loanBorrowerPhone, setLoanBorrowerPhone] = useState('');
  const [loanMinistryName, setLoanMinistryName] = useState('');
  const [loanExpectedReturnDate, setLoanExpectedReturnDate] = useState('');
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Estados de Formulario de Devolución
  const [returnCondition, setReturnCondition] = useState<'bueno' | 'regular' | 'danado'>('bueno');
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Estados de Formulario de Mantenimiento
  const [maintProblem, setMaintProblem] = useState('');
  const [maintTechnician, setMaintTechnician] = useState('');
  const [maintCost, setMaintCost] = useState('');
  const [submittingMaint, setSubmittingMaint] = useState(false);

  // Cargar datos
  const loadInventoryData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [itemsRes, loansRes, maintRes] = await Promise.all([
        fetch('/api/inventory/items', { headers }),
        fetch('/api/inventory/loans', { headers }),
        fetch('/api/inventory/maintenance', { headers }),
      ]);

      if (!itemsRes.ok) throw new Error('Error al cargar catálogo de recursos');
      const itemsData = await itemsRes.json();
      setItems(itemsData.items || []);

      if (loansRes.ok) {
        const loansData = await loansRes.json();
        setLoans(loansData.loans || []);
      }

      if (maintRes.ok) {
        const maintData = await maintRes.json();
        setMaintenanceRecords(maintData.records || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar inventario';
      setError(msg);
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, onNotify]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // KPIs
  const totalItemsCount = items.reduce((acc, i) => acc + (i.quantityTotal || 1), 0);
  const totalAvailableCount = items.reduce((acc, i) => acc + (i.quantityAvailable || 0), 0);
  const totalLentCount = loans.filter((l) => l.status === 'entregado' || l.status === 'vencido').reduce((acc, l) => acc + (l.quantity || 1), 0);
  const overdueLoansCount = loans.filter((l) => l.status === 'vencido' || (l.status === 'entregado' && isLoanOverdue(l))).length;
  const damagedItemsCount = items.filter((i) => i.status === 'danado' || i.status === 'fuera_de_servicio').length;
  const pendingMaintenanceCount = maintenanceRecords.filter((m) => m.status !== 'completado' && m.status !== 'no_reparable').length;

  // Filtrado de Recursos
  const filteredItems = items.filter((item) => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (locationFilter !== 'all' && item.location !== locationFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtrado de Préstamos
  const filteredLoans = loans.filter((loan) => {
    if (loanStatusFilter === 'all') return true;
    if (loanStatusFilter === 'vencido') {
      return loan.status === 'vencido' || (loan.status === 'entregado' && isLoanOverdue(loan));
    }
    return loan.status === loanStatusFilter;
  });

  // Guardar Recurso (Nuevo o Edición)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingItem(true);

    try {
      const token = await user.getIdToken();
      const payload: Record<string, unknown> = {
        name: itemName.trim(),
        category: itemCategory,
        code: itemCode.trim().toUpperCase(),
        brand: itemBrand.trim() || undefined,
        model: itemModel.trim() || undefined,
        serialNumber: itemSerialNumber.trim() || undefined,
        quantityTotal: Number(itemQuantityTotal),
        location: itemLocation.trim(),
        status: itemStatus,
        acquisitionDate: itemAcquisitionDate || undefined,
        currentCustodian: itemCustodian.trim() || undefined,
        notes: itemNotes.trim() || undefined,
      };

      if (canSeeFinancials && itemAcquisitionCost) {
        payload.acquisitionCost = parseFloat(itemAcquisitionCost);
      }

      const url = editingItem
        ? `/api/inventory/items/${editingItem.id}`
        : '/api/inventory/items';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar recurso.');

      if (onNotify) {
        onNotify(
          editingItem ? 'Recurso actualizado con éxito.' : 'Nuevo recurso registrado.',
          'success'
        );
      }

      setIsItemModalOpen(false);
      setEditingItem(null);
      await loadInventoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar recurso.';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmittingItem(false);
    }
  };

  // Acciones sobre Préstamos
  const handleLoanAction = async (loanId: string, action: 'approve' | 'checkout' | 'reject' | 'cancel') => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/inventory/loans/${loanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar acción.');

      if (onNotify) onNotify(`Préstamo ${action} correctamente.`, 'success');
      await loadInventoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en la operación.';
      if (onNotify) onNotify(msg, 'error');
    }
  };

  // Registrar Devolución
  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedLoan) return;
    setSubmittingReturn(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/inventory/loans/${selectedLoan.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'return',
          conditionOnReturn: returnCondition,
          returnNotes: returnNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar devolución.');

      if (onNotify) onNotify('Devolución registrada exitosamente.', 'success');
      setIsReturnModalOpen(false);
      setSelectedLoan(null);
      setReturnNotes('');
      await loadInventoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar devolución.';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Registrar Préstamo Directo desde Administración
  const handleCreateDirectLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmittingLoan(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/inventory/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId: loanResourceId,
          quantity: Number(loanQuantity),
          borrowerName: loanBorrowerName.trim(),
          borrowerEmail: loanBorrowerEmail.trim() || undefined,
          borrowerPhone: loanBorrowerPhone.trim() || undefined,
          ministryName: loanMinistryName.trim() || undefined,
          expectedReturnDate: loanExpectedReturnDate,
          purpose: loanPurpose.trim(),
          immediateCheckout: true,
          checkoutNotes: loanNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar préstamo.');

      if (onNotify) onNotify('Préstamo entregado registrado con éxito.', 'success');
      setIsLoanModalOpen(false);
      setLoanResourceId('');
      setLoanBorrowerName('');
      setLoanPurpose('');
      setLoanNotes('');
      await loadInventoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar préstamo.';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmittingLoan(false);
    }
  };

  // Reportar Mantenimiento
  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !maintenanceItem) return;
    setSubmittingMaint(true);

    try {
      const token = await user.getIdToken();
      const payload: Record<string, unknown> = {
        resourceId: maintenanceItem.id,
        problemDescription: maintProblem.trim(),
        assignedTechnician: maintTechnician.trim() || undefined,
        markResourceAsDamaged: true,
      };

      if (canSeeFinancials && maintCost) {
        payload.repairCost = parseFloat(maintCost);
      }

      const res = await fetch('/api/inventory/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar reporte de mantenimiento.');

      if (onNotify) onNotify('Recurso enviado a mantenimiento.', 'success');
      setIsMaintenanceModalOpen(false);
      setMaintenanceItem(null);
      setMaintProblem('');
      setMaintTechnician('');
      setMaintCost('');
      await loadInventoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en mantenimiento.';
      if (onNotify) onNotify(msg, 'error');
    } finally {
      setSubmittingMaint(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Cabecera y Exportación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border border-[#25282E] bg-gradient-to-r from-[#14161B] via-[#0E1015] to-[#14161B] shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#E5C378] text-xs font-semibold uppercase tracking-wider mb-2">
            <Package className="w-3.5 h-3.5" />
            <span>Módulo de Inventario & Equipamiento</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-editorial text-white">
            Inventario y Gestión de Recursos Físicos
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-2xl mt-1">
            Control integral de equipos audiovisuales, sonido, instrumentos musicales, mobiliario y materiales.
            Supervisión de préstamos activos, devoluciones vencidas y mantenimiento preventivo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => loadInventoryData()}
            className="p-2.5 rounded-xl border border-[#25282E] bg-[#17191C] hover:bg-[#1E222A] text-slate-300 transition-colors"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <a
            href="/api/inventory/export?type=inventory"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#25282E] bg-[#17191C] hover:bg-[#1E222A] text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#C69A4B]" />
            <span>Exportar Catálogo CSV</span>
          </a>

          <a
            href="/api/inventory/export?type=loans"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#25282E] bg-[#17191C] hover:bg-[#1E222A] text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exportar Préstamos CSV</span>
          </a>

          {canManage && (
            <button
              onClick={() => {
                setEditingItem(null);
                setItemName('');
                setItemCode('');
                setItemBrand('');
                setItemModel('');
                setItemSerialNumber('');
                setItemQuantityTotal(1);
                setItemLocation('Altar Principal');
                setItemStatus('bueno');
                setItemAcquisitionCost('');
                setItemAcquisitionDate('');
                setItemCustodian('');
                setItemNotes('');
                setIsItemModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] hover:from-[#D4A359] hover:to-[#B0893E] text-black font-bold text-xs shadow-lg transition-transform hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Recurso</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 text-xs">
        <div className="p-4 rounded-2xl border border-[#25282E] bg-[#0E1015] space-y-1">
          <span className="text-slate-400 block text-[11px]">Total Unidades</span>
          <strong className="text-white text-xl font-bold font-mono">{totalItemsCount}</strong>
          <span className="text-slate-500 block text-[10px]">{items.length} modelos registrados</span>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-[#0E1015] space-y-1">
          <span className="text-emerald-400 block text-[11px] font-semibold">Disponibles</span>
          <strong className="text-emerald-300 text-xl font-bold font-mono">{totalAvailableCount}</strong>
          <span className="text-slate-500 block text-[10px]">Listos para uso</span>
        </div>

        <div className="p-4 rounded-2xl border border-blue-500/30 bg-[#0E1015] space-y-1">
          <span className="text-blue-400 block text-[11px] font-semibold">En Préstamo</span>
          <strong className="text-blue-300 text-xl font-bold font-mono">{totalLentCount}</strong>
          <span className="text-slate-500 block text-[10px]">Actualmente prestados</span>
        </div>

        <div className="p-4 rounded-2xl border border-rose-500/40 bg-[#0E1015] space-y-1">
          <span className="text-rose-400 block text-[11px] font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Devoluciones Vencidas</span>
          </span>
          <strong className="text-rose-300 text-xl font-bold font-mono">{overdueLoansCount}</strong>
          <span className="text-rose-400/80 block text-[10px]">Requieren seguimiento</span>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/30 bg-[#0E1015] space-y-1">
          <span className="text-amber-400 block text-[11px] font-semibold">Dañados / Fuera Servicio</span>
          <strong className="text-amber-300 text-xl font-bold font-mono">{damagedItemsCount}</strong>
          <span className="text-slate-500 block text-[10px]">No disponibles</span>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/30 bg-[#0E1015] space-y-1">
          <span className="text-purple-400 block text-[11px] font-semibold">Mantenimientos</span>
          <strong className="text-purple-300 text-xl font-bold font-mono">{pendingMaintenanceCount}</strong>
          <span className="text-slate-500 block text-[10px]">En proceso / diagnóstico</span>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div className="flex items-center gap-2 border-b border-[#25282E] pb-2 text-xs sm:text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalogo')}
          className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'catalogo' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Catálogo de Recursos ({items.length})</span>
          {activeTab === 'catalogo' && (
            <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('prestamos')}
          className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'prestamos' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Control de Préstamos ({loans.length})</span>
          {overdueLoansCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
              {overdueLoansCount} vencidos
            </span>
          )}
          {activeTab === 'prestamos' && (
            <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('mantenimiento')}
          className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'mantenimiento' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Mantenimiento & Reparaciones ({maintenanceRecords.length})</span>
          {activeTab === 'mantenimiento' && (
            <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
          )}
        </button>
      </div>

      {/* ========================================================
          PESTAÑA 1: CATÁLOGO DE RECURSOS
         ======================================================== */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-[#0E1015] border border-[#25282E] text-xs">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, nombre, marca..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#14161B] border border-[#25282E] text-white focus:outline-none focus:border-[#C69A4B]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#14161B] border border-[#25282E] text-slate-200 focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {Object.entries(RESOURCE_CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#14161B] border border-[#25282E] text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                {Object.entries(RESOURCE_STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>

              {canManage && (
                <button
                  onClick={() => {
                    setLoanResourceId(items[0]?.id || '');
                    setLoanQuantity(1);
                    setLoanBorrowerName('');
                    setLoanPurpose('');
                    setIsLoanModalOpen(true);
                  }}
                  className="px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40 text-blue-300 font-semibold transition-colors"
                >
                  Registrar Préstamo Directo
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Recursos */}
          <div className="rounded-2xl border border-[#25282E] bg-[#0E1015] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14161B] text-slate-400 font-semibold uppercase tracking-wider border-b border-[#25282E]">
                  <tr>
                    <th className="py-3 px-4">Código / Nombre</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Ubicación</th>
                    <th className="py-3 px-3">Cantidad</th>
                    <th className="py-3 px-3">Estado</th>
                    {canSeeFinancials && <th className="py-3 px-3">Costo Adq.</th>}
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25282E] text-slate-300">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={canSeeFinancials ? 7 : 6} className="py-12 text-center text-slate-500">
                        {loading ? 'Cargando recursos...' : 'No se encontraron recursos registrados.'}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const statusCfg = RESOURCE_STATUS_CONFIG[item.status] || RESOURCE_STATUS_CONFIG.bueno;
                      return (
                        <tr key={item.id} className="hover:bg-[#14161B]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <span className="font-mono text-[11px] font-bold text-[#E5C378] bg-[#C69A4B]/10 border border-[#C69A4B]/30 px-2 py-0.5 rounded-md">
                                {item.code}
                              </span>
                              <div>
                                <strong className="text-white block font-semibold">{item.name}</strong>
                                <span className="text-[11px] text-slate-500">
                                  {item.brand ? `${item.brand} ` : ''}
                                  {item.model ? `(${item.model})` : ''}
                                  {item.serialNumber ? ` · S/N: ${item.serialNumber}` : ''}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-400">
                            {getCategoryLabel(item.category)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{item.location}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-white">{item.quantityAvailable}</span>
                            <span className="text-slate-500"> / {item.quantityTotal} disp.</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.badgeClass}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                          {canSeeFinancials && (
                            <td className="py-3 px-3 font-mono text-[#E5C378]">
                              {item.acquisitionCost !== undefined
                                ? `$${item.acquisitionCost.toFixed(2)}`
                                : '—'}
                            </td>
                          )}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManage && (
                                <>
                                  <button
                                    onClick={() => {
                                      setMaintenanceItem(item);
                                      setMaintProblem('');
                                      setIsMaintenanceModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-purple-500/30 bg-purple-950/20 text-purple-300 hover:bg-purple-950/40 transition-colors"
                                    title="Reportar daño / mantenimiento"
                                  >
                                    <Wrench className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingItem(item);
                                      setItemName(item.name);
                                      setItemCategory(item.category);
                                      setItemCode(item.code);
                                      setItemBrand(item.brand || '');
                                      setItemModel(item.model || '');
                                      setItemSerialNumber(item.serialNumber || '');
                                      setItemQuantityTotal(item.quantityTotal);
                                      setItemLocation(item.location);
                                      setItemStatus(item.status);
                                      setItemAcquisitionCost(
                                        item.acquisitionCost !== undefined ? String(item.acquisitionCost) : ''
                                      );
                                      setItemAcquisitionDate(item.acquisitionDate || '');
                                      setItemCustodian(item.currentCustodian || '');
                                      setItemNotes(item.notes || '');
                                      setIsItemModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg border border-[#25282E] bg-[#14161B] text-slate-300 hover:text-white transition-colors"
                                    title="Editar datos"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: PRÉSTAMOS Y DEVOLUCIONES
         ======================================================== */}
      {activeTab === 'prestamos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E1015] border border-[#25282E] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Estado:</span>
              <select
                value={loanStatusFilter}
                onChange={(e) => setLoanStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#14161B] border border-[#25282E] text-slate-200 focus:outline-none"
              >
                <option value="all">Todos los Préstamos</option>
                <option value="solicitado">Solicitados (Pendientes de aprobación)</option>
                <option value="aprobado">Aprobados (Por entregar)</option>
                <option value="entregado">En Préstamo (Activos)</option>
                <option value="vencido">Devolución Vencida</option>
                <option value="devuelto">Devueltos</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>

            {canManage && (
              <button
                onClick={() => {
                  setLoanResourceId(items[0]?.id || '');
                  setLoanQuantity(1);
                  setLoanBorrowerName('');
                  setLoanPurpose('');
                  setIsLoanModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-black font-bold transition-colors"
              >
                Nuevo Préstamo Directo
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-[#25282E] bg-[#0E1015] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14161B] text-slate-400 font-semibold uppercase tracking-wider border-b border-[#25282E]">
                  <tr>
                    <th className="py-3 px-4">Recurso / Código</th>
                    <th className="py-3 px-3">Solicitante</th>
                    <th className="py-3 px-3">Actividad / Motivo</th>
                    <th className="py-3 px-3">Fecha Prevista Devolución</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-4 text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25282E] text-slate-300">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No hay registros de préstamos que coincidan con el filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const overdue = loan.status === 'vencido' || (loan.status === 'entregado' && isLoanOverdue(loan));
                      const statusCfg = overdue
                        ? LOAN_STATUS_CONFIG.vencido
                        : LOAN_STATUS_CONFIG[loan.status] || LOAN_STATUS_CONFIG.solicitado;

                      return (
                        <tr key={loan.id} className="hover:bg-[#14161B]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[11px] font-bold text-[#E5C378]">
                              {loan.resourceCode}
                            </span>
                            <strong className="text-white block font-semibold">
                              {loan.resourceName} ({loan.quantity} unid.)
                            </strong>
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-slate-200 block">{loan.borrowerName}</strong>
                            <span className="text-[11px] text-slate-500">
                              {loan.borrowerPhone || loan.borrowerEmail}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-300 block">{loan.purpose}</span>
                            {loan.ministryName && (
                              <span className="text-[10px] text-[#C69A4B] font-semibold">
                                {loan.ministryName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`font-mono ${overdue ? 'text-rose-400 font-bold' : 'text-slate-300'}`}>
                              {new Date(loan.expectedReturnDate).toLocaleDateString()}
                            </span>
                            {loan.checkoutDate && (
                              <span className="text-[10px] text-slate-500 block">
                                Entregado: {new Date(loan.checkoutDate).toLocaleDateString()}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.badgeClass}`}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {canManage && loan.status === 'solicitado' && (
                                <>
                                  <button
                                    onClick={() => handleLoanAction(loan.id, 'approve')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60 font-semibold text-[11px]"
                                  >
                                    Aprobar
                                  </button>
                                  <button
                                    onClick={() => handleLoanAction(loan.id, 'reject')}
                                    className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white text-[11px]"
                                  >
                                    Rechazar
                                  </button>
                                </>
                              )}

                              {canManage && loan.status === 'aprobado' && (
                                <button
                                  onClick={() => handleLoanAction(loan.id, 'checkout')}
                                  className="px-3 py-1 rounded-lg bg-blue-950/40 border border-blue-500/40 text-blue-300 hover:bg-blue-950/60 font-semibold text-[11px]"
                                >
                                  Entregar Equipo
                                </button>
                              )}

                              {canManage && (loan.status === 'entregado' || overdue) && (
                                <button
                                  onClick={() => {
                                    setSelectedLoan(loan);
                                    setReturnCondition('bueno');
                                    setReturnNotes('');
                                    setIsReturnModalOpen(true);
                                  }}
                                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-[11px] shadow-sm hover:scale-105 transition-transform"
                                >
                                  Registrar Devolución
                                </button>
                              )}

                              {loan.status === 'devuelto' && (
                                <span className="text-[11px] text-slate-500">
                                  Devuelto el {loan.actualReturnDate ? new Date(loan.actualReturnDate).toLocaleDateString() : '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: MANTENIMIENTO Y REPARACIONES
         ======================================================== */}
      {activeTab === 'mantenimiento' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#25282E] bg-[#0E1015] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#14161B] text-slate-400 font-semibold uppercase tracking-wider border-b border-[#25282E]">
                  <tr>
                    <th className="py-3 px-4">Recurso / Código</th>
                    <th className="py-3 px-3">Problema Reportado</th>
                    <th className="py-3 px-3">Fecha Reporte</th>
                    <th className="py-3 px-3">Técnico / Responsable</th>
                    <th className="py-3 px-3">Estado Mantenimiento</th>
                    {canSeeFinancials && <th className="py-3 px-3">Costo Rep.</th>}
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25282E] text-slate-300">
                  {maintenanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={canSeeFinancials ? 7 : 6} className="py-12 text-center text-slate-500">
                        No hay reportes de fallas o mantenimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    maintenanceRecords.map((m) => (
                      <tr key={m.id} className="hover:bg-[#14161B]/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-[11px] font-bold text-[#E5C378]">
                            {m.resourceCode}
                          </span>
                          <strong className="text-white block font-semibold">{m.resourceName}</strong>
                        </td>
                        <td className="py-3 px-3 max-w-xs text-slate-300">
                          {m.problemDescription}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {m.reportedDate}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {m.assignedTechnician || 'Pendiente asignar'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-950/40 text-purple-300 border border-purple-500/40 uppercase">
                            {m.status.replace('_', ' ')}
                          </span>
                        </td>
                        {canSeeFinancials && (
                          <td className="py-3 px-3 font-mono text-[#E5C378]">
                            {m.repairCost !== undefined ? `$${m.repairCost.toFixed(2)}` : '—'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          {canManage && m.status !== 'completado' && (
                            <button
                              onClick={async () => {
                                const token = await user?.getIdToken();
                                await fetch(`/api/inventory/maintenance/${m.id}`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({
                                    status: 'completado',
                                    restoreResourceAvailability: true,
                                    resolutionNotes: 'Reparación concluida exitosamente.',
                                  }),
                                });
                                if (onNotify) onNotify('Mantenimiento completado y equipo restaurado.', 'success');
                                await loadInventoryData();
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60 text-[11px] font-semibold"
                            >
                              Finalizar Reparación
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREAR / EDITAR RECURSO
         ======================================================== */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121417] border border-[#2E323B] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#25282E] pb-4">
              <div>
                <h3 className="text-xl font-bold font-editorial text-white">
                  {editingItem ? 'Editar Recurso de Inventario' : 'Registrar Nuevo Recurso'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete los datos técnicos, cantidad y ubicación habitual del equipo.
                </p>
              </div>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Nombre del Recurso *</label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ej: Micrófono Inalámbrico Shure SM58"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Código Interno Único *</label>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    placeholder="Ej: REN-SND-001"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white font-mono font-bold focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Categoría *</label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ResourceCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  >
                    {Object.entries(RESOURCE_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Ubicación Habitual *</label>
                  <input
                    type="text"
                    required
                    value={itemLocation}
                    onChange={(e) => setItemLocation(e.target.value)}
                    placeholder="Ej: Cabina de Sonido, Altar, Bodega"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Marca</label>
                  <input
                    type="text"
                    value={itemBrand}
                    onChange={(e) => setItemBrand(e.target.value)}
                    placeholder="Ej: Shure, Behringer, Sony, Yamaha"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Modelo</label>
                  <input
                    type="text"
                    value={itemModel}
                    onChange={(e) => setItemModel(e.target.value)}
                    placeholder="Ej: SM58, X32, A7 III"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Número de Serie</label>
                  <input
                    type="text"
                    value={itemSerialNumber}
                    onChange={(e) => setItemSerialNumber(e.target.value)}
                    placeholder="Ej: SN-9482710492"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Cantidad Total *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={itemQuantityTotal}
                    onChange={(e) => setItemQuantityTotal(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Estado Físico</label>
                  <select
                    value={itemStatus}
                    onChange={(e) => setItemStatus(e.target.value as ResourceStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="bueno">Bueno</option>
                    <option value="requiere_revision">Requiere Revisión</option>
                    <option value="danado">Dañado</option>
                    <option value="fuera_de_servicio">Fuera de Servicio</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Responsable / Custodio</label>
                  <input
                    type="text"
                    value={itemCustodian}
                    onChange={(e) => setItemCustodian(e.target.value)}
                    placeholder="Ej: Coordinador de Sonido"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>

                {canSeeFinancials && (
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1 text-[#E5C378]">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Costo de Adquisición (USD)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={itemAcquisitionCost}
                      onChange={(e) => setItemAcquisitionCost(e.target.value)}
                      placeholder="Ej: 149.99 (Confidencial)"
                      className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#C69A4B]/40 text-[#E5C378] font-mono focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Fecha de Adquisición</label>
                  <input
                    type="date"
                    value={itemAcquisitionDate}
                    onChange={(e) => setItemAcquisitionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Observaciones</label>
                <textarea
                  rows={2}
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="Detalles sobre accesorios incluidos, estuche o manual..."
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#25282E]">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#25282E] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingItem}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold flex items-center gap-1.5"
                >
                  {submittingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Guardar Cambios' : 'Registrar en Catálogo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRAR DEVOLUCIÓN
         ======================================================== */}
      {isReturnModalOpen && selectedLoan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#2E323B] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-xs">
            <div className="border-b border-[#25282E] pb-3">
              <h3 className="text-lg font-bold font-editorial text-white">
                Registrar Devolución de Equipo
              </h3>
              <p className="text-slate-400 mt-1">
                Recurso: <strong className="text-white">{selectedLoan.resourceName}</strong> ({selectedLoan.resourceCode})
              </p>
              <p className="text-slate-400">
                Solicitante: <strong className="text-[#C69A4B]">{selectedLoan.borrowerName}</strong> ({selectedLoan.quantity} unid.)
              </p>
            </div>

            <form onSubmit={handleConfirmReturn} className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Estado del Equipo al Recibirlo *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                >
                  <option value="bueno">Buen Estado (Operativo y completo)</option>
                  <option value="regular">Regular (Requiere limpieza / revisión técnica)</option>
                  <option value="danado">Dañado / Faltante (Inhabilitar stock y reportar falla)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Observaciones sobre Daños o Faltantes</label>
                <textarea
                  rows={3}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Ej: Cable devuelto enrollado correctamente, sin raspaduras..."
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#25282E]">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#25282E] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold flex items-center gap-1.5"
                >
                  {submittingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar Devolución</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: PRÉSTAMO DIRECTO ADMINISTRATIVO
         ======================================================== */}
      {isLoanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121417] border border-[#2E323B] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-xs">
            <div className="border-b border-[#25282E] pb-3">
              <h3 className="text-lg font-bold font-editorial text-white">
                Registrar Préstamo Directo
              </h3>
              <p className="text-slate-400 mt-0.5">
                Entrega física inmediata de recursos con control de cantidad y fecha de devolución.
              </p>
            </div>

            <form onSubmit={handleCreateDirectLoan} className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Recurso a Prestar *</label>
                <select
                  value={loanResourceId}
                  onChange={(e) => setLoanResourceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id} disabled={i.quantityAvailable < 1}>
                      {i.code} — {i.name} (Disponibles: {i.quantityAvailable})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Cantidad a Prestar *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={loanQuantity}
                    onChange={(e) => setLoanQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Fecha Prevista Devolución *</label>
                  <input
                    type="date"
                    required
                    value={loanExpectedReturnDate}
                    onChange={(e) => setLoanExpectedReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Nombre de Quien Recibe *</label>
                <input
                  type="text"
                  required
                  value={loanBorrowerName}
                  onChange={(e) => setLoanBorrowerName(e.target.value)}
                  placeholder="Ej: David Líder de Jóvenes"
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={loanBorrowerPhone}
                    onChange={(e) => setLoanBorrowerPhone(e.target.value)}
                    placeholder="Ej: 0991234567"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Ministerio Relacionado</label>
                  <input
                    type="text"
                    value={loanMinistryName}
                    onChange={(e) => setLoanMinistryName(e.target.value)}
                    placeholder="Ej: Jóvenes RENACER"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Motivo / Actividad *</label>
                <input
                  type="text"
                  required
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                  placeholder="Ej: Retiro juvenil de fin de semana"
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#25282E]">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#25282E] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingLoan}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold flex items-center gap-1.5"
                >
                  {submittingLoan && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Entregar en Préstamo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REPORTAR MANTENIMIENTO
         ======================================================== */}
      {isMaintenanceModalOpen && maintenanceItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#2E323B] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-xs">
            <div className="border-b border-[#25282E] pb-3">
              <h3 className="text-lg font-bold font-editorial text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                <span>Reportar Falla & Enviar a Mantenimiento</span>
              </h3>
              <p className="text-slate-400 mt-1">
                Recurso: <strong className="text-white">{maintenanceItem.name}</strong> ({maintenanceItem.code})
              </p>
            </div>

            <form onSubmit={handleCreateMaintenance} className="space-y-4">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Descripción del Daño / Problema *</label>
                <textarea
                  rows={3}
                  required
                  value={maintProblem}
                  onChange={(e) => setMaintProblem(e.target.value)}
                  placeholder="Detalla qué falla presenta el equipo (ej: cable pelado, canal 3 con ruido blanco, cápsula rota)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Técnico o Taller Asignado</label>
                <input
                  type="text"
                  value={maintTechnician}
                  onChange={(e) => setMaintTechnician(e.target.value)}
                  placeholder="Ej: Servicio Técnico Yamaha / Hno. Carlos Técnico"
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                />
              </div>

              {canSeeFinancials && (
                <div>
                  <label className="text-slate-300 font-semibold block mb-1 flex items-center gap-1 text-[#E5C378]">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Costo Estimado de Reparación (USD)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                    placeholder="Ej: 35.00 (Confidencial)"
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#C69A4B]/40 text-[#E5C378] font-mono focus:outline-none"
                  />
                </div>
              )}

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 text-[11px] leading-relaxed">
                <AlertTriangle className="w-3.5 h-3.5 text-purple-400 inline mr-1.5" />
                El recurso se marcará automáticamente en estado «Requiere Revisión» y su disponibilidad para préstamos quedará bloqueada hasta que se concluya el mantenimiento.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#25282E]">
                <button
                  type="button"
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#25282E] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingMaint}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5"
                >
                  {submittingMaint && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enviar a Mantenimiento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
