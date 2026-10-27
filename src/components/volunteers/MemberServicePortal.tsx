'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Loader2,
  HeartHandshake,
  UserCheck,
  Plus,
  Check,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  ServiceAssignment,
  Ministry,
  VolunteerAvailability,
  AssignmentStatus,
} from '@/types/models';

interface MemberServicePortalProps {
  onOpenNotifications?: () => void;
}

const STATUS_CONFIG: Record<
  AssignmentStatus,
  { label: string; badge: string; icon: typeof CheckCircle2 }
> = {
  pending_confirmation: {
    label: 'Por Confirmar',
    badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmada',
    badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    icon: CheckCircle2,
  },
  rejected: {
    label: 'Declinada',
    badge: 'bg-rose-950/60 text-rose-300 border-rose-500/40',
    icon: XCircle,
  },
  completed: {
    label: 'Servicio Concluido',
    badge: 'bg-teal-950/60 text-teal-300 border-teal-500/40',
    icon: UserCheck,
  },
  cancelled: {
    label: 'Cancelada',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: XCircle,
  },
};

export function MemberServicePortal({ onOpenNotifications }: MemberServicePortalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'proximos' | 'ministerios' | 'historial' | 'disponibilidad'>('proximos');

  // Estados de carga
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<ServiceAssignment[]>([]);
  const [historyAssignments, setHistoryAssignments] = useState<ServiceAssignment[]>([]);
  const [myMinistries, setMyMinistries] = useState<Ministry[]>([]);
  const [availableMinistries, setAvailableMinistries] = useState<Ministry[]>([]);
  const [availability, setAvailability] = useState<VolunteerAvailability>({
    daysOfWeek: ['domingo'],
    timeSlots: ['manana'],
    frequency: 'semanal',
    notes: '',
  });

  // Modal para Rechazar Asignación
  const [rejectingAssignmentId, setRejectingAssignmentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Modal para Solicitar Cambio de Horario
  const [changeAssignmentId, setChangeAssignmentId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [proposedDate, setProposedDate] = useState('');

  // Modal para Unirse a Otro Ministerio
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedJoinMinistryId, setSelectedJoinMinistryId] = useState('');
  const [joinNotes, setJoinNotes] = useState('');
  const [submittingJoin, setSubmittingJoin] = useState(false);

  // Guardando disponibilidad
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityFeedback, setAvailabilityFeedback] = useState<string | null>(null);

  // Acción en curso
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Cargar datos de servicio
  const fetchMyServiceData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/volunteers/my-service', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener datos de servicio.');

      setUpcomingAssignments(data.upcomingAssignments || []);
      setHistoryAssignments(data.historyAssignments || []);
      setMyMinistries(data.myMinistries || []);
      setAvailableMinistries(data.availableMinistriesToJoin || []);
      if (data.availability) setAvailability(data.availability);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyServiceData();
  }, [fetchMyServiceData]);

  // Confirmar o Rechazar Asignación
  const handleConfirmOrReject = async (assignmentId: string, action: 'confirm' | 'reject') => {
    if (!user) return;
    setActionLoading(assignmentId);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/member/volunteers/assignments/${assignmentId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar asignación.');

      setRejectingAssignmentId(null);
      setRejectionReason('');
      await fetchMyServiceData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la acción.';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Solicitar Cambio de Horario
  const handleRequestChange = async (assignmentId: string) => {
    if (!user) return;
    if (!changeReason.trim()) {
      alert('Por favor indica el motivo del cambio de horario.');
      return;
    }

    setActionLoading(assignmentId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/member/volunteers/assignments/${assignmentId}/request-change`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: changeReason.trim(),
          proposedAlternativeDate: proposedDate.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar cambio.');

      setChangeAssignmentId(null);
      setChangeReason('');
      setProposedDate('');
      await fetchMyServiceData();
      alert('¡Solicitud de cambio enviada al equipo de coordinación!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar solicitud.';
      alert(msg);
    } finally {
      setActionLoading(null);
    }
  };

  // Guardar Disponibilidad
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAvailability(true);
    setAvailabilityFeedback(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/volunteers/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(availability),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar disponibilidad.');

      setAvailabilityFeedback('¡Tu disponibilidad de servicio ha sido guardada con éxito!');
      setTimeout(() => setAvailabilityFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar.';
      alert(msg);
    } finally {
      setSavingAvailability(false);
    }
  };

  // Solicitar incorporarse a otro ministerio
  const handleJoinMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedJoinMinistryId) return;
    setSubmittingJoin(true);

    try {
      const token = await user.getIdToken();
      const targetMin = availableMinistries.find((m) => m.id === selectedJoinMinistryId);

      const res = await fetch('/api/community/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'ministry',
          targetId: selectedJoinMinistryId,
          targetName: targetMin?.name || 'Ministerio',
          notes: joinNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar solicitud de incorporación.');

      setIsJoinModalOpen(false);
      setSelectedJoinMinistryId('');
      setJoinNotes('');
      alert('¡Solicitud de incorporación enviada al equipo de liderazgo!');
      await fetchMyServiceData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al solicitar incorporación.';
      alert(msg);
    } finally {
      setSubmittingJoin(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner Principal de Mi Servicio */}
      <div className="rounded-3xl border border-[#25282E] bg-gradient-to-br from-[#121417] via-[#16191E] to-[#121417] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C69A4B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#E5C378] text-xs font-semibold uppercase tracking-wider">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Ministerios & Equipos de Servicio</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Mi Servicio Ministerial
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Consulta tus próximas asignaciones de servicio, confirma tu asistencia, gestiona tu disponibilidad
              y sirve con excelencia en la casa de Dios.
            </p>
            {onOpenNotifications && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="inline-flex items-center gap-1.5 text-xs text-[#E5C378] hover:text-white transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Ver avisos y notificaciones de servicio</span>
                </button>
              </div>
            )}
          </div>

          {/* Subpestañas */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl bg-[#070B14] border border-[#25282E] self-start sm:self-center text-xs">
            <button
              onClick={() => setActiveTab('proximos')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'proximos'
                  ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Próximos Turnos</span>
              {upcomingAssignments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black text-[#E5C378] font-bold">
                  {upcomingAssignments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ministerios')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'ministerios'
                  ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Mis Ministerios ({myMinistries.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('disponibilidad')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'disponibilidad'
                  ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Disponibilidad</span>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'historial'
                  ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Historial</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Carga o Error */}
      {loading && (
        <div className="p-12 text-center rounded-3xl border border-[#25282E] bg-[#121417]">
          <Loader2 className="w-8 h-8 text-[#C69A4B] animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando turnos y asignaciones de servicio...</p>
        </div>
      )}

      {error && (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 1: PRÓXIMOS TURNOS Y ASIGNACIONES
         ======================================================== */}
      {!loading && activeTab === 'proximos' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2">
            <h3 className="font-editorial text-xl font-bold text-white">Próximas Asignaciones Programadas</h3>
            <button
              onClick={fetchMyServiceData}
              className="text-xs text-[#E5C378] hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Actualizar</span>
            </button>
          </div>

          {upcomingAssignments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-[#25282E] bg-[#121417]/80 space-y-3">
              <Calendar className="w-12 h-12 text-slate-500 mx-auto" />
              <h4 className="font-editorial text-lg font-bold text-white">No tienes turnos programados</h4>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Tu coordinador de ministerio te programará en los próximos cultos o eventos según tu disponibilidad.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {upcomingAssignments.map((assignment) => {
                const statusInfo = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.pending_confirmation;
                const StatusIcon = statusInfo.icon;
                const isPending = assignment.status === 'pending_confirmation';
                const isConfirmed = assignment.status === 'confirmed';

                return (
                  <div
                    key={assignment.id}
                    className="rounded-3xl border border-[#25282E] bg-[#121417] p-6 sm:p-7 space-y-5 shadow-xl hover:border-[#C69A4B]/40 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Encabezado */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2229]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#C69A4B]">
                            {assignment.ministryName}
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-xs text-white font-semibold">{assignment.roleName}</span>
                        </div>
                        <h4 className="font-editorial text-lg sm:text-xl font-bold text-white">
                          {assignment.shiftTitle}
                        </h4>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border self-start sm:self-auto ${statusInfo.badge}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{statusInfo.label}</span>
                      </span>
                    </div>

                    {/* Detalles de Fecha, Horario y Lugar */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#16191E] p-4 rounded-2xl border border-[#25282E]">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-[#C69A4B]" />
                        <span>
                          Fecha: <strong className="text-white">{assignment.date}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-[#C69A4B]" />
                        <span>
                          Horario: <strong className="text-white">{assignment.startTime} - {assignment.endTime}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-[#C69A4B]" />
                        <span className="truncate">
                          Lugar: <strong className="text-white">{assignment.location}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Alerta de Solicitud de Cambio en Revisión */}
                    {assignment.changeRequested && assignment.changeRequested.status === 'pending' && (
                      <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>
                          Has solicitado un cambio de horario: &ldquo;{assignment.changeRequested.reason}&rdquo; (En revisión por coordinación).
                        </span>
                      </div>
                    )}

                    {/* Acciones de Confirmación / Rechazo / Cambio de Horario */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handleConfirmOrReject(assignment.id, 'confirm')}
                              disabled={actionLoading === assignment.id}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirmar Asistencia</span>
                            </button>

                            <button
                              onClick={() => setRejectingAssignmentId(assignment.id)}
                              className="px-4 py-2 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 font-semibold text-xs transition-colors"
                            >
                              No Podré Asistir
                            </button>
                          </>
                        )}

                        {isConfirmed && (
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Has confirmado tu participación. ¡Que Dios bendiga tu servicio!</span>
                          </span>
                        )}
                      </div>

                      {/* Botón para Solicitar Cambio de Horario */}
                      {assignment.status !== 'cancelled' && (
                        <button
                          onClick={() => setChangeAssignmentId(assignment.id)}
                          className="text-xs text-[#E5C378] hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Solicitar cambio de horario</span>
                        </button>
                      )}
                    </div>

                    {/* Modal en línea: Motivo de rechazo */}
                    {rejectingAssignmentId === assignment.id && (
                      <div className="p-4 rounded-2xl bg-[#0E1218] border border-rose-500/30 space-y-3 animate-in fade-in">
                        <p className="text-xs text-rose-300 font-semibold">
                          Por favor indícanos brevemente el motivo por el cual no podrás asistir:
                        </p>
                        <input
                          type="text"
                          placeholder="Ej: Compromiso de viaje, turno laboral, asunto de salud..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setRejectingAssignmentId(null);
                              setRejectionReason('');
                            }}
                            className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleConfirmOrReject(assignment.id, 'reject')}
                            disabled={actionLoading === assignment.id}
                            className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                          >
                            Declinar Turno
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Modal en línea: Solicitar cambio de horario */}
                    {changeAssignmentId === assignment.id && (
                      <div className="p-4 rounded-2xl bg-[#0E1218] border border-[#C69A4B]/40 space-y-3 animate-in fade-in">
                        <p className="text-xs text-[#E5C378] font-semibold">
                          Solicitud de Cambio de Horario al Coordinador:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="Motivo del cambio *"
                            value={changeReason}
                            onChange={(e) => setChangeReason(e.target.value)}
                            className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                          />
                          <input
                            type="date"
                            placeholder="Fecha alternativa sugerida"
                            value={proposedDate}
                            onChange={(e) => setProposedDate(e.target.value)}
                            className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => {
                              setChangeAssignmentId(null);
                              setChangeReason('');
                              setProposedDate('');
                            }}
                            className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs"
                          >
                            Cerrar
                          </button>
                          <button
                            onClick={() => handleRequestChange(assignment.id)}
                            disabled={actionLoading === assignment.id}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs"
                          >
                            Enviar Solicitud al Coordinador
                          </button>
                        </div>
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
          PESTAÑA 2: MIS MINISTERIOS
         ======================================================== */}
      {!loading && activeTab === 'ministerios' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h3 className="font-editorial text-xl font-bold text-white">Equipos en los que participas</h3>
              <p className="text-slate-400 text-xs">Ministerios activos con tu membresía en RENACER CHURCH</p>
            </div>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Solicitar incorporarme a otro ministerio</span>
            </button>
          </div>

          {myMinistries.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-[#25282E] bg-[#121417]/80 space-y-3">
              <Users className="w-12 h-12 text-slate-500 mx-auto" />
              <h4 className="font-editorial text-lg font-bold text-white">Aún no estás asignado a un ministerio</h4>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Dios te ha dado dones únicos para bendecir a la congregación. Postúlate a un ministerio de servicio.
              </p>
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="mt-2 px-5 py-2 rounded-xl bg-[#C69A4B] text-black font-bold text-xs"
              >
                Ver ministerios disponibles
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myMinistries.map((min) => (
                <div
                  key={min.id}
                  className="p-5 rounded-2xl bg-[#121417] border border-[#25282E] space-y-3 hover:border-[#C69A4B]/40 transition-colors shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C69A4B]/15 text-[#E5C378] flex items-center justify-center font-bold">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">{min.name}</h4>
                      <p className="text-xs text-slate-400">Líder: {min.leader}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-light">{min.description}</p>

                  {min.roles && min.roles.length > 0 && (
                    <div className="pt-2 border-t border-[#1E2229]">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                        Funciones del Equipo:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {min.roles.map((r) => (
                          <span
                            key={r.id}
                            className="px-2 py-0.5 rounded-md bg-[#16191E] border border-[#25282E] text-[11px] text-slate-300"
                          >
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: GESTIÓN DE DISPONIBILIDAD
         ======================================================== */}
      {!loading && activeTab === 'disponibilidad' && (
        <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-6 sm:p-8 space-y-6 shadow-2xl">
          <div>
            <h3 className="font-editorial text-xl font-bold text-white">Mi Disponibilidad de Servicio</h3>
            <p className="text-slate-400 text-xs">
              Indica los días y franjas en que puedes servir para que tus coordinadores puedan planificar los turnos.
            </p>
          </div>

          <form onSubmit={handleSaveAvailability} className="space-y-6">
            {/* Días de la semana */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Días Disponibles *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'domingo', label: 'Domingos (Cultos Generales)' },
                  { id: 'miercoles', label: 'Miércoles (Discipulado)' },
                  { id: 'viernes', label: 'Viernes (Oración / Jóvenes)' },
                  { id: 'sabado', label: 'Sábados (Ensayos / Actividades)' },
                ].map((d) => {
                  const isChecked = availability.daysOfWeek.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#1C2028] border-[#C69A4B] text-white shadow-sm'
                          : 'bg-[#16191E] border-[#25282E] text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...availability.daysOfWeek, d.id]
                            : availability.daysOfWeek.filter((item) => item !== d.id);
                          setAvailability({ ...availability, daysOfWeek: updated });
                        }}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                      />
                      <span className="text-xs font-medium">{d.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Franjas Horarias */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Franjas Horarias *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { id: 'manana', label: 'Mañanas (08:00 - 12:00)' },
                  { id: 'mediodia', label: 'Mediodía (12:00 - 15:00)' },
                  { id: 'tarde', label: 'Tarde (15:00 - 18:00)' },
                  { id: 'noche', label: 'Noche (18:00 - 21:00)' },
                ].map((slot) => {
                  const isChecked = availability.timeSlots.includes(slot.id);
                  return (
                    <label
                      key={slot.id}
                      className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-[#1C2028] border-[#C69A4B] text-white shadow-sm'
                          : 'bg-[#16191E] border-[#25282E] text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...availability.timeSlots, slot.id]
                            : availability.timeSlots.filter((item) => item !== slot.id);
                          setAvailability({ ...availability, timeSlots: updated });
                        }}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                      />
                      <span className="text-xs font-medium">{slot.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Frecuencia Preferida */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Frecuencia Preferida de Servicio</label>
              <select
                value={availability.frequency || 'semanal'}
                onChange={(e) =>
                  setAvailability({
                    ...availability,
                    frequency: e.target.value as 'semanal' | 'quincenal' | 'mensual' | 'ocasional',
                  })
                }
                className="w-full sm:w-72 bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
              >
                <option value="semanal">Semanal (Todos los fines de semana)</option>
                <option value="quincenal">Quincenal (Cada 2 semanas)</option>
                <option value="mensual">Mensual (1 vez al mes)</option>
                <option value="ocasional">Ocasional / Eventos Especiales</option>
              </select>
            </div>

            {/* Notas opcionales */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Observaciones sobre tu Disponibilidad (Opcional)
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Tengo turnos rotativos en el trabajo, no disponible la segunda semana del mes..."
                value={availability.notes || ''}
                onChange={(e) => setAvailability({ ...availability, notes: e.target.value })}
                maxLength={500}
                className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
              />
            </div>

            {availabilityFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{availabilityFeedback}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={savingAvailability}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {savingAvailability ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar Mi Disponibilidad</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 4: HISTORIAL DE PARTICIPACIÓN
         ======================================================== */}
      {!loading && activeTab === 'historial' && (
        <div className="space-y-6">
          <div>
            <h3 className="font-editorial text-xl font-bold text-white">Historial de Servicio y Participación</h3>
            <p className="text-slate-400 text-xs">Registro de cultos y eventos donde has servido a la comunidad</p>
          </div>

          {historyAssignments.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-[#25282E] bg-[#121417]/80 space-y-3">
              <UserCheck className="w-12 h-12 text-slate-500 mx-auto" />
              <h4 className="font-editorial text-lg font-bold text-white">Sin historial previo de servicio</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                A medida que concluyan tus turnos asignados, verás aquí el registro de tu fiel participación.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#25282E] bg-[#121417] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#16191E] text-slate-400 font-semibold border-b border-[#25282E]">
                    <tr>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Servicio / Jornada</th>
                      <th className="py-3 px-4">Ministerio</th>
                      <th className="py-3 px-4">Función</th>
                      <th className="py-3 px-4">Asistencia Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2229]">
                    {historyAssignments.map((h) => (
                      <tr key={h.id} className="hover:bg-[#16191E]/60 transition-colors">
                        <td className="py-3 px-4 text-white font-medium">{h.date}</td>
                        <td className="py-3 px-4 text-slate-200">{h.shiftTitle}</td>
                        <td className="py-3 px-4 text-[#E5C378]">{h.ministryName}</td>
                        <td className="py-3 px-4 text-slate-300">{h.roleName}</td>
                        <td className="py-3 px-4">
                          {h.attended ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              Presente / Servido
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                              {h.status === 'cancelled' ? 'Cancelada' : 'No Asistió'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          MODAL: INCORPORARSE A OTRO MINISTERIO
         ======================================================== */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#25282E] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#25282E]">
              <h4 className="font-editorial text-lg font-bold text-white">Solicitar Incorporación Ministerial</h4>
              <button
                onClick={() => setIsJoinModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#1A1D24] text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinMinistry} className="space-y-4">
              <div className="space-y-2">
                <label className="text-slate-200 text-xs font-semibold block">Selecciona el Ministerio *</label>
                <select
                  required
                  value={selectedJoinMinistryId}
                  onChange={(e) => setSelectedJoinMinistryId(e.target.value)}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                >
                  <option value="">Selecciona un ministerio...</option>
                  {availableMinistries.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Líder: {m.leader})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-slate-200 text-xs font-semibold block">
                  ¿Por qué deseas servir en esta área? (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Comparte tu motivación o experiencia previa..."
                  value={joinNotes}
                  onChange={(e) => setJoinNotes(e.target.value)}
                  maxLength={500}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingJoin || !selectedJoinMinistryId}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {submittingJoin ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
