'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Download,
  ShieldAlert,
  Building2,
  Sparkles,
  ClipboardCheck,
  UserCheck,
  Zap,
  Droplets,
  Wind,
  CloudRain,
  Armchair,
  Key,
  Tv,
  Eye,
  RefreshCw,
  X,
  Flame,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  FacilityArea,
  FacilityOperationalStatus,
  MaintenanceTicket,
  MaintenancePriority,
  MaintenanceTicketStatus,
  MaintenanceCategory,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  PreventiveTask,
  EventFacilityPreparation,
} from '@/types/models';
import {
  canManageFacilities,
  canViewFacilityFinancials,
  FACILITY_STATUS_CONFIG,
  TICKET_STATUS_CONFIG,
  isPreventiveTaskOverdue,
  EMERGENCY_PROTOCOLS,
  FREQUENCY_LABELS,
} from '@/lib/facilities/facilityClientHelper';

export function FacilitiesManager() {
  const { user, profile } = useAuth();
  const canManage = canManageFacilities(profile);
  const canViewFinancials = canViewFacilityFinancials(profile);

  // Sub-pestañas principales
  const [activeTab, setActiveTab] = useState<'incidencias' | 'instalaciones' | 'preventivo' | 'preparaciones'>('incidencias');

  // Datos principales
  const [facilities, setFacilities] = useState<FacilityArea[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [preventiveTasks, setPreventiveTasks] = useState<PreventiveTask[]>([]);
  const [preparations, setPreparations] = useState<EventFacilityPreparation[]>([]);

  // Estados de carga y feedback
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Filtros de incidencias
  const [filterFacility, setFilterFacility] = useState<string>('todos');
  const [filterPriority, setFilterPriority] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterCategory, setFilterCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modales
  const [showNewTicketModal, setShowNewTicketModal] = useState<boolean>(false);
  const [showNewFacilityModal, setShowNewFacilityModal] = useState<boolean>(false);
  const [showNewPreventiveModal, setShowNewPreventiveModal] = useState<boolean>(false);
  const [showNewPrepModal, setShowNewPrepModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [assignModalTicket, setAssignModalTicket] = useState<MaintenanceTicket | null>(null);
  const [verifyModalTicket, setVerifyModalTicket] = useState<MaintenanceTicket | null>(null);
  const [completeWorkTicket, setCompleteWorkTicket] = useState<MaintenanceTicket | null>(null);

  // Formulario Nueva Instalación
  const [facName, setFacName] = useState('');
  const [facCode, setFacCode] = useState('');
  const [facLocation, setFacLocation] = useState('');
  const [facDesc, setFacDesc] = useState('');
  const [facStatus, setFacStatus] = useState<FacilityOperationalStatus>('operativo');
  const [facManagerName, setFacManagerName] = useState('');
  const [facCapacity, setFacCapacity] = useState<number | ''>('');

  // Formulario Nuevo Ticket
  const [ticketFacId, setTicketFacId] = useState('');
  const [ticketCategory, setTicketCategory] = useState<MaintenanceCategory>('electricidad_iluminacion');
  const [ticketPriority, setTicketPriority] = useState<MaintenancePriority>('normal');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketEmergencyRisk, setTicketEmergencyRisk] = useState(false);
  const [ticketEmergencyType, setTicketEmergencyType] = useState<'electrico' | 'gas' | 'inundacion' | 'estructural' | 'otro'>('electrico');

  // Formulario Asignación
  const [assignTechName, setAssignTechName] = useState('');
  const [assignTechUid, setAssignTechUid] = useState('');

  // Formulario Verificación Final Obligatoria
  const [verifyNotes, setVerifyNotes] = useState('');

  // Formulario Completar Trabajo
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeCost, setCompleteCost] = useState<number | ''>('');

  // Formulario Nuevo Preventivo
  const [prevTitle, setPrevTitle] = useState('');
  const [prevFacId, setPrevFacId] = useState('');
  const [prevFrequency, setPrevFrequency] = useState<'semanal' | 'mensual' | 'trimestral' | 'semestral' | 'anual'>('mensual');
  const [prevScheduledDate, setPrevScheduledDate] = useState('');
  const [prevTechName, setPrevTechName] = useState('');
  const [prevTechUid, setPrevTechUid] = useState('');
  const [prevChecklistText, setPrevChecklistText] = useState('Inspección visual general\nRevisión de conexiones e interruptores\nLimpieza y desinfección');

  // Formulario Nueva Preparación de Evento
  const [prepEventTitle, setPrepEventTitle] = useState('');
  const [prepEventDate, setPrepEventDate] = useState('');
  const [prepFacId, setPrepFacId] = useState('');

  const triggerFeedback = useCallback((msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setFeedback({ msg, type });
    setTimeout(() => setFeedback(null), 6000);
  }, []);

  // Cargar datos
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [facRes, tickRes, prevRes, prepRes] = await Promise.all([
        fetch('/api/facilities', { headers }),
        fetch('/api/facilities/tickets', { headers }),
        fetch('/api/facilities/preventive', { headers }),
        fetch('/api/facilities/preparations', { headers }),
      ]);

      if (facRes.ok) {
        const d = await facRes.json();
        setFacilities(d.facilities || []);
      }
      if (tickRes.ok) {
        const d = await tickRes.json();
        setTickets(d.tickets || []);
      }
      if (prevRes.ok) {
        const d = await prevRes.json();
        setPreventiveTasks(d.tasks || []);
      }
      if (prepRes.ok) {
        const d = await prepRes.json();
        setPreparations(d.preparations || []);
      }
    } catch (e) {
      console.error(e);
      triggerFeedback('Error al cargar datos del módulo de instalaciones.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, triggerFeedback]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos de Indicadores KPI
  const kpis = useMemo(() => {
    const totalOpenTickets = tickets.filter(
      (t) => t.status !== 'completado' && t.status !== 'cancelado'
    ).length;
    const urgentTickets = tickets.filter(
      (t) => t.priority === 'urgente' && t.status !== 'completado' && t.status !== 'cancelado'
    ).length;
    const overdueTasks = preventiveTasks.filter((t) => isPreventiveTaskOverdue(t)).length;
    const today = new Date().toISOString().split('T')[0];
    const upcomingTasks = preventiveTasks.filter(
      (t) => t.status !== 'completado' && t.status !== 'cancelado' && t.scheduledDate >= today
    ).length;
    const inProgressTickets = tickets.filter(
      (t) => t.status === 'en_proceso' || t.status === 'asignado'
    ).length;
    const completedTickets = tickets.filter((t) => t.status === 'completado').length;

    return {
      totalOpenTickets,
      urgentTickets,
      overdueTasks,
      upcomingTasks,
      inProgressTickets,
      completedTickets,
    };
  }, [tickets, preventiveTasks]);

  // Filtrado de incidencias
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterFacility !== 'todos' && t.facilityId !== filterFacility) return false;
      if (filterPriority !== 'todos' && t.priority !== filterPriority) return false;
      if (filterStatus !== 'todos' && t.status !== filterStatus) return false;
      if (filterCategory !== 'todos' && t.category !== filterCategory) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        const matches =
          t.ticketNumber.toLowerCase().includes(s) ||
          t.description.toLowerCase().includes(s) ||
          t.facilityName.toLowerCase().includes(s) ||
          (t.assignedToName && t.assignedToName.toLowerCase().includes(s));
        if (!matches) return false;
      }
      return true;
    });
  }, [tickets, filterFacility, filterPriority, filterStatus, filterCategory, searchTerm]);

  // Crear Instalación
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facName.trim() || !facCode.trim() || !facLocation.trim()) {
      triggerFeedback('Nombre, código y ubicación son obligatorios.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: facName.trim(),
          code: facCode.trim(),
          location: facLocation.trim(),
          description: facDesc.trim(),
          operationalStatus: facStatus,
          managerName: facManagerName.trim() || null,
          capacity: typeof facCapacity === 'number' && facCapacity > 0 ? facCapacity : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear instalación');

      triggerFeedback('Instalación física registrada exitosamente.', 'success');
      setShowNewFacilityModal(false);
      setFacName('');
      setFacCode('');
      setFacLocation('');
      setFacDesc('');
      setFacManagerName('');
      setFacCapacity('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar área';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Crear Incidencia / Reporte
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketFacId || !ticketDesc.trim()) {
      triggerFeedback('Debe seleccionar el área y describir el problema.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/facilities/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: ticketFacId,
          category: ticketCategory,
          priority: ticketPriority,
          description: ticketDesc.trim(),
          isEmergencyRisk: ticketEmergencyRisk,
          emergencyType: ticketEmergencyRisk ? ticketEmergencyType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reportar incidencia');

      triggerFeedback(
        ticketPriority === 'urgente' || ticketEmergencyRisk
          ? '⚠️ Reporte urgente enviado. Protocolos de seguridad activados.'
          : 'Solicitud de mantenimiento registrada.',
        'success'
      );
      setShowNewTicketModal(false);
      setTicketDesc('');
      setTicketEmergencyRisk(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reportar';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Asignar Técnico
  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalTicket || !assignTechName.trim()) {
      triggerFeedback('Debe indicar el nombre del responsable técnico.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/facilities/tickets/${assignModalTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'assign',
          assignedToName: assignTechName.trim(),
          assignedToUid: assignTechUid.trim() || 'tech-manual-uid',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al asignar');

      triggerFeedback(`Incidencia asignada a ${assignTechName.trim()}.`, 'success');
      setAssignModalTicket(null);
      setAssignTechName('');
      setAssignTechUid('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asignar';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Iniciar Trabajo (Cambiar a en_proceso)
  const handleStartWork = async (ticket: MaintenanceTicket) => {
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/facilities/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'update_status',
          status: 'en_proceso',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');

      triggerFeedback(`Trabajo puesto en proceso para ${ticket.ticketNumber}.`, 'success');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Finalizar Trabajo (Pasa a en_revision para verificación obligatoria)
  const handleCompleteWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeWorkTicket || !completeNotes.trim()) {
      triggerFeedback('Debe indicar las notas de resolución técnica.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/facilities/tickets/${completeWorkTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'complete_work',
          resolutionNotes: completeNotes.trim(),
          actualCost: typeof completeCost === 'number' && completeCost >= 0 ? completeCost : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reportar finalización');

      triggerFeedback(
        'Trabajo completado. Pendiente de verificación física final de seguridad.',
        'success'
      );
      setCompleteWorkTicket(null);
      setCompleteNotes('');
      setCompleteCost('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al finalizar';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Verificación Final de Seguridad Obligatoria (Cierre definitivo)
  const handleVerifyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyModalTicket || !verifyNotes.trim()) {
      triggerFeedback('Las notas de verificación física son obligatorias para certificar la seguridad.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/facilities/tickets/${verifyModalTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'verify',
          verificationNotes: verifyNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al certificar');

      triggerFeedback(
        `Reparación en ${verifyModalTicket.facilityName} certificada como segura y cerrada satisfactoriamente.`,
        'success'
      );
      setVerifyModalTicket(null);
      setVerifyNotes('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al verificar';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Crear Tarea Preventiva
  const handleCreatePreventive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prevTitle.trim() || !prevFacId || !prevScheduledDate || !prevTechName.trim()) {
      triggerFeedback('Todos los campos son obligatorios.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const checklistItems = prevChecklistText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((text, idx) => ({ id: `chk-${idx + 1}`, text, completed: false }));

      const res = await fetch('/api/facilities/preventive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: prevTitle.trim(),
          facilityId: prevFacId,
          frequency: prevFrequency,
          scheduledDate: prevScheduledDate,
          assignedToName: prevTechName.trim(),
          assignedToUid: prevTechUid.trim() || 'tech-manual-uid',
          checklist: checklistItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al programar');

      triggerFeedback('Mantenimiento preventivo programado.', 'success');
      setShowNewPreventiveModal(false);
      setPrevTitle('');
      setPrevScheduledDate('');
      setPrevTechName('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al programar';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar ítem de checklist preventivo
  const handleTogglePreventiveChecklist = async (taskId: string, checklistItemId: string, completed: boolean) => {
    try {
      const token = user ? await user.getIdToken() : '';
      await fetch(`/api/facilities/preventive/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'toggle_checklist',
          checklistItemId,
          completed,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Crear Lista de Preparación de Evento
  const handleCreatePrep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepEventTitle.trim() || !prepEventDate || !prepFacId) {
      triggerFeedback('Título, fecha y área son obligatorios.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/facilities/preparations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventTitle: prepEventTitle.trim(),
          eventDate: prepEventDate,
          facilityId: prepFacId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear');

      triggerFeedback('Lista de preparación de evento generada.', 'success');
      setShowNewPrepModal(false);
      setPrepEventTitle('');
      setPrepEventDate('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error';
      triggerFeedback(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar tarea en lista de preparación de evento
  const handleTogglePrepTask = async (prepId: string, taskId: string, completed: boolean) => {
    try {
      const token = user ? await user.getIdToken() : '';
      await fetch(`/api/facilities/preparations/${prepId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'toggle_task',
          taskId,
          completed,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  // Exportar a CSV
  const handleExportCsv = async (type: 'tickets' | 'facilities' | 'preventive') => {
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/facilities/export?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al descargar reporte');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FAMA_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      triggerFeedback(`Reporte de ${type} descargado exitosamente.`, 'success');
    } catch (e) {
      console.error(e);
      triggerFeedback('Error al exportar CSV.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO INSTITUCIONAL */}
      <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#141E33] via-[#0E1526] to-[#0A0D14] p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA820A] text-black shadow-lg shadow-[#D4AF37]/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">ETAPA 13</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-400">Edificio & Infraestructura</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Gestión de Instalaciones y Mantenimiento</h2>
              <p className="text-xs text-slate-300">
                Control de áreas físicas, inspecciones preventivas, reparaciones seguras y preparación para cultos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExportCsv(activeTab === 'instalaciones' ? 'facilities' : activeTab === 'preventivo' ? 'preventive' : 'tickets')}
              className="flex items-center gap-1.5 rounded-xl border border-[#1E2D4A] bg-[#0E1526] px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[#D4AF37]/40 hover:text-white transition-all shadow-sm"
              title="Descargar datos en formato CSV para Microsoft Excel"
            >
              <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-[#1E2D4A] bg-[#0E1526] px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            {canManage && (
              <>
                <button
                  onClick={() => setShowNewFacilityModal(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 px-3.5 py-2 text-xs font-bold text-[#E5C378] hover:bg-[#D4AF37]/20 transition-all shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nueva Área</span>
                </button>
                <button
                  onClick={() => setShowNewTicketModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#E5C378] px-4 py-2 text-xs font-black text-black hover:brightness-110 transition-all shadow-lg shadow-[#D4AF37]/20"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Reportar Incidencia</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {feedback && (
        <div
          role="alert"
          className={`rounded-xl p-4 text-xs font-medium border flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'
              : feedback.type === 'warning'
              ? 'bg-amber-950/60 text-amber-300 border-amber-600/50'
              : 'bg-rose-950/60 text-rose-300 border-rose-600/50'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 6 INDICADORES KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Solicitudes Abiertas */}
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0E1526]/80 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Abiertas</span>
            <Wrench className="h-4 w-4 text-[#D4AF37]" />
          </div>
          <div className="text-2xl font-black text-white">{kpis.totalOpenTickets}</div>
          <div className="text-[10px] text-slate-400">Incidencias en trámite</div>
        </div>

        {/* KPI 2: Incidencias Urgentes (Destacada) */}
        <div
          onClick={() => {
            setActiveTab('incidencias');
            setFilterPriority('urgente');
          }}
          className={`cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all ${
            kpis.urgentTickets > 0
              ? 'border-rose-600 bg-rose-950/40 hover:bg-rose-950/60 animate-pulse'
              : 'border-[#1E2D4A] bg-[#0E1526]/80'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Urgentes</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-300">{kpis.urgentTickets}</div>
          <div className="text-[10px] text-rose-400/80">Atención prioritaria</div>
        </div>

        {/* KPI 3: Tareas Vencidas */}
        <div
          onClick={() => {
            setActiveTab('preventivo');
            setFilterStatus('vencido');
          }}
          className={`cursor-pointer rounded-xl border p-3.5 shadow-sm transition-all ${
            kpis.overdueTasks > 0
              ? 'border-amber-600 bg-amber-950/40 hover:bg-amber-950/60'
              : 'border-[#1E2D4A] bg-[#0E1526]/80'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Vencidas</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{kpis.overdueTasks}</div>
          <div className="text-[10px] text-amber-400/80">Inspecciones atrasadas</div>
        </div>

        {/* KPI 4: Mantenimientos Próximos */}
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0E1526]/80 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Próximos</span>
            <Calendar className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpis.upcomingTasks}</div>
          <div className="text-[10px] text-slate-400">Inspecciones en fecha</div>
        </div>

        {/* KPI 5: Trabajos en Proceso */}
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0E1526]/80 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">En Proceso</span>
            <Sparkles className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{kpis.inProgressTickets}</div>
          <div className="text-[10px] text-slate-400">Asignadas y en curso</div>
        </div>

        {/* KPI 6: Trabajos Completados */}
        <div className="rounded-xl border border-[#1E2D4A] bg-[#0E1526]/80 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Completados</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{kpis.completedTickets}</div>
          <div className="text-[10px] text-slate-400">Cerrados y verificados</div>
        </div>
      </div>

      {/* SUB-PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2D4A] pb-3">
        <button
          onClick={() => setActiveTab('incidencias')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'incidencias'
              ? 'bg-[#E5C378]/20 text-[#E5C378] border border-[#E5C378]/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#141E33]'
          }`}
        >
          <Wrench className="h-4 w-4" />
          <span>Solicitudes & Incidencias ({tickets.length})</span>
          {kpis.urgentTickets > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
              {kpis.urgentTickets}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('instalaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'instalaciones'
              ? 'bg-[#E5C378]/20 text-[#E5C378] border border-[#E5C378]/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#141E33]'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Áreas e Instalaciones ({facilities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('preventivo')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'preventivo'
              ? 'bg-[#E5C378]/20 text-[#E5C378] border border-[#E5C378]/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#141E33]'
          }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>Mantenimiento Preventivo ({preventiveTasks.length})</span>
          {kpis.overdueTasks > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-600 text-black">
              {kpis.overdueTasks}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preparaciones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'preparaciones'
              ? 'bg-[#E5C378]/20 text-[#E5C378] border border-[#E5C378]/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-[#141E33]'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Preparación de Cultos ({preparations.length})</span>
        </button>
      </div>

      {/* =========================================================================
          PESTAÑA 1: SOLICITUDES & INCIDENCIAS
          ========================================================================= */}
      {activeTab === 'incidencias' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl border border-[#1E2D4A] bg-[#0E1526] p-3.5 shadow-sm">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar ticket, área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            {/* Filtro Área */}
            <select
              value={filterFacility}
              onChange={(e) => setFilterFacility(e.target.value)}
              className="rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-1.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="todos">Todas las áreas</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>

            {/* Filtro Prioridad */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-1.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="todos">Todas las prioridades</option>
              <option value="urgente">Urgente / Crítica</option>
              <option value="alta">Alta</option>
              <option value="normal">Normal</option>
              <option value="baja">Baja</option>
            </select>

            {/* Filtro Estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-1.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="reportado">Reportado</option>
              <option value="asignado">Asignado</option>
              <option value="en_proceso">En Proceso</option>
              <option value="en_revision">En Revisión / Pendiente Verificación</option>
              <option value="completado">Completado & Verificado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            {/* Filtro Categoría */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-1.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="todos">Todas las categorías</option>
              {MAINTENANCE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* TABLA DE INCIDENCIAS */}
          <div className="overflow-hidden rounded-xl border border-[#1E2D4A] bg-[#0E1526] shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#1E2D4A] bg-[#141E33]/90 text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Área / Instalación</th>
                    <th className="px-4 py-3">Prioridad</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2D4A]/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin text-[#D4AF37]" />
                        Cargando incidencias y reportes...
                      </td>
                    </tr>
                  ) : filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No se encontraron incidencias con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredTickets.map((ticket) => {
                      const statusCfg = TICKET_STATUS_CONFIG[ticket.status] || TICKET_STATUS_CONFIG.reportado;
                      const priorityCfg =
                        MAINTENANCE_PRIORITIES.find((p) => p.id === ticket.priority) || MAINTENANCE_PRIORITIES[1];

                      return (
                        <tr
                          key={ticket.id}
                          className={`hover:bg-[#141E33]/50 transition-colors ${
                            ticket.priority === 'urgente' && ticket.status !== 'completado'
                              ? 'bg-rose-950/20'
                              : ''
                          }`}
                        >
                          {/* Ticket Number & Date */}
                          <td className="px-4 py-3 font-mono font-bold text-[#E5C378]">
                            <div>{ticket.ticketNumber}</div>
                            <div className="text-[10px] font-sans font-normal text-slate-400">
                              {new Date(ticket.reportedAt).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Facility */}
                          <td className="px-4 py-3">
                            <div className="font-bold text-white">{ticket.facilityName}</div>
                            <div className="text-[10px] text-slate-400">{ticket.category}</div>
                          </td>

                          {/* Priority */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityCfg.color}`}
                            >
                              {ticket.isEmergencyRisk && <AlertTriangle className="h-3 w-3" />}
                              {priorityCfg.label}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="px-4 py-3 max-w-xs">
                            <p className="line-clamp-2 text-slate-200">{ticket.description}</p>
                            {ticket.emergencyInstructions && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-300 font-semibold">
                                <ShieldAlert className="h-3 w-3 shrink-0" />
                                <span>Protocolo de seguridad activo</span>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                            >
                              {statusCfg.label}
                            </span>
                            {ticket.verifiedByName && (
                              <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Verif: {ticket.verifiedByName}</span>
                              </div>
                            )}
                          </td>

                          {/* Assigned Tech */}
                          <td className="px-4 py-3 text-slate-300">
                            {ticket.assignedToName ? (
                              <span className="font-medium text-white">{ticket.assignedToName}</span>
                            ) : (
                              <span className="text-slate-500 italic">Sin asignar</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Ver Detalle */}
                              <button
                                onClick={() => setSelectedTicket(ticket)}
                                className="rounded-lg p-1.5 text-slate-300 hover:bg-[#1E2D4A] hover:text-white transition-colors"
                                title="Ver detalles y bitácora"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {canManage && (
                                <>
                                  {/* Asignar técnico */}
                                  <button
                                    onClick={() => setAssignModalTicket(ticket)}
                                    className="rounded-lg p-1.5 text-sky-400 hover:bg-sky-950/50 hover:text-sky-300 transition-colors"
                                    title="Asignar responsable técnico"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </button>

                                  {/* Poner en proceso */}
                                  {ticket.status === 'asignado' && (
                                    <button
                                      onClick={() => handleStartWork(ticket)}
                                      className="rounded-lg px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 font-bold text-[10px] transition-colors"
                                    >
                                      Iniciar
                                    </button>
                                  )}

                                  {/* Completar trabajo */}
                                  {ticket.status === 'en_proceso' && (
                                    <button
                                      onClick={() => setCompleteWorkTicket(ticket)}
                                      className="rounded-lg px-2 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 font-bold text-[10px] transition-colors"
                                    >
                                      Finalizar
                                    </button>
                                  )}

                                  {/* Verificación de seguridad obligatoria */}
                                  {ticket.status === 'en_revision' && (
                                    <button
                                      onClick={() => setVerifyModalTicket(ticket)}
                                      className="rounded-lg px-2.5 py-1 bg-emerald-500 text-black font-black text-[10px] hover:bg-emerald-400 shadow-md transition-colors"
                                      title="Certificar físicamente la reparación como segura"
                                    >
                                      Verificar Cierre
                                    </button>
                                  )}
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

      {/* =========================================================================
          PESTAÑA 2: ÁREAS E INSTALACIONES
          ========================================================================= */}
      {activeTab === 'instalaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Directorio oficial de instalaciones físicas de RENACER CHURCH. Los estados operativos determinan la
              disponibilidad para cultos y actividades.
            </p>
            {canManage && (
              <button
                onClick={() => setShowNewFacilityModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-all shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Área Física</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map((fac) => {
              const statusCfg = FACILITY_STATUS_CONFIG[fac.operationalStatus] || FACILITY_STATUS_CONFIG.operativo;

              return (
                <div
                  key={fac.id}
                  className="rounded-xl border border-[#1E2D4A] bg-[#0E1526] p-4 shadow-sm hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-[#E5C378]">{fac.code}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1">{fac.name}</h3>
                    <p className="text-xs text-slate-400 mb-2">{fac.location}</p>

                    {fac.description && <p className="text-xs text-slate-300 mb-3">{fac.description}</p>}
                  </div>

                  <div className="pt-3 border-t border-[#1E2D4A] text-[11px] text-slate-400 flex items-center justify-between">
                    <div>
                      <span>Responsable: </span>
                      <strong className="text-slate-200">{fac.managerName || 'Sin asignar'}</strong>
                    </div>
                    {fac.capacity && (
                      <div>
                        <span>Capacidad: </span>
                        <strong className="text-[#E5C378]">{fac.capacity} pers.</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 3: MANTENIMIENTO PREVENTIVO
          ========================================================================= */}
      {activeTab === 'preventivo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Inspecciones periódicas programadas: baños, climatización, rutas de evacuación, iluminación y mobiliario.
            </p>
            {canManage && (
              <button
                onClick={() => setShowNewPreventiveModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-all shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Programar Preventivo</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preventiveTasks.map((task) => {
              const isOverdue = isPreventiveTaskOverdue(task);

              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 shadow-sm transition-all ${
                    isOverdue
                      ? 'border-amber-600/70 bg-[#0E1526]'
                      : task.status === 'completado'
                      ? 'border-emerald-600/40 bg-[#0E1526]'
                      : 'border-[#1E2D4A] bg-[#0E1526]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-[#E5C378]">{task.taskCode}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#141E33] text-slate-300 border border-[#1E2D4A]">
                        {FREQUENCY_LABELS[task.frequency] || task.frequency}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-black animate-pulse">
                          Vencida
                        </span>
                      )}
                      {task.status === 'completado' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                          {task.result === 'aprobado' ? 'Aprobada' : 'Completada'}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1">{task.title}</h3>
                  <p className="text-xs text-slate-400 mb-3">
                    Área: <strong className="text-slate-200">{task.facilityName}</strong> • Fecha prevista:{' '}
                    <strong className={isOverdue ? 'text-amber-400' : 'text-slate-200'}>{task.scheduledDate}</strong>
                  </p>

                  {/* Checklist */}
                  <div className="space-y-1.5 mb-3 bg-[#141E33]/50 p-2.5 rounded-lg border border-[#1E2D4A]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Puntos de Comprobación:
                    </span>
                    {task.checklist.map((chk) => (
                      <label key={chk.id} className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chk.completed}
                          disabled={task.status === 'completado'}
                          onChange={(e) => handleTogglePreventiveChecklist(task.id, chk.id, e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-[#D4AF37] focus:ring-0"
                        />
                        <span className={chk.completed ? 'line-through text-slate-500' : ''}>{chk.text}</span>
                      </label>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-[#1E2D4A] flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      <span>Técnico: </span>
                      <strong className="text-slate-200">{task.assignedToName}</strong>
                    </div>
                    {task.status !== 'completado' && (
                      <button
                        onClick={async () => {
                          const token = user ? await user.getIdToken() : '';
                          await fetch(`/api/facilities/preventive/${task.id}`, {
                            method: 'PATCH',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              action: 'complete_inspection',
                              result: 'aprobado',
                            }),
                          });
                          triggerFeedback(`Inspección "${task.title}" marcada como completada y aprobada.`, 'success');
                          loadData();
                        }}
                        className="px-2.5 py-1 rounded bg-[#D4AF37] text-black font-bold text-[10px] hover:bg-[#F3D079]"
                      >
                        Marcar Inspección Concluida
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          PESTAÑA 4: PREPARACIÓN DE CULTOS Y EVENTOS
          ========================================================================= */}
      {activeTab === 'preparaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Listas de comprobación previas a cultos dominicales, estudios y eventos especiales. Ningún área se marca
              como preparada hasta completar todas las verificaciones.
            </p>
            {canManage && (
              <button
                onClick={() => setShowNewPrepModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-all shadow-md"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nueva Lista de Preparación</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {preparations.map((prep) => {
              const allDone = prep.tasks.every((t) => t.completed);

              return (
                <div
                  key={prep.id}
                  className={`rounded-xl border p-4 shadow-sm transition-all ${
                    prep.status === 'lista'
                      ? 'border-emerald-600/40 bg-[#0E1526]'
                      : 'border-[#1E2D4A] bg-[#0E1526]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-[#E5C378]">{prep.eventTitle}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs text-slate-400">Fecha: {prep.eventDate}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Instalación: {prep.facilityName}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                          prep.status === 'lista'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50'
                            : prep.status === 'en_preparacion'
                            ? 'bg-amber-950/60 text-amber-300 border-amber-600/50'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {prep.status === 'lista'
                          ? '✓ Instalación Lista'
                          : prep.status === 'en_preparacion'
                          ? 'En Preparación'
                          : 'Pendiente de Inicio'}
                      </span>
                      {canManage && allDone && prep.status !== 'lista' && (
                        <button
                          onClick={async () => {
                            const token = user ? await user.getIdToken() : '';
                            await fetch(`/api/facilities/preparations/${prep.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ action: 'verify_preparation' }),
                            });
                            triggerFeedback('Área certificada oficialmente como lista para el culto.', 'success');
                            loadData();
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-500 text-black font-black text-xs hover:bg-emerald-400"
                        >
                          Certificar Lista
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Checklist Tareas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-[#141E33]/40 p-3 rounded-xl border border-[#1E2D4A]">
                    {prep.tasks.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#141E33] transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={task.completed}
                          onChange={(e) => handleTogglePrepTask(prep.id, task.id, e.target.checked)}
                          className="mt-0.5 rounded border-slate-700 bg-slate-900 text-[#D4AF37] focus:ring-0"
                        />
                        <div className="text-xs">
                          <p className={`font-medium ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {task.text}
                          </p>
                          {task.assignedVolunteerName && (
                            <span className="text-[10px] text-[#D4AF37]">
                              Asignado a: {task.assignedVolunteerName}
                            </span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALES INTERACTIVOS
          ========================================================================= */}

      {/* MODAL 1: NUEVA INSTALACIÓN */}
      {showNewFacilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-[#0E1526] p-6 shadow-2xl">
            <button
              onClick={() => setShowNewFacilityModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Registrar Nueva Área o Instalación</h3>
            <p className="text-xs text-slate-400 mb-4">
              Agregue únicamente áreas físicas confirmadas de RENACER CHURCH.
            </p>

            <form onSubmit={handleCreateFacility} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Área *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Auditorio Principal, Salón de Niños A"
                  value={facName}
                  onChange={(e) => setFacName(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Código Único *</label>
                  <input
                    type="text"
                    required
                    placeholder="FAC-AUD-01"
                    value={facCode}
                    onChange={(e) => setFacCode(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white uppercase focus:border-[#D4AF37] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Ubicación Física *</label>
                  <input
                    type="text"
                    required
                    placeholder="Piso 1, Edificio Central"
                    value={facLocation}
                    onChange={(e) => setFacLocation(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estado Operativo</label>
                  <select
                    value={facStatus}
                    onChange={(e) => setFacStatus(e.target.value as FacilityOperationalStatus)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="operativo">Operativo</option>
                    <option value="mantenimiento">En Mantenimiento</option>
                    <option value="restringido">Acceso Restringido</option>
                    <option value="fuera_de_servicio">Fuera de Servicio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Capacidad Estimada</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="ej. 350 personas"
                    value={facCapacity}
                    onChange={(e) => setFacCapacity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Responsable del Área</label>
                <input
                  type="text"
                  placeholder="Nombre del encargado o supervisor"
                  value={facManagerName}
                  onChange={(e) => setFacManagerName(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descripción u Observaciones</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre uso, equipos fijos, llaves..."
                  value={facDesc}
                  onChange={(e) => setFacDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFacilityModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Instalación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REPORTAR INCIDENCIA */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-rose-500/40 bg-[#0E1526] p-6 shadow-2xl">
            <button
              onClick={() => setShowNewTicketModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Reportar Incidencia o Falla Técnica</h3>
            <p className="text-xs text-slate-400 mb-4">
              Indique con precisión el área y la naturaleza del problema para el equipo de mantenimiento.
            </p>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Área Afectada *</label>
                <select
                  required
                  value={ticketFacId}
                  onChange={(e) => setTicketFacId(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                >
                  <option value="">Seleccione el área física...</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code}) — {f.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Categoría del Problema *</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as MaintenanceCategory)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    {MAINTENANCE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nivel de Prioridad *</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as MaintenancePriority)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente / Crítica</option>
                  </select>
                </div>
              </div>

              {/* Peligro Inmediato Checkbox */}
              <div className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-3">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ticketEmergencyRisk}
                    onChange={(e) => {
                      setTicketEmergencyRisk(e.target.checked);
                      if (e.target.checked) setTicketPriority('urgente');
                    }}
                    className="rounded border-rose-500 bg-rose-950 text-rose-500 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-300">
                      ¿Existe peligro inmediato? (Eléctrico, gas, inundación, estructural)
                    </span>
                    <p className="text-[10px] text-rose-200/80">
                      Activará protocolos de seguridad, alertas a supervisores y advertencias de evacuación.
                    </p>
                  </div>
                </label>

                {ticketEmergencyRisk && (
                  <div className="mt-2 pt-2 border-t border-rose-800/40">
                    <label className="block text-[11px] font-bold text-rose-300 mb-1">Tipo de Riesgo:</label>
                    <select
                      value={ticketEmergencyType}
                      onChange={(e) => setTicketEmergencyType(e.target.value as any)}
                      className="w-full rounded border border-rose-600/60 bg-rose-950/80 px-2 py-1 text-xs text-rose-100"
                    >
                      <option value="electrico">Peligro Eléctrico (cables, tomas, chispas)</option>
                      <option value="gas">Olor / Fuga de Gas</option>
                      <option value="inundacion">Inundación / Rotura de tubería mayor</option>
                      <option value="estructural">Riesgo Estructural (techo, tarima, grietas)</option>
                      <option value="otro">Otro Peligro Inmediato</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descripción Detallada *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describa qué sucede, ubicación exacta dentro del salón y si afecta el culto..."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 text-xs font-bold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Registrar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ASIGNAR RESPONSABLE TÉCNICO */}
      {assignModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-sky-500/40 bg-[#0E1526] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Asignar Responsable Técnico</h3>
            <p className="text-xs text-slate-400 mb-4">
              Incidencia: <strong className="text-white">{assignModalTicket.ticketNumber}</strong> ({assignModalTicket.facilityName})
            </p>

            <form onSubmit={handleAssignTechnician} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Técnico o Voluntario *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Carlos Morales (Electricista)"
                  value={assignTechName}
                  onChange={(e) => setAssignTechName(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalTicket(null)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-sky-500 text-xs font-bold text-black hover:bg-sky-400"
                >
                  Asignar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: COMPLETAR TRABAJO */}
      {completeWorkTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-indigo-500/40 bg-[#0E1526] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Reportar Finalización de Trabajo</h3>
            <p className="text-xs text-slate-400 mb-4">
              {completeWorkTicket.ticketNumber} — El ticket pasará a estado de revisión para verificación final de seguridad.
            </p>

            <form onSubmit={handleCompleteWork} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Notas de Resolución Técnica *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describa el trabajo realizado, materiales reemplazados y estado en que quedó..."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {canViewFinancials && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Costo Real de Reparación (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="0.00"
                    value={completeCost}
                    onChange={(e) => setCompleteCost(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Dato confidencial visible solo para administración</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteWorkTicket(null)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-500 text-xs font-bold text-white hover:bg-indigo-400"
                >
                  Reportar Concluido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: VERIFICACIÓN FINAL OBLIGATORIA (CERTIFICACIÓN DE SEGURIDAD) */}
      {verifyModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/50 bg-[#0E1526] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Verificación Final y Certificación de Seguridad</h3>
            <p className="text-xs text-slate-400 mb-4">
              Por normativa de seguridad, una reparación solo se da por segura una vez inspeccionada y certificada
              físicamente por un supervisor autorizado.
            </p>

            <form onSubmit={handleVerifyTicket} className="space-y-3.5">
              <div className="rounded-lg bg-[#141E33] p-3 text-xs border border-[#1E2D4A]">
                <div className="text-slate-400 mb-1">Resolución técnica previa:</div>
                <div className="text-slate-200 font-medium">{verifyModalTicket.resolutionNotes || 'Sin notas.'}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1">
                  Observaciones de Inspección Física y Conformidad de Seguridad *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalle la inspección física realizada: no hay cables expuestos, el suministro funciona correctamente y el área queda segura para la congregación..."
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  className="w-full rounded-lg border border-emerald-500/50 bg-[#141E33] px-3 py-2 text-xs text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalTicket(null)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-xs font-black text-black hover:bg-emerald-400"
                >
                  Certificar y Cerrar Incidencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: PROGRAMAR PREVENTIVO */}
      {showNewPreventiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-[#D4AF37]/40 bg-[#0E1526] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Programar Mantenimiento Preventivo</h3>
            <p className="text-xs text-slate-400 mb-4">
              Establezca revisiones periódicas reales para garantizar la seguridad de las instalaciones.
            </p>

            <form onSubmit={handleCreatePreventive} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Título de la Inspección *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Inspección Semanal de Baños y Grifería"
                  value={prevTitle}
                  onChange={(e) => setPrevTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Área Física *</label>
                  <select
                    required
                    value={prevFacId}
                    onChange={(e) => setPrevFacId(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="">Seleccione área...</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Frecuencia *</label>
                  <select
                    value={prevFrequency}
                    onChange={(e) => setPrevFrequency(e.target.value as any)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="mensual">Mensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Fecha Programada *</label>
                  <input
                    type="date"
                    required
                    value={prevScheduledDate}
                    onChange={(e) => setPrevScheduledDate(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Responsable Técnico *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Juan Pérez"
                    value={prevTechName}
                    onChange={(e) => setPrevTechName(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Lista de Comprobación (un punto por línea)
                </label>
                <textarea
                  rows={3}
                  value={prevChecklistText}
                  onChange={(e) => setPrevChecklistText(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPreventiveModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-xs font-bold text-black hover:bg-[#F3D079]"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: NUEVA PREPARACIÓN DE CULTO O EVENTO */}
      {showNewPrepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#0E1526] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Lista de Preparación para Culto o Evento</h3>
            <p className="text-xs text-slate-400 mb-4">
              Crea una checklist adaptada para verificar limpieza, sillas, recepción, baños y escenario.
            </p>

            <form onSubmit={handleCreatePrep} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Título del Culto o Evento *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Culto Dominical de Celebración"
                  value={prepEventTitle}
                  onChange={(e) => setPrepEventTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Fecha del Evento *</label>
                  <input
                    type="date"
                    required
                    value={prepEventDate}
                    onChange={(e) => setPrepEventDate(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Instalación Principal *</label>
                  <select
                    required
                    value={prepFacId}
                    onChange={(e) => setPrepFacId(e.target.value)}
                    className="w-full rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="">Seleccione área...</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPrepModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#1E2D4A] text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-xs font-bold text-black hover:bg-[#F3D079]"
                >
                  Crear Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: DETALLE DE INCIDENCIA Y BITÁCORA */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl border border-[#D4AF37]/40 bg-[#0E1526] p-6 shadow-2xl">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-[#E5C378]">{selectedTicket.ticketNumber}</span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">{selectedTicket.facilityName}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Detalle de Incidencia</h3>

            {selectedTicket.emergencyInstructions && (
              <div className="mb-4 rounded-xl border border-rose-600/60 bg-rose-950/40 p-3.5 text-xs text-rose-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>Protocolo de Emergencia Activo</span>
                </div>
                <p>{selectedTicket.emergencyInstructions}</p>
              </div>
            )}

            <div className="space-y-3 text-xs mb-4">
              <div>
                <span className="text-slate-400 block mb-0.5">Descripción del problema:</span>
                <p className="text-slate-200 bg-[#141E33] p-2.5 rounded-lg border border-[#1E2D4A]">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.resolutionNotes && (
                <div>
                  <span className="text-slate-400 block mb-0.5">Notas de resolución técnica:</span>
                  <p className="text-slate-200 bg-[#141E33] p-2.5 rounded-lg border border-[#1E2D4A]">
                    {selectedTicket.resolutionNotes}
                  </p>
                </div>
              )}

              {selectedTicket.verificationNotes && (
                <div className="rounded-lg bg-emerald-950/30 p-2.5 border border-emerald-800/40">
                  <span className="text-emerald-400 font-bold block mb-0.5">
                    Certificación de Seguridad Física ({selectedTicket.verifiedByName}):
                  </span>
                  <p className="text-emerald-200">{selectedTicket.verificationNotes}</p>
                </div>
              )}

              {canViewFinancials && (selectedTicket.estimatedCost || selectedTicket.actualCost) && (
                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-lg bg-[#141E33] border border-[#1E2D4A]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Costo Estimado:</span>
                    <strong className="text-white">${selectedTicket.estimatedCost || '0.00'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Costo Real:</span>
                    <strong className="text-emerald-400">${selectedTicket.actualCost || '0.00'}</strong>
                  </div>
                </div>
              )}

              {/* Bitácora de Auditoría */}
              <div>
                <span className="text-slate-400 font-bold block mb-1">Historial de Actuaciones (Auditoría):</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto bg-[#141E33]/70 p-2.5 rounded-lg border border-[#1E2D4A]">
                  {selectedTicket.auditLog && selectedTicket.auditLog.length > 0 ? (
                    selectedTicket.auditLog.map((log, idx) => (
                      <div key={idx} className="text-[11px] border-b border-slate-800 pb-1 last:border-0">
                        <span className="text-slate-400">{new Date(log.timestamp).toLocaleString()}</span> •{' '}
                        <strong className="text-[#E5C378]">{log.userName}</strong>: {log.details}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 italic text-[11px]">Sin registros adicionales de bitácora.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-lg bg-[#141E33] hover:bg-[#1E2D4A] text-xs font-semibold text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
