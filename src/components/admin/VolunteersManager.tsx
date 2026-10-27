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
  Sparkles,
  RefreshCw,
  Plus,
  Filter,
  Download,
  Loader2,
  HeartHandshake,
  UserCheck,
  Search,
  Check,
  UserPlus,
  Shield,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { canManageMinistry } from '@/lib/volunteers/volunteerClientHelper';
import {
  ServiceShift,
  ServiceAssignment,
  Ministry,
  MinistryVolunteer,
  AssignmentStatus,
  ServiceShiftRoleRequirement,
} from '@/types/models';

interface VolunteersManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
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
    label: 'Completada',
    badge: 'bg-teal-950/60 text-teal-300 border-teal-500/40',
    icon: UserCheck,
  },
  cancelled: {
    label: 'Cancelada',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: XCircle,
  },
};

export function VolunteersManager({ onNotify }: VolunteersManagerProps) {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'jornadas' | 'asignaciones' | 'voluntarios' | 'solicitudes'>('jornadas');

  // Estados generales
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<ServiceShift[]>([]);
  const [assignments, setAssignments] = useState<ServiceAssignment[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [volunteers, setVolunteers] = useState<MinistryVolunteer[]>([]);
  const [selectedMinistryFilter, setSelectedMinistryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Crear Jornada de Servicio
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShiftTitle, setNewShiftTitle] = useState('');
  const [newShiftMinistryId, setNewShiftMinistryId] = useState('');
  const [newShiftDate, setNewShiftDate] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('12:00');
  const [newShiftLocation, setNewShiftLocation] = useState('Templo Central — Nave Principal');
  const [newShiftRoles, setNewShiftRoles] = useState<Array<{ roleId: string; roleName: string; requiredCount: number }>>([
    { roleId: 'general', roleName: 'Servicio General', requiredCount: 2 },
  ]);
  const [creatingShift, setCreatingShift] = useState(false);

  // Modal Asignar Voluntario
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignShiftId, setAssignShiftId] = useState('');
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assignRoleName, setAssignRoleName] = useState('');
  const [assignVolunteerUid, setAssignVolunteerUid] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Modal Control de Asistencia Real
  const [attendanceModalAssignment, setAttendanceModalAssignment] = useState<ServiceAssignment | null>(null);
  const [attendanceAttended, setAttendanceAttended] = useState(true);
  const [attendanceMinutes, setAttendanceMinutes] = useState(120);
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Cargar datos
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Ministerios
      const minRes = await fetch('/api/admin/community/ministries', { headers });
      const minData = await minRes.json();
      const allMinistries: Ministry[] = minData.ministries || [];
      setMinistries(allMinistries);

      // 2. Jornadas
      const shiftRes = await fetch('/api/admin/volunteers/shifts', { headers });
      const shiftData = await shiftRes.json();
      setShifts(shiftData.shifts || []);

      // 3. Asignaciones
      const assignRes = await fetch('/api/admin/volunteers/assignments', { headers });
      const assignData = await assignRes.json();
      setAssignments(assignData.assignments || []);

      // 4. Voluntarios Roster
      const rostRes = await fetch('/api/admin/volunteers/roster', { headers });
      const rostData = await rostRes.json();
      setVolunteers(rostData.volunteers || []);
    } catch (err: unknown) {
      console.error('[VolunteersManager] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exportar a CSV
  const handleExportCsv = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (selectedMinistryFilter !== 'all') params.set('ministryId', selectedMinistryFilter);

      const res = await fetch(`/api/admin/volunteers/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al exportar CSV.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `asignaciones_servicio_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      onNotify?.('Listado de asignaciones exportado a CSV exitosamente.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al exportar.';
      onNotify?.(msg, 'error');
    }
  };

  // Crear Jornada de Servicio
  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newShiftMinistryId) return;
    setCreatingShift(true);

    try {
      const token = await user.getIdToken();
      const selectedMin = ministries.find((m) => m.id === newShiftMinistryId);

      const res = await fetch('/api/admin/volunteers/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newShiftTitle,
          ministryId: newShiftMinistryId,
          ministryName: selectedMin?.name || 'Ministerio',
          date: newShiftDate,
          startTime: newShiftStart,
          endTime: newShiftEnd,
          location: newShiftLocation,
          rolesRequired: newShiftRoles,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la jornada de servicio.');

      onNotify?.('Jornada de servicio creada correctamente.', 'success');
      setIsShiftModalOpen(false);
      setNewShiftTitle('');
      setNewShiftDate('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear jornada.';
      alert(msg);
    } finally {
      setCreatingShift(false);
    }
  };

  // Asignar Voluntario a Turno
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !assignShiftId || !assignVolunteerUid) return;
    setCreatingAssignment(true);
    setConflictWarning(null);

    try {
      const token = await user.getIdToken();
      const targetShift = shifts.find((s) => s.id === assignShiftId);
      const targetVol = volunteers.find((v) => v.userId === assignVolunteerUid);

      if (!targetShift || !targetVol) {
        throw new Error('Jornada o voluntario no encontrado.');
      }

      const res = await fetch('/api/admin/volunteers/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftId: targetShift.id,
          shiftTitle: targetShift.title,
          ministryId: targetShift.ministryId,
          ministryName: targetShift.ministryName,
          date: targetShift.date,
          startTime: targetShift.startTime,
          endTime: targetShift.endTime,
          location: targetShift.location,
          roleId: assignRoleId || 'general',
          roleName: assignRoleName || 'Voluntario General',
          volunteerUid: targetVol.userId,
          volunteerName: targetVol.userName,
          volunteerEmail: targetVol.userEmail,
          volunteerPhone: targetVol.userPhone,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Conflicto de horario detectado
        setConflictWarning(data.error);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Error al asignar voluntario.');

      onNotify?.('Voluntario asignado correctamente. Se notificó al voluntario para su confirmación.', 'success');
      setIsAssignModalOpen(false);
      setAssignShiftId('');
      setAssignVolunteerUid('');
      setConflictWarning(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la asignación.';
      alert(msg);
    } finally {
      setCreatingAssignment(false);
    }
  };

  // Registrar Asistencia Real
  const handleSaveAttendance = async () => {
    if (!user || !attendanceModalAssignment) return;
    setSavingAttendance(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/volunteers/assignments/${attendanceModalAssignment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attended: attendanceAttended,
          actualMinutesServed: attendanceMinutes,
          attendanceNotes: attendanceNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar asistencia.');

      onNotify?.('Asistencia real de servicio guardada con éxito.', 'success');
      setAttendanceModalAssignment(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar asistencia.';
      alert(msg);
    } finally {
      setSavingAttendance(false);
    }
  };

  // Cancelar Asignación
  const handleCancelAssignment = async (assignmentId: string) => {
    if (!confirm('¿Estás seguro de cancelar esta asignación de servicio? Se notificará al voluntario.')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/volunteers/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'cancelled', cancelReason: 'Cancelada por coordinación' }),
      });
      if (!res.ok) throw new Error('Error al cancelar.');
      onNotify?.('Asignación cancelada correctamente.', 'info');
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Métricas y Resúmenes
  const today = new Date().toISOString().split('T')[0];
  const activeVolunteersCount = volunteers.filter((v) => v.status === 'active').length;
  const upcomingShiftsCount = shifts.filter((s) => s.date >= today && s.status !== 'cancelled').length;
  const pendingConfirmationCount = assignments.filter((a) => a.status === 'pending_confirmation').length;

  // Equipos con Personal Insuficiente (Understaffed shifts)
  const understaffedShifts = shifts.filter((s) => {
    if (s.date < today || s.status === 'cancelled') return false;
    const shiftAssignmentsCount = assignments.filter(
      (a) => a.shiftId === s.id && a.status !== 'cancelled' && a.status !== 'rejected'
    ).length;
    return shiftAssignmentsCount < s.totalVolunteersNeeded;
  });

  // Filtrado de Jornadas
  const filteredShifts = shifts.filter((s) => {
    if (selectedMinistryFilter !== 'all' && s.ministryId !== selectedMinistryFilter) return false;
    if (searchQuery.trim() && !s.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Filtrado de Asignaciones
  const filteredAssignments = assignments.filter((a) => {
    if (selectedMinistryFilter !== 'all' && a.ministryId !== selectedMinistryFilter) return false;
    if (searchQuery.trim()) {
      const matchVol = a.volunteerName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = a.roleName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchTitle = a.shiftTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchVol || matchRole || matchTitle;
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Encabezado Principal */}
      <div className="rounded-3xl border border-[#25282E] bg-gradient-to-br from-[#121417] via-[#16191E] to-[#121417] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C69A4B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#E5C378] text-xs font-semibold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Gestión de Voluntarios & Equipos Ministeriales</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Voluntarios y Servicio
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Planificación de jornadas, detección de conflictos de horario, asignaciones con aceptación de voluntario,
              control de participación real y exportación de calendarios.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl border border-[#25282E] bg-[#16191E] hover:border-[#C69A4B]/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => setIsShiftModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Jornada de Servicio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Voluntarios Activos', value: activeVolunteersCount, color: 'text-white', border: 'border-[#25282E]' },
          { label: 'Próximos Servicios', value: upcomingShiftsCount, color: 'text-[#E5C378]', border: 'border-[#C69A4B]/30' },
          { label: 'Por Confirmar', value: pendingConfirmationCount, color: 'text-amber-400', border: 'border-amber-500/30' },
          { label: 'Personal Insuficiente', value: understaffedShifts.length, color: understaffedShifts.length > 0 ? 'text-rose-400' : 'text-emerald-400', border: understaffedShifts.length > 0 ? 'border-rose-500/40' : 'border-emerald-500/30' },
        ].map((card, idx) => (
          <div key={idx} className={`p-5 rounded-2xl bg-[#121417] border ${card.border} space-y-1 shadow-lg`}>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{card.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Alerta de Equipos con Personal Insuficiente */}
      {understaffedShifts.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <strong className="text-rose-300 font-bold block text-sm">
                Atención: Hay {understaffedShifts.length} jornada(s) con personal insuficiente
              </strong>
              <span className="text-rose-300/80">
                Se requiere programar más voluntarios para cubrir las funciones mínimas en los próximos cultos.
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('jornadas')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs self-start sm:self-auto transition-colors"
          >
            Ver Jornadas Faltantes
          </button>
        </div>
      )}

      {/* Barra de Filtros y Subpestañas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-[#121417] border border-[#25282E]">
        {/* Pestañas */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'jornadas' as const, label: 'Jornadas y Turnos', icon: Calendar, badge: shifts.length },
            { id: 'asignaciones' as const, label: 'Planificación & Asignaciones', icon: Layers, badge: assignments.length },
            { id: 'voluntarios' as const, label: 'Equipo de Voluntarios', icon: Users, badge: volunteers.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#1A1D23]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-black text-[#E5C378]' : 'bg-[#25282E] text-slate-300'}`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtros: Ministerio y Buscador */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedMinistryFilter}
            onChange={(e) => setSelectedMinistryFilter(e.target.value)}
            className="bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
          >
            <option value="all">Todos los Ministerios</option>
            {ministries.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar voluntario o rol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16191E] border border-[#25282E] rounded-xl pl-8 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          PESTAÑA 1: JORNADAS Y TURNOS DE SERVICIO
         ======================================================== */}
      {activeTab === 'jornadas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-lg font-bold text-white">Calendario de Jornadas de Servicio</h3>
            <button
              onClick={() => {
                setIsAssignModalOpen(true);
                if (shifts.length > 0) setAssignShiftId(shifts[0].id);
              }}
              className="px-4 py-2 rounded-xl border border-[#C69A4B]/40 bg-[#C69A4B]/10 hover:bg-[#C69A4B]/20 text-[#E5C378] font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Asignar Voluntario</span>
            </button>
          </div>

          {filteredShifts.length === 0 ? (
            <div className="p-16 text-center rounded-3xl border border-[#25282E] bg-[#121417] space-y-3">
              <Calendar className="w-12 h-12 text-slate-500 mx-auto" />
              <h4 className="font-editorial text-base font-bold text-white">No hay jornadas registradas</h4>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Crea una nueva jornada para programar voluntarios en los próximos cultos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredShifts.map((s) => {
                const shiftAssignments = assignments.filter(
                  (a) => a.shiftId === s.id && a.status !== 'cancelled' && a.status !== 'rejected'
                );
                const assignedCount = shiftAssignments.length;
                const isUnderstaffed = assignedCount < s.totalVolunteersNeeded;

                return (
                  <div
                    key={s.id}
                    className="p-5 rounded-2xl bg-[#121417] border border-[#25282E] space-y-4 hover:border-[#C69A4B]/40 transition-colors shadow-lg relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#1E2229]">
                      <div>
                        <span className="text-[10px] text-[#C69A4B] font-bold uppercase tracking-wider block">
                          {s.ministryName}
                        </span>
                        <h4 className="font-bold text-white text-base">{s.title}</h4>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isUnderstaffed
                            ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {assignedCount} / {s.totalVolunteersNeeded} Voluntarios
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-[#16191E] p-3 rounded-xl border border-[#25282E]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#C69A4B]" />
                        <span>{s.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#C69A4B]" />
                        <span>{s.startTime} - {s.endTime}</span>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5 text-slate-400 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#C69A4B] shrink-0" />
                        <span className="truncate">{s.location}</span>
                      </div>
                    </div>

                    {/* Funciones requeridas */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Funciones requeridas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {s.rolesRequired.map((r, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-[#16191E] border border-[#25282E] text-[11px] text-slate-300"
                          >
                            {r.roleName} ({r.requiredCount})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botón rápido para asignar a esta jornada */}
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setAssignShiftId(s.id);
                          setIsAssignModalOpen(true);
                        }}
                        className="text-xs text-[#E5C378] font-bold hover:underline flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Asignar a este turno</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          PESTAÑA 2: ASIGNACIONES DE SERVICIO
         ======================================================== */}
      {activeTab === 'asignaciones' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-lg font-bold text-white">Listado de Asignaciones Individuales</h3>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nueva Asignación</span>
            </button>
          </div>

          <div className="rounded-3xl border border-[#25282E] bg-[#121417] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#16191E] text-slate-400 font-semibold uppercase tracking-wider border-b border-[#25282E]">
                  <tr>
                    <th className="py-3.5 px-4">Voluntario</th>
                    <th className="py-3.5 px-4">Ministerio / Función</th>
                    <th className="py-3.5 px-4">Fecha & Horario</th>
                    <th className="py-3.5 px-4">Estado Asignación</th>
                    <th className="py-3.5 px-4">Participación Real</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2229]">
                  {filteredAssignments.map((a) => {
                    const statusInfo = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending_confirmation;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <tr key={a.id} className="hover:bg-[#16191E]/60 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div className="flex flex-col">
                            <span className="font-bold">{a.volunteerName}</span>
                            <span className="text-[11px] text-slate-400">{a.volunteerEmail}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-[#E5C378]">{a.ministryName}</span>
                            <span className="text-slate-300 text-[11px]">{a.roleName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300">
                          <div>
                            <span className="font-semibold">{a.date}</span>
                            <span className="text-slate-400 text-[11px] block">{a.startTime} - {a.endTime}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo.badge}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusInfo.label}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {a.attended === true ? (
                            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Presente ({a.actualMinutesServed || 120}m)</span>
                            </span>
                          ) : a.attended === false ? (
                            <span className="text-rose-400 font-semibold text-[11px]">No Asistió</span>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Pendiente de registro</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Registrar Asistencia Real */}
                            <button
                              onClick={() => {
                                setAttendanceModalAssignment(a);
                                setAttendanceAttended(a.attended !== false);
                                setAttendanceMinutes(a.actualMinutesServed || 120);
                                setAttendanceNotes(a.attendanceNotes || '');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[#C69A4B]/40 bg-[#C69A4B]/10 hover:bg-[#C69A4B]/20 text-[#E5C378] font-bold text-[11px]"
                            >
                              Asistencia
                            </button>

                            {/* Cancelar Asignación */}
                            {a.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCancelAssignment(a.id)}
                                className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 text-[11px]"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA 3: EQUIPO DE VOLUNTARIOS Y DISPONIBILIDAD
         ======================================================== */}
      {activeTab === 'voluntarios' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-editorial text-lg font-bold text-white">Directorio de Voluntarios por Ministerio</h3>
            <span className="text-xs text-slate-400">Total: {volunteers.length} miembros</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {volunteers.map((vol) => (
              <div
                key={vol.id}
                className="p-5 rounded-2xl bg-[#121417] border border-[#25282E] space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{vol.userName}</h4>
                    <span className="text-[11px] text-slate-400">{vol.userEmail}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      vol.status === 'active'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {vol.status === 'active' ? 'Activo' : 'Pausado'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-300">
                  <p className="text-[11px] text-[#E5C378] font-semibold">{vol.ministryName}</p>
                  {vol.availability ? (
                    <div className="bg-[#16191E] p-2.5 rounded-xl border border-[#25282E] space-y-1 text-[11px]">
                      <p>
                        <strong className="text-slate-400">Días:</strong> {vol.availability.daysOfWeek?.join(', ') || 'Sin definir'}
                      </p>
                      <p>
                        <strong className="text-slate-400">Franjas:</strong> {vol.availability.timeSlots?.join(', ') || 'Sin definir'}
                      </p>
                      {vol.availability.notes && (
                        <p className="text-slate-400 italic">&ldquo;{vol.availability.notes}&rdquo;</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[11px] italic">Disponibilidad no declarada aún</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CREAR JORNADA DE SERVICIO
         ======================================================== */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#25282E] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#25282E]">
              <h4 className="font-editorial text-lg font-bold text-white">Nueva Jornada de Servicio</h4>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#1A1D24] text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Título de la Jornada *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Culto Dominical — Servicio de Alabanza"
                  value={newShiftTitle}
                  onChange={(e) => setNewShiftTitle(e.target.value)}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Ministerio Responsable *</label>
                <select
                  required
                  value={newShiftMinistryId}
                  onChange={(e) => setNewShiftMinistryId(e.target.value)}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                >
                  <option value="">Selecciona un ministerio...</option>
                  {ministries.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-200 text-xs font-semibold block">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={newShiftDate}
                    onChange={(e) => setNewShiftDate(e.target.value)}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-200 text-xs font-semibold block">Inicio *</label>
                  <input
                    type="time"
                    required
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-200 text-xs font-semibold block">Fin *</label>
                  <input
                    type="time"
                    required
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Lugar de Servicio</label>
                <input
                  type="text"
                  value={newShiftLocation}
                  onChange={(e) => setNewShiftLocation(e.target.value)}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingShift}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {creatingShift ? 'Creando...' : 'Crear Jornada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ASIGNAR VOLUNTARIO A TURNO (CON DETECCIÓN DE CONFLICTOS)
         ======================================================== */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#25282E] rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#25282E]">
              <h4 className="font-editorial text-lg font-bold text-white">Asignar Voluntario a Servicio</h4>
              <button
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setConflictWarning(null);
                }}
                className="w-7 h-7 rounded-full bg-[#1A1D24] text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Aviso de Conflicto de Horario si fue detectado */}
            {conflictWarning && (
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/50 text-xs text-rose-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Conflicto de Horario Detectado</span>
                </div>
                <p>{conflictWarning}</p>
              </div>
            )}

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Selecciona la Jornada / Turno *</label>
                <select
                  required
                  value={assignShiftId}
                  onChange={(e) => {
                    setAssignShiftId(e.target.value);
                    setConflictWarning(null);
                  }}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                >
                  <option value="">Selecciona jornada...</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} • {s.title} ({s.startTime} - {s.endTime})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Función / Rol en el Servicio *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Voz Principal, Consola de Audio, Ujier Nave Central..."
                  value={assignRoleName}
                  onChange={(e) => {
                    setAssignRoleName(e.target.value);
                    setAssignRoleId(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Selecciona el Voluntario *</label>
                <select
                  required
                  value={assignVolunteerUid}
                  onChange={(e) => {
                    setAssignVolunteerUid(e.target.value);
                    setConflictWarning(null);
                  }}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                >
                  <option value="">Selecciona miembro voluntario...</option>
                  {volunteers.map((v) => (
                    <option key={v.userId} value={v.userId}>
                      {v.userName} ({v.userEmail}) • {v.ministryName}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                Nota: La asignación quedará en estado <strong>&ldquo;Por Confirmar&rdquo;</strong> y se enviará una notificación
                al miembro para que acepte o decline el turno.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingAssignment || !assignShiftId || !assignVolunteerUid}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {creatingAssignment ? 'Verificando y Asignando...' : 'Asignar Voluntario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: REGISTRAR ASISTENCIA / PARTICIPACIÓN REAL
         ======================================================== */}
      {attendanceModalAssignment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121417] border border-[#25282E] rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#25282E]">
              <div>
                <h4 className="font-editorial text-lg font-bold text-white">Registro de Asistencia Real</h4>
                <p className="text-xs text-slate-400">
                  {attendanceModalAssignment.volunteerName} • {attendanceModalAssignment.roleName}
                </p>
              </div>
              <button
                onClick={() => setAttendanceModalAssignment(null)}
                className="w-7 h-7 rounded-full bg-[#1A1D24] text-slate-400 hover:text-white flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-[#16191E] rounded-2xl border border-[#25282E]">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                  <input
                    type="radio"
                    name="attended"
                    checked={attendanceAttended === true}
                    onChange={() => setAttendanceAttended(true)}
                    className="text-[#C69A4B] focus:ring-[#C69A4B]"
                  />
                  <span>Presente & Servido</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <input
                    type="radio"
                    name="attended"
                    checked={attendanceAttended === false}
                    onChange={() => setAttendanceAttended(false)}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                  <span>No Asistió</span>
                </label>
              </div>

              {attendanceAttended && (
                <div className="space-y-1">
                  <label className="text-slate-200 text-xs font-semibold block">Minutos Servidos</label>
                  <input
                    type="number"
                    value={attendanceMinutes}
                    onChange={(e) => setAttendanceMinutes(Number(e.target.value))}
                    min={15}
                    max={600}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-200 text-xs font-semibold block">Notas de Asistencia (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Observaciones de puntualidad, actitud o reemplazo..."
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  maxLength={500}
                  className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceModalAssignment(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-md hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {savingAttendance ? 'Guardando...' : 'Guardar Participación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
