'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Plus,
  RefreshCw,
  ShieldAlert,
  Clock,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  MaintenanceTicket,
  MaintenanceCategory,
  MaintenancePriority,
  MAINTENANCE_CATEGORIES,
} from '@/types/models';
import {
  TICKET_STATUS_CONFIG,
  EMERGENCY_PROTOCOLS,
} from '@/lib/facilities/facilityClientHelper';

interface AssignedPrepTask {
  prepId: string;
  eventTitle: string;
  eventDate: string;
  facilityName: string;
  taskId: string;
  text: string;
  completed: boolean;
  completedAt?: string;
}

interface FacilityOption {
  id: string;
  code: string;
  name: string;
  location: string;
  operationalStatus: string;
}

export function MemberFacilityPortal() {
  const { user } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'mis_reportes' | 'mis_tareas'>('mis_reportes');
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<AssignedPrepTask[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modal Reporte
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [category, setCategory] = useState<MaintenanceCategory>('electricidad_iluminacion');
  const [priority, setPriority] = useState<MaintenancePriority>('normal');
  const [description, setDescription] = useState<string>('');
  const [isEmergencyRisk, setIsEmergencyRisk] = useState<boolean>(false);
  const [emergencyType, setEmergencyType] = useState<'electrico' | 'gas' | 'inundacion' | 'estructural' | 'otro'>('electrico');

  const triggerFeedback = useCallback((msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 6000);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/facilities', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setTickets(d.myTickets || []);
        setAssignedTasks(d.myPreparationTasks || []);
        setFacilities(d.facilities || []);
      }
    } catch (e) {
      console.error(e);
      triggerFeedback('Error al cargar datos del portal de instalaciones.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, triggerFeedback]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId || !description.trim()) {
      triggerFeedback('Debe seleccionar el área física y describir el problema.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/member/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: selectedFacilityId,
          category,
          priority: isEmergencyRisk ? 'urgente' : priority,
          description: description.trim(),
          isEmergencyRisk,
          emergencyType: isEmergencyRisk ? emergencyType : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar reporte');

      triggerFeedback(
        isEmergencyRisk
          ? '⚠️ Reporte urgente enviado. Por favor mantente alejado del área afectada y sigue las instrucciones de seguridad.'
          : 'Reporte enviado exitosamente al equipo de mantenimiento.',
        'success'
      );
      setShowReportModal(false);
      setDescription('');
      setIsEmergencyRisk(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar reporte';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTask = async (task: AssignedPrepTask) => {
    try {
      const token = user ? await user.getIdToken() : '';
      await fetch(`/api/facilities/preparations/${task.prepId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'toggle_task',
          taskId: task.taskId,
          completed: !task.completed,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#141E33] via-[#0E1526] to-[#0A0D14] p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA820A] text-black shadow-md shadow-[#D4AF37]/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Instalaciones & Mantenimiento</h3>
            <p className="text-xs text-slate-300">
              Reporta fallas físicas en los templos y consulta tareas de preparación asignadas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1 rounded-lg border border-[#1E2D4A] bg-[#0E1526] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#E5C378] px-3.5 py-1.5 text-xs font-bold text-black hover:brightness-110 shadow-md"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Reportar Problema</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-600/40'
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* PESTAÑAS */}
      <div className="flex items-center gap-2 border-b border-[#1E2D4A] pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('mis_reportes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeSubTab === 'mis_reportes'
              ? 'bg-[#E5C378]/20 text-[#E5C378] border border-[#E5C378]/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>Mis Reportes ({tickets.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('mis_tareas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
            activeSubTab === 'mis_tareas'
              ? 'bg-[#E5C378]/20 text-[#E5C378] border border-[#E5C378]/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Tareas de Preparación Asignadas ({assignedTasks.length})</span>
        </button>
      </div>

      {/* SUB-PESTAÑA 1: MIS REPORTES */}
      {activeSubTab === 'mis_reportes' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Cargando tus solicitudes...</div>
          ) : tickets.length === 0 ? (
            <div className="rounded-xl border border-[#1E2D4A] bg-[#0E1526] p-8 text-center text-xs text-slate-400">
              <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-500" />
              <p className="font-semibold text-slate-300">No has reportado incidencias en las instalaciones.</p>
              <p className="mt-1">Si detectas alguna falla eléctrica, grifería, iluminación o mobiliario dañado, repórtala aquí.</p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const statusCfg = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.reportado;

              return (
                <div
                  key={ticket.id}
                  className="rounded-xl border border-[#1E2D4A] bg-[#0E1526] p-4 shadow-sm hover:border-[#D4AF37]/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#E5C378]">{ticket.ticketNumber}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{new Date(ticket.reportedAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-0.5">{ticket.facilityName}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-2">{ticket.description}</p>

                  {/* Advertencia de Seguridad */}
                  {ticket.emergencyInstructions && (
                    <div className="mt-2 rounded-lg border border-rose-600/50 bg-rose-950/40 p-2 text-xs text-rose-200">
                      <strong className="block text-[11px] text-rose-400 mb-0.5">Medida de Seguridad:</strong>
                      {ticket.emergencyInstructions}
                    </div>
                  )}

                  {ticket.resolutionNotes && (
                    <div className="mt-2 rounded-lg bg-[#141E33] p-2 text-xs text-slate-300">
                      <strong className="block text-[11px] text-[#D4AF37] mb-0.5">Resolución Técnica:</strong>
                      {ticket.resolutionNotes}
                    </div>
                  )}

                  {ticket.verifiedByName && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Verificado físicamente por: {ticket.verifiedByName}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-PESTAÑA 2: MIS TAREAS DE PREPARACIÓN */}
      {activeSubTab === 'mis_tareas' && (
        <div className="space-y-3">
          {assignedTasks.length === 0 ? (
            <div className="rounded-xl border border-[#1E2D4A] bg-[#0E1526] p-8 text-center text-xs text-slate-400">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-slate-500" />
              <p className="font-semibold text-slate-300">No tienes tareas de preparación de cultos asignadas actualmente.</p>
              <p className="mt-1">Cuando los coordinadores organicen una jornada de preparación, tus tareas aparecerán aquí.</p>
            </div>
          ) : (
            assignedTasks.map((task) => (
              <div
                key={`${task.prepId}-${task.taskId}`}
                className="flex items-start gap-3 rounded-xl border border-[#1E2D4A] bg-[#0E1526] p-3.5 shadow-sm"
              >
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => handleToggleTask(task)}
                  className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#D4AF37] focus:ring-0 cursor-pointer"
                />
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-0.5">
                    <span className="font-bold text-[#E5C378]">{task.eventTitle}</span>
                    <span>•</span>
                    <span>{task.eventDate}</span>
                    <span>•</span>
                    <span>Área: {task.facilityName}</span>
                  </div>
                  <p className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-100 font-medium'}`}>
                    {task.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL PARA REPORTAR FALLA */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-[#0E1526] p-6 shadow-2xl">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">Reportar Falla en Instalaciones</h3>
            <p className="text-xs text-slate-400 mb-4">
              Ayúdanos a mantener la casa de Dios en condiciones excelentes y seguras.
            </p>

            <form onSubmit={handleReportIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Área o Salón Afectado *</label>
                <select
                  required
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="">Selecciona el área...</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.location}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Categoría del Problema *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  {MAINTENANCE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Peligro Inmediato Checkbox */}
              <div className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEmergencyRisk}
                    onChange={(e) => setIsEmergencyRisk(e.target.checked)}
                    className="rounded border-rose-500 bg-rose-950 text-rose-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-300">
                      ¿Existe peligro inmediato? (Eléctrico, olor a gas, inundación, riesgo estructural)
                    </span>
                    <p className="text-[10px] text-rose-200/80">
                      Al marcarlo se advertirá de inmediato a los encargados y se mostrarán instrucciones de evacuación.
                    </p>
                  </div>
                </label>

                {isEmergencyRisk && (
                  <div className="mt-2 pt-2 border-t border-rose-800/40">
                    <label className="block text-[11px] font-bold text-rose-300 mb-1">Tipo de Peligro:</label>
                    <select
                      value={emergencyType}
                      onChange={(e) => setEmergencyType(e.target.value as any)}
                      className="w-full rounded border border-rose-600/60 bg-rose-950/80 px-2 py-1 text-xs text-rose-100"
                    >
                      <option value="electrico">Peligro Eléctrico (cables pelados, cortocircuito)</option>
                      <option value="gas">Olor a Gas</option>
                      <option value="inundacion">Inundación / Fuga mayor de agua</option>
                      <option value="estructural">Riesgo Estructural (grietas, techo comprometido)</option>
                      <option value="otro">Otro Riesgo Urgente</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descripción del Problema *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalla qué está fallando, ubicación exacta dentro del salón..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
