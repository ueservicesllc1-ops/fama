'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Clock,
  RotateCcw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Send,
  MapPin,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  ResourceLoan,
  InventoryItem,
  ResourceCategory,
  RESOURCE_CATEGORIES,
} from '@/types/models';
import {
  getCategoryLabel,
  LOAN_STATUS_CONFIG,
  RESOURCE_STATUS_CONFIG,
  isLoanOverdue,
} from '@/lib/inventory/inventoryClientHelper';

interface MemberInventoryPortalProps {
  onOpenNotifications?: () => void;
}

export function MemberInventoryPortal({ onOpenNotifications }: MemberInventoryPortalProps) {
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'mis_prestamos' | 'catalogo' | 'historial'>('mis_prestamos');
  const [loans, setLoans] = useState<ResourceLoan[]>([]);
  const [lendableItems, setLendableItems] = useState<InventoryItem[]>([]);
  const [ministries, setMinistries] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda en catálogo
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal de Solicitud de Préstamo
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedItemForLoan, setSelectedItemForLoan] = useState<InventoryItem | null>(null);
  const [requestQuantity, setRequestQuantity] = useState(1);
  const [requestExpectedDate, setRequestExpectedDate] = useState('');
  const [requestMinistryId, setRequestMinistryId] = useState('');
  const [requestPurpose, setRequestPurpose] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // Cargar datos
  const loadMemberLoans = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/inventory/loans', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al cargar préstamos del miembro.');
      const data = await res.json();
      setLoans(data.myLoans || []);
      setLendableItems(data.lendableItems || []);
      setMinistries(data.ministries || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMemberLoans();
  }, [loadMemberLoans]);

  // Enviar Solicitud de Préstamo
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedItemForLoan) return;
    setSubmittingRequest(true);

    try {
      const token = await user.getIdToken();
      const targetMin = ministries.find((m) => m.id === requestMinistryId);

      const res = await fetch('/api/inventory/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resourceId: selectedItemForLoan.id,
          quantity: Number(requestQuantity),
          expectedReturnDate: requestExpectedDate,
          purpose: requestPurpose.trim(),
          ministryId: requestMinistryId || undefined,
          ministryName: targetMin?.name || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud.');

      setIsRequestModalOpen(false);
      setSelectedItemForLoan(null);
      setRequestPurpose('');
      setRequestExpectedDate('');
      alert('¡Solicitud de préstamo enviada! El encargado de inventario revisará tu requerimiento.');
      await loadMemberLoans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar recurso';
      alert(msg);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Cancelar Solicitud Pendiente
  const handleCancelLoan = async (loanId: string) => {
    if (!confirm('¿Deseas cancelar esta solicitud de préstamo?')) return;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/inventory/loans/${loanId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cancelar solicitud.');

      await loadMemberLoans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar';
      alert(msg);
    }
  };

  const activeLoans = loans.filter((l) => l.status === 'solicitado' || l.status === 'aprobado' || l.status === 'entregado' || l.status === 'vencido');
  const pastLoans = loans.filter((l) => l.status === 'devuelto' || l.status === 'cancelado');

  const filteredCatalog = lendableItems.filter((i) => {
    if (selectedCategory !== 'all' && i.category !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.brand && i.brand.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Banner de Presentación */}
      <div className="rounded-3xl border border-[#25282E] bg-gradient-to-br from-[#121417] via-[#16191E] to-[#121417] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#E5C378] text-xs font-semibold uppercase tracking-wider">
              <Package className="w-3.5 h-3.5" />
              <span>Recursos & Equipamiento Congregacional</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Mis Préstamos de Recursos
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Solicita equipos de sonido, instrumentos, cámaras o mobiliario para actividades de tu ministerio o eventos de la iglesia.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('catalogo')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar Recurso</span>
            </button>
          </div>
        </div>

        {/* Subpestañas */}
        <div className="flex items-center gap-1.5 mt-6 border-t border-[#25282E] pt-4 text-xs">
          <button
            onClick={() => setActiveTab('mis_prestamos')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'mis_prestamos'
                ? 'bg-[#C69A4B]/20 text-[#E5C378] border border-[#C69A4B]/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Préstamos Activos ({activeLoans.length})
          </button>

          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'catalogo'
                ? 'bg-[#C69A4B]/20 text-[#E5C378] border border-[#C69A4B]/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Catálogo Disponible ({lendableItems.length})
          </button>

          <button
            onClick={() => setActiveTab('historial')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
              activeTab === 'historial'
                ? 'bg-[#C69A4B]/20 text-[#E5C378] border border-[#C69A4B]/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Historial de Devoluciones ({pastLoans.length})
          </button>
        </div>
      </div>

      {/* ========================================================
          PESTAÑA: PRÉSTAMOS ACTIVOS Y EN REVISIÓN
         ======================================================== */}
      {activeTab === 'mis_prestamos' && (
        <div className="space-y-4">
          {activeLoans.length === 0 ? (
            <div className="p-10 rounded-3xl border border-[#25282E] bg-[#0E1015] text-center space-y-3">
              <Package className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">No tienes préstamos ni solicitudes activas</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                ¿Necesitas micrófonos, cables, instrumentos o proyectores para una reunión ministerial?
              </p>
              <button
                onClick={() => setActiveTab('catalogo')}
                className="px-4 py-2 rounded-xl bg-[#C69A4B] text-black font-bold text-xs"
              >
                Explorar Catálogo y Solicitar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLoans.map((loan) => {
                const overdue = loan.status === 'vencido' || (loan.status === 'entregado' && isLoanOverdue(loan));
                const statusCfg = overdue
                  ? LOAN_STATUS_CONFIG.vencido
                  : LOAN_STATUS_CONFIG[loan.status] || LOAN_STATUS_CONFIG.solicitado;

                return (
                  <div
                    key={loan.id}
                    className="p-5 rounded-2xl border border-[#25282E] bg-[#0E1015] space-y-3 relative hover:border-[#C69A4B]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-[#E5C378] bg-[#C69A4B]/10 border border-[#C69A4B]/30 px-2 py-0.5 rounded-md">
                          {loan.resourceCode}
                        </span>
                        <h4 className="font-bold text-white text-sm mt-1">{loan.resourceName}</h4>
                        <span className="text-xs text-slate-400 font-medium">
                          Cantidad: {loan.quantity} unidad(es)
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.badgeClass}`}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <p>
                        <span className="text-slate-500 font-medium">Motivo:</span> {loan.purpose}
                      </p>
                      {loan.ministryName && (
                        <p>
                          <span className="text-slate-500 font-medium">Ministerio:</span> {loan.ministryName}
                        </p>
                      )}
                      <p>
                        <span className="text-slate-500 font-medium">Devolución Prevista:</span>{' '}
                        <strong className={overdue ? 'text-rose-400 font-mono' : 'text-[#E5C378] font-mono'}>
                          {new Date(loan.expectedReturnDate).toLocaleDateString()}
                        </strong>
                      </p>
                      {loan.checkoutDate && (
                        <p className="text-[11px] text-slate-500">
                          Entregado: {new Date(loan.checkoutDate).toLocaleDateString()} por {loan.deliveredByName}
                        </p>
                      )}
                    </div>

                    {loan.status === 'solicitado' && (
                      <div className="pt-2 border-t border-[#25282E] flex items-center justify-between">
                        <span className="text-[11px] text-amber-300/80">
                          ⏳ En espera de autorización del encargado
                        </span>
                        <button
                          onClick={() => handleCancelLoan(loan.id)}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                        >
                          Cancelar Solicitud
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PESTAÑA: CATÁLOGO DISPONIBLE
         ======================================================== */}
      {activeTab === 'catalogo' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-2xl bg-[#0E1015] border border-[#25282E] text-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar recursos por nombre o código..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#14161B] border border-[#25282E] text-white focus:outline-none focus:border-[#C69A4B]"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#14161B] border border-[#25282E] text-slate-200 focus:outline-none w-full sm:w-auto"
            >
              <option value="all">Todas las Categorías</option>
              {Object.entries(RESOURCE_CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 text-xs">
                No hay recursos disponibles que coincidan con la búsqueda.
              </div>
            ) : (
              filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-[#25282E] bg-[#0E1015] space-y-3 flex flex-col justify-between hover:border-[#C69A4B]/40 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-[#E5C378] bg-[#C69A4B]/10 border border-[#C69A4B]/30 px-2 py-0.5 rounded-md">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>

                    <h4 className="font-bold text-white text-sm">{item.name}</h4>
                    <p className="text-slate-400 text-xs">
                      {item.brand ? `${item.brand} ` : ''}
                      {item.model ? `(${item.model})` : ''}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="inline-flex items-center gap-1 text-slate-400 text-[11px]">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{item.location}</span>
                      </span>
                      <span className="text-emerald-400 font-semibold font-mono text-xs">
                        {item.quantityAvailable} disponible(s)
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedItemForLoan(item);
                      setRequestQuantity(1);
                      setRequestExpectedDate('');
                      setRequestPurpose('');
                      setIsRequestModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-[#14161B] hover:bg-[#C69A4B] text-slate-200 hover:text-black border border-[#25282E] hover:border-[#C69A4B] font-semibold text-xs transition-colors"
                  >
                    Solicitar Préstamo
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: HISTORIAL DE DEVOLUCIONES
         ======================================================== */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#25282E] bg-[#0E1015] overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#14161B] text-slate-400 font-semibold uppercase tracking-wider border-b border-[#25282E]">
                  <tr>
                    <th className="py-3 px-4">Recurso</th>
                    <th className="py-3 px-3">Cantidad</th>
                    <th className="py-3 px-3">Motivo / Actividad</th>
                    <th className="py-3 px-3">Fecha Devolución</th>
                    <th className="py-3 px-3">Estado Final</th>
                    <th className="py-3 px-4">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25282E] text-slate-300">
                  {pastLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No registras préstamos devueltos en tu historial.
                      </td>
                    </tr>
                  ) : (
                    pastLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-[#14161B]/60 transition-colors">
                        <td className="py-3 px-4">
                          <strong className="text-white block">{loan.resourceName}</strong>
                          <span className="font-mono text-[10px] text-slate-500">{loan.resourceCode}</span>
                        </td>
                        <td className="py-3 px-3">{loan.quantity} unid.</td>
                        <td className="py-3 px-3 text-slate-400">{loan.purpose}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">
                          {loan.actualReturnDate ? new Date(loan.actualReturnDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${LOAN_STATUS_CONFIG[loan.status]?.badgeClass || ''}`}>
                            {LOAN_STATUS_CONFIG[loan.status]?.label || loan.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {loan.returnNotes || loan.rejectionReason || 'Devolución conforme.'}
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
          MODAL: SOLICITAR PRÉSTAMO DE RECURSO
         ======================================================== */}
      {isRequestModalOpen && selectedItemForLoan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#2E323B] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-xs">
            <div className="border-b border-[#25282E] pb-3">
              <h3 className="text-lg font-bold font-editorial text-white">
                Solicitud de Préstamo de Recurso
              </h3>
              <p className="text-slate-400 mt-1">
                Recurso: <strong className="text-white">{selectedItemForLoan.name}</strong> ({selectedItemForLoan.code})
              </p>
              <p className="text-emerald-400 text-[11px]">
                Disponibilidad actual: {selectedItemForLoan.quantityAvailable} unidad(es)
              </p>
            </div>

            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Cantidad a Solicitar *</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedItemForLoan.quantityAvailable}
                    required
                    value={requestQuantity}
                    onChange={(e) => setRequestQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Fecha Prevista Devolución *</label>
                  <input
                    type="date"
                    required
                    value={requestExpectedDate}
                    onChange={(e) => setRequestExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Ministerio Relacionado (Opcional)</label>
                <select
                  value={requestMinistryId}
                  onChange={(e) => setRequestMinistryId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none"
                >
                  <option value="">Uso Personal / Actividad General</option>
                  {ministries.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Motivo / Actividad Congregacional *</label>
                <textarea
                  rows={3}
                  required
                  value={requestPurpose}
                  onChange={(e) => setRequestPurpose(e.target.value)}
                  placeholder="Detalla en qué reunión o evento se utilizará el recurso..."
                  className="w-full px-3 py-2 rounded-xl bg-[#17191C] border border-[#25282E] text-white focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                ℹ️ Esta solicitud quedará en estado «Solicitado» hasta que sea aprobada por el encargado de inventario. No se autoriza el retiro del equipo sin aprobación previa.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#25282E]">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#25282E] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold flex items-center gap-1.5"
                >
                  {submittingRequest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Enviar Solicitud</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
