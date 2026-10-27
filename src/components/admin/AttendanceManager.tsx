'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Calendar,
  Clock,
  MapPin,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Loader2,
  Phone,
  Mail,
  Sparkles,
  Lock,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Check,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  AttendanceSession,
  AttendanceRecord,
  Visitor,
  PastoralFollowUp,
  AttendanceStats,
  AttendanceSessionType,
  UserProfile,
  FollowUpContactType,
  FollowUpResult,
  VisitorPreferredContact,
} from '@/types/models';
import {
  SESSION_TYPES,
  SESSION_STATUS_LABELS,
  VISITOR_STATUS_LABELS,
  CONTACT_METHOD_LABELS,
  FOLLOWUP_CONTACT_TYPES,
  FOLLOWUP_RESULTS,
  FOLLOWUP_STATUS_LABELS,
  HOW_DID_YOU_HEAR_OPTIONS,
  isFollowUpOverdue,
} from '@/lib/attendance/constants';

interface AttendanceManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type TabKey = 'sesiones' | 'visitantes' | 'seguimiento' | 'informes';

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();

  // Tab activo
  const [activeTab, setActiveTab] = useState<TabKey>('sesiones');

  // Estados de datos
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionRecords, setSessionRecords] = useState<AttendanceRecord[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [followUps, setFollowUps] = useState<PastoralFollowUp[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  // Estados de carga
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isNewVisitorModalOpen, setIsNewVisitorModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  // Selecciones para acciones
  const [targetRecordForVoid, setTargetRecordForVoid] = useState<AttendanceRecord | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [targetPersonForFollowUp, setTargetPersonForFollowUp] = useState<{
    id: string;
    name: string;
    type: 'visitor' | 'member';
    email?: string;
    phone?: string;
    consent: boolean;
  } | null>(null);

  // Búsqueda y marcado rápido de miembros
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingMembers, setIsSearchingMembers] = useState(false);

  // Filtros de registros de la sesión seleccionada
  const [recordsFilterType, setRecordsFilterType] = useState<'all' | 'member' | 'visitor'>('all');
  const [recordsSearchQuery, setRecordsSearchQuery] = useState('');

  // Formulario: Nueva Sesión
  const [newSessionForm, setNewSessionForm] = useState<{
    title: string;
    type: AttendanceSessionType;
    date: string;
    time: string;
    location: string;
    notes: string;
  }>({
    title: 'Culto Dominical de Celebración',
    type: 'culto_dominical',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    location: 'Templo Principal',
    notes: '',
  });

  // Formulario: Nuevo Visitante Rápido
  const [newVisitorForm, setNewVisitorForm] = useState<{
    fullName: string;
    email: string;
    phone: string;
    preferredContactMethod: VisitorPreferredContact;
    followUpConsent: boolean;
    howDidYouHear: string;
    prayerRequest: string;
    markAsPresentInCurrentSession: boolean;
  }>({
    fullName: '',
    email: '',
    phone: '',
    preferredContactMethod: 'whatsapp',
    followUpConsent: true,
    howDidYouHear: 'amigo_familiar',
    prayerRequest: '',
    markAsPresentInCurrentSession: true,
  });

  // Formulario: Seguimiento Pastoral
  const [followUpForm, setFollowUpForm] = useState<{
    contactType: FollowUpContactType;
    contactDate: string;
    result: FollowUpResult;
    pastoralNotes: string;
    nextStep: string;
    nextStepDueDate: string;
  }>({
    contactType: 'whatsapp',
    contactDate: new Date().toISOString().split('T')[0],
    result: 'contactado_positivo',
    pastoralNotes: '',
    nextStep: '',
    nextStepDueDate: '',
  });

  // Helper para headers con token
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Usuario no autenticado.');
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [user]);

  // Cargar Sesiones
  const loadSessions = useCallback(async () => {
    if (!user) return;
    setLoadingSessions(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/sessions', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar sesiones.');

      const list: AttendanceSession[] = data.sessions || [];
      setSessions(list);
      // Seleccionar automáticamente la primera activa si no hay seleccionada
      if (!selectedSessionId && list.length > 0) {
        const firstActive = list.find((s) => s.status === 'active') || list[0];
        setSelectedSessionId(firstActive.id);
      }
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al obtener sesiones de asistencia.', 'error');
    } finally {
      setLoadingSessions(false);
    }
  }, [user, getAuthHeaders, selectedSessionId, onNotify]);

  // Cargar Registros de la Sesión Seleccionada
  const loadSessionRecords = useCallback(async (sessionId: string) => {
    if (!user || !sessionId) return;
    setLoadingRecords(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/attendance/sessions/${sessionId}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar detalle de sesión.');

      setSessionRecords(data.records || []);
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al obtener la lista de asistentes de la reunión.', 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  // Cargar Visitantes
  const loadVisitors = useCallback(async () => {
    if (!user) return;
    setLoadingVisitors(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/visitors', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar visitantes.');
      setVisitors(data.visitors || []);
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al cargar directorio de visitantes.', 'error');
    } finally {
      setLoadingVisitors(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  // Cargar Seguimientos Pastorales
  const loadFollowUps = useCallback(async () => {
    if (!user) return;
    setLoadingFollowUps(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/followups', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar seguimientos pastorales.');
      setFollowUps(data.followups || []);
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al cargar seguimientos pastorales.', 'error');
    } finally {
      setLoadingFollowUps(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  // Cargar Métricas y Estadísticas
  const loadStats = useCallback(async () => {
    if (!user) return;
    setLoadingStats(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/stats', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar estadísticas.');
      setStats(data.stats || null);
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al cargar informe estadístico.', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  // Efecto inicial
  useEffect(() => {
    loadSessions();
    loadVisitors();
    loadFollowUps();
    loadStats();
  }, [loadSessions, loadVisitors, loadFollowUps, loadStats]);

  // Efecto al cambiar de sesión seleccionada
  useEffect(() => {
    if (selectedSessionId) {
      loadSessionRecords(selectedSessionId);
    }
  }, [selectedSessionId, loadSessionRecords]);

  // Búsqueda de Miembros (Debounced)
  useEffect(() => {
    if (!memberSearchQuery || memberSearchQuery.trim().length < 2) {
      setMemberSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMembers(true);
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(
          `/api/admin/members?q=${encodeURIComponent(memberSearchQuery.trim())}`,
          { credentials: 'omit', headers }
        );
        const data = await res.json();
        if (res.ok && data.members) {
          setMemberSearchResults(data.members.slice(0, 8));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingMembers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [memberSearchQuery, getAuthHeaders]);

  // Sesión actual seleccionada
  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // 1. REGISTRAR ASISTENCIA DE MIEMBRO
  const handleRegisterMemberAttendance = async (member: UserProfile) => {
    if (!selectedSessionId) {
      onNotify?.('Seleccione una reunión primero.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/records', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: selectedSessionId,
          attendeeType: 'member',
          memberUid: member.uid,
          memberName: member.displayName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Miembro FAMA',
          memberEmail: member.email,
          memberPhone: member.phone,
          memberRole: member.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          onNotify?.(data.error || 'El miembro ya está registrado en esta reunión.', 'error');
        } else {
          throw new Error(data.error || 'Error al registrar asistencia.');
        }
        return;
      }

      onNotify?.(`¡Asistencia marcada para ${member.displayName || 'Miembro'}!`, 'success');
      setMemberSearchQuery('');
      setMemberSearchResults([]);
      await loadSessionRecords(selectedSessionId);
      await loadSessions();
      await loadStats();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al registrar asistencia.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. CREAR NUEVA SESIÓN
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify(newSessionForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la sesión.');

      onNotify?.('Reunión creada exitosamente.', 'success');
      setIsNewSessionModalOpen(false);
      await loadSessions();
      if (data.session?.id) {
        setSelectedSessionId(data.session.id);
      }
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al crear la reunión.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. REGISTRAR NUEVO VISITANTE
  const handleCreateVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitorForm.fullName.trim()) {
      onNotify?.('El nombre del visitante es obligatorio.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();

      // Si se marca en la sesión actual
      if (newVisitorForm.markAsPresentInCurrentSession && selectedSessionId) {
        const res = await fetch('/api/admin/attendance/records', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId: selectedSessionId,
            attendeeType: 'visitor',
            visitorName: newVisitorForm.fullName.trim(),
            visitorEmail: newVisitorForm.email.trim() || undefined,
            visitorPhone: newVisitorForm.phone.trim() || undefined,
            preferredContactMethod: newVisitorForm.preferredContactMethod,
            followUpConsent: newVisitorForm.followUpConsent,
            howDidYouHear: newVisitorForm.howDidYouHear,
            prayerRequest: newVisitorForm.prayerRequest.trim() || undefined,
            firstTime: true,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al registrar visitante y asistencia.');

        onNotify?.(`¡Visitante "${newVisitorForm.fullName}" registrado como presente!`, 'success');
        await loadSessionRecords(selectedSessionId);
      } else {
        // Solo guardar en directorio de visitantes
        const res = await fetch('/api/admin/attendance/visitors', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fullName: newVisitorForm.fullName.trim(),
            email: newVisitorForm.email.trim() || undefined,
            phone: newVisitorForm.phone.trim() || undefined,
            preferredContactMethod: newVisitorForm.preferredContactMethod,
            followUpConsent: newVisitorForm.followUpConsent,
            howDidYouHear: newVisitorForm.howDidYouHear,
            prayerRequest: newVisitorForm.prayerRequest.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar visitante.');

        onNotify?.(`Visitante "${newVisitorForm.fullName}" guardado en el directorio.`, 'success');
      }

      setIsNewVisitorModalOpen(false);
      setNewVisitorForm({
        fullName: '',
        email: '',
        phone: '',
        preferredContactMethod: 'whatsapp',
        followUpConsent: true,
        howDidYouHear: 'amigo_familiar',
        prayerRequest: '',
        markAsPresentInCurrentSession: true,
      });

      await loadVisitors();
      await loadSessions();
      await loadStats();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al procesar el visitante.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. ANULAR / CORREGIR ASISTENCIA (Auditado)
  const handleConfirmVoid = async () => {
    if (!targetRecordForVoid) return;
    if (!voidReason.trim() || voidReason.trim().length < 5) {
      onNotify?.('El motivo de anulación es obligatorio (mínimo 5 caracteres).', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/attendance/records/${targetRecordForVoid.id}/void`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reason: voidReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al corregir asistencia.');

      onNotify?.('Registro de asistencia anulado y corregido con auditoría.', 'success');
      setIsVoidModalOpen(false);
      setTargetRecordForVoid(null);
      setVoidReason('');

      if (selectedSessionId) {
        await loadSessionRecords(selectedSessionId);
      }
      await loadSessions();
      await loadStats();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al anular asistencia.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. REGISTRAR SEGUIMIENTO PASTORAL
  const handleCreateFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPersonForFollowUp) return;
    if (!followUpForm.pastoralNotes.trim()) {
      onNotify?.('La nota pastoral confidencial es obligatoria.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/attendance/followups', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          personType: targetPersonForFollowUp.type,
          personId: targetPersonForFollowUp.id,
          personName: targetPersonForFollowUp.name,
          personEmail: targetPersonForFollowUp.email,
          personPhone: targetPersonForFollowUp.phone,
          followUpConsent: targetPersonForFollowUp.consent,
          contactType: followUpForm.contactType,
          contactDate: followUpForm.contactDate,
          result: followUpForm.result,
          pastoralNotes: followUpForm.pastoralNotes.trim(),
          nextStep: followUpForm.nextStep.trim() || undefined,
          nextStepDueDate: followUpForm.nextStepDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar seguimiento pastoral.');

      onNotify?.('Contacto pastoral registrado correctamente.', 'success');
      setIsFollowUpModalOpen(false);
      setTargetPersonForFollowUp(null);
      setFollowUpForm({
        contactType: 'whatsapp',
        contactDate: new Date().toISOString().split('T')[0],
        result: 'contactado_positivo',
        pastoralNotes: '',
        nextStep: '',
        nextStepDueDate: '',
      });

      await loadFollowUps();
      await loadVisitors();
      await loadStats();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al guardar seguimiento.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. MARCAR SEGUIMIENTO COMO COMPLETADO
  const handleCompleteFollowUp = async (followUpId: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/attendance/followups/${followUpId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'completed' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al completar el seguimiento.');

      onNotify?.('Seguimiento marcado como completado.', 'success');
      await loadFollowUps();
      await loadStats();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al actualizar seguimiento.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 7. CERRAR O CAMBIAR ESTADO DE REUNIÓN
  const handleToggleSessionStatus = async (sessionId: string, newStatus: 'active' | 'closed') => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/attendance/sessions/${sessionId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar estado de la reunión.');

      onNotify?.(
        newStatus === 'closed'
          ? 'Reunión cerrada exitosamente.'
          : 'Reunión reabierta para registrar asistencia.',
        'success'
      );
      await loadSessions();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.('Error al cambiar el estado de la reunión.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Registros de sesión filtrados
  const filteredSessionRecords = useMemo(() => {
    return sessionRecords.filter((r) => {
      if (recordsFilterType !== 'all' && r.attendeeType !== recordsFilterType) {
        return false;
      }
      if (recordsSearchQuery.trim()) {
        const q = recordsSearchQuery.toLowerCase();
        const name = (r.attendeeType === 'member' ? (r.memberName || '') : (r.visitorName || '')).toLowerCase();
        const email = (r.memberEmail || r.visitorEmail || '').toLowerCase();
        const phone = (r.memberPhone || r.visitorPhone || '').toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [sessionRecords, recordsFilterType, recordsSearchQuery]);

  return (
    <div className="space-y-6">
      {/* TARJETAS KPI DE RESUMEN SUPERIOR */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Presentes</span>
            <div className="rounded-lg bg-[#E5C378]/10 p-2 text-[#E5C378]">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {stats?.totalAttendance ?? '—'}
            </span>
            <span className="text-[11px] text-slate-400">registros</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats?.membersAttendance ?? 0} miembros · {stats?.visitorsAttendance ?? 0} visitantes
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Promedio / Culto</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {stats?.averagePerSession ?? '—'}
            </span>
            <span className="text-[11px] text-slate-400">asistentes</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {stats?.totalSessions ?? 0} reuniones celebradas
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Nuevos Visitantes</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {stats?.totalVisitors ?? '—'}
            </span>
            <span className="text-[11px] text-slate-400">registrados</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-400">
            {stats?.visitorsWithConsentCount ?? 0} autorizaron contacto
          </p>
        </div>

        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Seguimiento Pastoral</span>
            <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {stats?.pendingFollowUpsCount ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">pendientes</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-400 font-medium">
            {stats?.overdueFollowUpsCount ?? 0} vencidos
          </p>
        </div>
      </div>

      {/* CONMUTADOR DE PESTAÑAS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2D4A] pb-3">
        <button
          onClick={() => setActiveTab('sesiones')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'sesiones'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Cultos & Marcar Asistencia</span>
        </button>

        <button
          onClick={() => setActiveTab('visitantes')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'visitantes'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Directorio de Visitantes</span>
          {visitors.length > 0 && (
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
              {visitors.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('seguimiento')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'seguimiento'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <Heart className="h-4 w-4" />
          <span>Seguimiento Pastoral</span>
          {(stats?.pendingFollowUpsCount ?? 0) > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">
              {stats?.pendingFollowUpsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('informes')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'informes'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Informes & Métricas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: CULTOS Y MARCADO RÁPIDO DE ASISTENCIA (MOBILE-FIRST) */}
      {/* ============================================================== */}
      {activeTab === 'sesiones' && (
        <div className="space-y-6">
          {/* Barra de control superior */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <label htmlFor="sessionSelect" className="text-xs font-bold text-slate-300 shrink-0">
                Reunión activa:
              </label>
              <select
                id="sessionSelect"
                value={selectedSessionId || ''}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full sm:w-auto min-w-[260px] rounded-xl border border-[#1E2D4A] bg-[#0E1626] px-3 py-2 text-xs font-semibold text-white focus:border-[#E5C378] focus:outline-none"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.date} — {s.title} ({s.attendeesCount} presentes) [
                    {s.status === 'active' ? 'Abierta' : 'Cerrada'}]
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewSessionModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva Reunión</span>
              </button>

              <button
                onClick={() => setIsNewVisitorModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Visitante</span>
              </button>
            </div>
          </div>

          {/* Ficha de la Sesión Activa */}
          {currentSession ? (
            <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 sm:p-5 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        SESSION_TYPES[currentSession.type]?.badgeColor ||
                        'border-slate-500 text-slate-300'
                      }`}
                    >
                      {SESSION_TYPES[currentSession.type]?.label || currentSession.type}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        SESSION_STATUS_LABELS[currentSession.status]?.badgeColor ||
                        'border-slate-500 text-slate-300'
                      }`}
                    >
                      {SESSION_STATUS_LABELS[currentSession.status]?.label || currentSession.status}
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
                    {currentSession.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#E5C378]" />
                      {currentSession.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#E5C378]" />
                      {currentSession.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-[#E5C378]" />
                      {currentSession.location}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-[#1E2D4A] bg-[#141E33] px-4 py-2">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Presentes</p>
                      <p className="text-xl font-black text-[#E5C378]">
                        {currentSession.attendeesCount}
                      </p>
                    </div>
                    <div className="h-8 w-[1px] bg-[#1E2D4A]" />
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Miembros</p>
                      <p className="text-sm font-bold text-white">{currentSession.membersCount}</p>
                    </div>
                    <div className="h-8 w-[1px] bg-[#1E2D4A]" />
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-medium">Visitantes</p>
                      <p className="text-sm font-bold text-emerald-400">
                        {currentSession.visitorsCount}
                      </p>
                    </div>
                  </div>

                  {currentSession.status === 'active' ? (
                    <button
                      onClick={() => handleToggleSessionStatus(currentSession.id, 'closed')}
                      disabled={actionLoading}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      Cerrar Reunión
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleSessionStatus(currentSession.id, 'active')}
                      disabled={actionLoading}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-900 transition-colors"
                    >
                      Reabrir Reunión
                    </button>
                  )}
                </div>
              </div>

              {/* PANEL DE MARCADO RÁPIDO DE ASISTENCIA (MOBILE-FIRST) */}
              <div className="mt-5 rounded-2xl border border-[#E5C378]/30 bg-gradient-to-r from-[#0E1626] to-[#141E33] p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-[#E5C378]" />
                      <span>Marcado Rápido de Miembro</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Escribe el nombre o correo del hermano y tócalo para marcarlo presente al instante.
                    </p>
                  </div>
                  <span className="text-[11px] text-[#E5C378] font-semibold">
                    1 toque = Registro inmediato
                  </span>
                </div>

                <div className="relative">
                  <div className="relative flex items-center">
                    <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, apellido o email (ej. Carlos, Maria)..."
                      className="w-full rounded-xl border border-[#1E2D4A] bg-[#0E1626] py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-[#E5C378] focus:outline-none"
                    />
                    {isSearchingMembers && (
                      <Loader2 className="absolute right-3.5 h-4 w-4 animate-spin text-[#E5C378]" />
                    )}
                  </div>

                  {/* Resultados flotantes / chips */}
                  {memberSearchResults.length > 0 && (
                    <div className="mt-2 space-y-1.5 rounded-xl border border-[#1E2D4A] bg-[#0A101D] p-2 shadow-2xl">
                      <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Resultados encontrados ({memberSearchResults.length}):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {memberSearchResults.map((m) => (
                          <button
                            key={m.uid}
                            onClick={() => handleRegisterMemberAttendance(m)}
                            disabled={actionLoading}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#1E2D4A] bg-[#0E1626] p-2.5 text-left hover:border-[#E5C378] hover:bg-[#141E33] transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5C378]/20 text-[#E5C378] font-bold text-xs">
                                {(m.displayName || m.email || 'M')[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-white group-hover:text-[#E5C378]">
                                  {m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Miembro'}
                                </p>
                                <p className="truncate text-[10px] text-slate-400">{m.email}</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-lg bg-[#E5C378]/15 px-2 py-1 text-[10px] font-bold text-[#E5C378] group-hover:bg-[#E5C378] group-hover:text-black transition-colors">
                              Marcar
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {memberSearchQuery.trim().length >= 2 &&
                    !isSearchingMembers &&
                    memberSearchResults.length === 0 && (
                      <div className="mt-2 rounded-xl border border-[#1E2D4A] bg-[#0A101D] p-3 text-xs text-slate-400 text-center">
                        No se encontraron miembros con &quot;{memberSearchQuery}&quot;. Si es un nuevo visitante,{' '}
                        <button
                          onClick={() => {
                            setNewVisitorForm((prev) => ({
                              ...prev,
                              fullName: memberSearchQuery.trim(),
                            }));
                            setIsNewVisitorModalOpen(true);
                          }}
                          className="font-bold text-[#E5C378] underline hover:text-[#F3D079]"
                        >
                          regístralo como visitante aquí
                        </button>
                        .
                      </div>
                    )}
                </div>
              </div>

              {/* LISTA EN VIVO DE ASISTENTES DE LA REUNIÓN */}
              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">
                      Lista de Presentes ({filteredSessionRecords.length})
                    </h4>
                    {loadingRecords && (
                      <Loader2 className="h-4 w-4 animate-spin text-[#E5C378]" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Filtro tipo */}
                    <div className="flex rounded-xl border border-[#1E2D4A] bg-[#141E33] p-1 text-xs">
                      <button
                        onClick={() => setRecordsFilterType('all')}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                          recordsFilterType === 'all'
                            ? 'bg-[#E5C378] text-black font-bold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setRecordsFilterType('member')}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                          recordsFilterType === 'member'
                            ? 'bg-[#E5C378] text-black font-bold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Miembros
                      </button>
                      <button
                        onClick={() => setRecordsFilterType('visitor')}
                        className={`rounded-lg px-2.5 py-1 font-semibold transition-colors ${
                          recordsFilterType === 'visitor'
                            ? 'bg-[#E5C378] text-black font-bold'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Visitantes
                      </button>
                    </div>

                    {/* Búsqueda dentro de la lista */}
                    <input
                      type="text"
                      value={recordsSearchQuery}
                      onChange={(e) => setRecordsSearchQuery(e.target.value)}
                      placeholder="Filtrar presentes..."
                      className="rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:border-[#E5C378] focus:outline-none"
                    />
                  </div>
                </div>

                {filteredSessionRecords.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-8 text-center text-xs text-slate-400">
                    <UserCheck className="mx-auto h-8 w-8 text-slate-500 mb-2 opacity-60" />
                    <p className="font-semibold text-white">No hay asistentes registrados aún</p>
                    <p className="mt-1">
                      Usa el buscador rápido de arriba o el botón &quot;+ Visitante&quot; para registrar la presencia.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-[#1E2D4A] bg-[#0A101D]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#1E2D4A] bg-[#0E1626] font-semibold text-slate-400">
                        <tr>
                          <th className="py-3 pl-4 pr-3">Asistente</th>
                          <th className="px-3 py-3">Tipo</th>
                          <th className="px-3 py-3">Contacto</th>
                          <th className="px-3 py-3">Hora Registro</th>
                          <th className="px-3 py-3">Estado</th>
                          <th className="py-3 pl-3 pr-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1E2D4A]/60">
                        {filteredSessionRecords.map((r) => {
                          const isMember = r.attendeeType === 'member';
                          const name = (isMember ? r.memberName : r.visitorName) || 'Asistente';
                          const email = isMember ? r.memberEmail : r.visitorEmail;
                          const phone = isMember ? r.memberPhone : r.visitorPhone;
                          const isCancelled = r.status === 'cancelled';

                          return (
                            <tr
                              key={r.id}
                              className={`hover:bg-[#141E33]/40 transition-colors ${
                                isCancelled ? 'opacity-50 bg-rose-950/10' : ''
                              }`}
                            >
                              <td className="py-3 pl-4 pr-3 font-semibold text-white">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                                      isMember
                                        ? 'bg-[#E5C378]/20 text-[#E5C378]'
                                        : 'bg-emerald-500/20 text-emerald-400'
                                    }`}
                                  >
                                    {name[0]?.toUpperCase() || 'A'}
                                  </div>
                                  <span className={isCancelled ? 'line-through text-slate-400' : ''}>
                                    {name}
                                  </span>
                                </div>
                              </td>

                              <td className="px-3 py-3">
                                {isMember ? (
                                  <span className="inline-flex items-center rounded-md border border-[#E5C378]/30 bg-[#E5C378]/10 px-2 py-0.5 text-[10px] font-bold text-[#E5C378]">
                                    Miembro
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                    Visitante
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-slate-300">
                                {phone && <span className="block text-[11px]">{phone}</span>}
                                {email && <span className="text-[10px] text-slate-400">{email}</span>}
                                {!phone && !email && <span className="text-slate-500">—</span>}
                              </td>

                              <td className="px-3 py-3 text-slate-400">
                                {new Date(r.registeredAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>

                              <td className="px-3 py-3">
                                {isCancelled ? (
                                  <div>
                                    <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                                      <XCircle className="h-3 w-3" />
                                      Anulado
                                    </span>
                                    {r.correctionReason && (
                                      <p className="mt-0.5 text-[10px] text-rose-400 truncate max-w-[150px]">
                                        {r.correctionReason}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                                    <Check className="h-3 w-3" />
                                    Presente
                                  </span>
                                )}
                              </td>

                              <td className="py-3 pl-3 pr-4 text-right">
                                {!isCancelled && (
                                  <button
                                    onClick={() => {
                                      setTargetRecordForVoid(r);
                                      setVoidReason('');
                                      setIsVoidModalOpen(true);
                                    }}
                                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-rose-500 hover:bg-rose-950/40 hover:text-rose-200 transition-colors"
                                  >
                                    Corregir
                                  </button>
                                )}
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
          ) : (
            <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-500 mb-3 opacity-50" />
              <h3 className="text-base font-bold text-white">No hay ninguna reunión seleccionada</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                Crea una nueva reunión o culto dominical para empezar a registrar asistencia de miembros y visitantes.
              </p>
              <button
                onClick={() => setIsNewSessionModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-4 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Crear Primera Reunión</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: DIRECTORIO DE VISITANTES Y CONSENTIMIENTO           */}
      {/* ============================================================== */}
      {activeTab === 'visitantes' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Directorio Pastoral de Visitantes</h3>
              <p className="text-xs text-slate-400">
                Personas que han visitado la iglesia. Incluye consentimiento explícito para seguimiento pastoral.
              </p>
            </div>
            <button
              onClick={() => setIsNewVisitorModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-4 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-colors self-start sm:self-auto"
            >
              <UserPlus className="h-4 w-4" />
              <span>Registrar Visitante</span>
            </button>
          </div>

          {loadingVisitors ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#E5C378]" />
              <p className="mt-2 text-xs text-slate-400">Cargando directorio de visitantes...</p>
            </div>
          ) : visitors.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-12 text-center text-xs text-slate-400">
              <Sparkles className="mx-auto h-10 w-10 text-slate-500 mb-2 opacity-50" />
              <p className="font-semibold text-white">No hay visitantes registrados en la base de datos</p>
              <p className="mt-1">
                Puedes registrar visitantes manualmente o al marcar su asistencia en un culto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visitors.map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between hover:border-[#E5C378]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-sm">
                          {v.fullName[0]?.toUpperCase() || 'V'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{v.fullName}</h4>
                          <span
                            className={`inline-block mt-0.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                              VISITOR_STATUS_LABELS[v.status]?.badgeColor ||
                              'border-slate-500 text-slate-300'
                            }`}
                          >
                            {VISITOR_STATUS_LABELS[v.status]?.label || v.status}
                          </span>
                        </div>
                      </div>

                      {v.followUpConsent ? (
                        <span
                          title="Autorizó expresamente contacto pastoral"
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold text-emerald-300 shrink-0"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Autorizó contacto
                        </span>
                      ) : (
                        <span
                          title="No autorizó contacto"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-400 shrink-0"
                        >
                          <XCircle className="h-3 w-3" />
                          Sin autorización
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                      {v.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-[#E5C378]" />
                          <span>{v.phone}</span>
                        </div>
                      )}
                      {v.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-[#E5C378]" />
                          <span className="truncate">{v.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>1ra visita: {v.firstVisitDate}</span>
                      </div>
                      {v.howDidYouHear && (
                        <div className="text-[11px] text-slate-400">
                          Medio:{' '}
                          <span className="text-slate-300 font-medium">
                            {HOW_DID_YOU_HEAR_OPTIONS[v.howDidYouHear] || v.howDidYouHear}
                          </span>
                        </div>
                      )}
                      {v.prayerRequest && (
                        <div className="mt-2 rounded-xl border border-purple-500/30 bg-purple-950/20 p-2.5 text-[11px] text-purple-200">
                          <strong className="block text-[10px] text-purple-300 uppercase">
                            Petición de Oración:
                          </strong>
                          {v.prayerRequest}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1E2D4A] flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {v.followUpsCount} contactos pastorales
                    </span>

                    {v.followUpConsent ? (
                      <button
                        onClick={() => {
                          setTargetPersonForFollowUp({
                            id: v.id,
                            name: v.fullName,
                            type: 'visitor',
                            email: v.email,
                            phone: v.phone,
                            consent: true,
                          });
                          setIsFollowUpModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#E5C378]/15 px-2.5 py-1 text-xs font-bold text-[#E5C378] hover:bg-[#E5C378] hover:text-black transition-colors"
                      >
                        <Heart className="h-3.5 w-3.5" />
                        <span>Contactar</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic">No contactar</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 3: SEGUIMIENTO PASTORAL Y TAREAS VENCIDAS              */}
      {/* ============================================================== */}
      {activeTab === 'seguimiento' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#E5C378]" />
                <span>Gestión de Seguimiento Pastoral</span>
              </h3>
              <p className="text-xs text-slate-400">
                Atención pastoral confidencial para visitantes y miembros con tareas programadas.
              </p>
            </div>
            <button
              onClick={() => {
                if (visitors.length > 0) {
                  const firstEligible = visitors.find((v) => v.followUpConsent) || visitors[0];
                  setTargetPersonForFollowUp({
                    id: firstEligible.id,
                    name: firstEligible.fullName,
                    type: 'visitor',
                    email: firstEligible.email,
                    phone: firstEligible.phone,
                    consent: firstEligible.followUpConsent,
                  });
                  setIsFollowUpModalOpen(true);
                } else {
                  onNotify?.('Primero registra un visitante en el directorio.', 'info');
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-4 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-colors self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Contacto Pastoral</span>
            </button>
          </div>

          {loadingFollowUps ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#E5C378]" />
              <p className="mt-2 text-xs text-slate-400">Cargando seguimientos pastorales...</p>
            </div>
          ) : followUps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-12 text-center text-xs text-slate-400">
              <Heart className="mx-auto h-10 w-10 text-slate-500 mb-2 opacity-50" />
              <p className="font-semibold text-white">No hay seguimientos pastorales registrados</p>
              <p className="mt-1">
                Comienza registrando contactos telefónicos, mensajes o visitas pastorales.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {followUps.map((f) => {
                const isOverdue = isFollowUpOverdue(f.nextStepDueDate, f.status);
                const isCompleted = f.status === 'completed';

                return (
                  <div
                    key={f.id}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                      isOverdue
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : isCompleted
                        ? 'border-[#1E2D4A] bg-[#0E1626]/60 opacity-80'
                        : 'border-[#1E2D4A] bg-[#0E1626]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                              FOLLOWUP_STATUS_LABELS[f.status]?.badgeColor ||
                              'border-slate-500 text-slate-300'
                            }`}
                          >
                            {FOLLOWUP_STATUS_LABELS[f.status]?.label || f.status}
                          </span>

                          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-300">
                            {FOLLOWUP_CONTACT_TYPES[f.contactType]?.label || f.contactType}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                              FOLLOWUP_RESULTS[f.result]?.badgeColor ||
                              'border-slate-500 text-slate-300'
                            }`}
                          >
                            {FOLLOWUP_RESULTS[f.result]?.label || f.result}
                          </span>

                          {isOverdue && (
                            <span className="flex items-center gap-1 rounded-full border border-rose-500 bg-rose-500/20 px-2.5 py-0.5 text-[10px] font-bold text-rose-200 animate-pulse">
                              <AlertTriangle className="h-3 w-3" />
                              Vencido
                            </span>
                          )}
                        </div>

                        <h4 className="mt-2 text-base font-bold text-white flex items-center gap-2">
                          <span>{f.personName}</span>
                          <span className="text-xs font-normal text-slate-400">
                            ({f.personType === 'visitor' ? 'Visitante' : 'Miembro'})
                          </span>
                        </h4>

                        <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          <span>Fecha contacto: {f.contactDate}</span>
                          {f.personPhone && <span>Tel: {f.personPhone}</span>}
                          {f.personEmail && <span>Email: {f.personEmail}</span>}
                        </div>
                      </div>

                      {!isCompleted && (
                        <button
                          onClick={() => handleCompleteFollowUp(f.id)}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500 hover:text-black transition-colors shrink-0"
                        >
                          <Check className="h-4 w-4" />
                          <span>Marcar Completado</span>
                        </button>
                      )}
                    </div>

                    {/* Nota Pastoral Confidencial */}
                    <div className="mt-3.5 rounded-xl border border-[#1E2D4A] bg-[#141E33]/70 p-3 text-xs leading-relaxed text-slate-200">
                      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#E5C378] mb-1">
                        <Lock className="h-3 w-3" />
                        <span>Nota Pastoral Privada:</span>
                      </div>
                      <p>{f.pastoralNotes}</p>
                    </div>

                    {/* Próximo Paso */}
                    {f.nextStep && (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-300">
                          <strong className="text-slate-400">Próximo paso:</strong>
                          <span>{f.nextStep}</span>
                        </div>
                        {f.nextStepDueDate && (
                          <div
                            className={`text-xs font-semibold ${
                              isOverdue ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            Fecha límite: {f.nextStepDueDate}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 4: INFORMES Y MÉTRICAS DE ASISTENCIA                   */}
      {/* ============================================================== */}
      {activeTab === 'informes' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Informe Pastoral de Asistencia</h3>
            <p className="text-xs text-slate-400">
              Tendencias mensuales reales, distribución por tipo de culto y retención de visitantes.
            </p>
          </div>

          {/* Gráfico de Evolución Mensual */}
          <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-5 shadow-xl">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-[#E5C378]" />
              <span>Evolución de Asistencia Mensual (Últimos 12 Meses)</span>
            </h4>

            {stats?.monthlyTrends && stats.monthlyTrends.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-44 items-end pt-6 border-b border-[#1E2D4A] pb-2">
                  {(() => {
                    const maxVal = Math.max(
                      ...stats.monthlyTrends.map((m) => m.total),
                      1
                    );
                    return stats.monthlyTrends.map((m) => {
                      const heightPercent = Math.max(
                        Math.round((m.total / maxVal) * 100),
                        m.total > 0 ? 8 : 2
                      );
                      return (
                        <div key={m.month} className="flex flex-col items-center h-full justify-end group">
                          <span className="text-[10px] font-bold text-[#E5C378] opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                            {m.total}
                          </span>
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-[#B89645] to-[#E5C378] group-hover:brightness-125 transition-all"
                            title={`${m.monthName}: ${m.total} presentes (${m.members} miembros, ${m.visitors} visitantes)`}
                          />
                          <span className="mt-1 text-[9px] text-slate-400 truncate w-full text-center">
                            {m.monthName.split(' ')[0]}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-[#E5C378]" />
                    <span>Asistencia Total</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-6">Sin registros suficientes para graficar.</p>
            )}
          </div>

          {/* Desglose por Tipo de Culto */}
          <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-5 shadow-xl">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-[#E5C378]" />
              <span>Distribución por Tipo de Reunión</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats?.attendanceBySessionType &&
                Object.entries(stats.attendanceBySessionType).map(([key, item]) => (
                  <div
                    key={key}
                    className="rounded-xl border border-[#1E2D4A] bg-[#141E33]/60 p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.sessionsCount} reuniones celebradas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[#E5C378]">{item.count}</p>
                      <p className="text-[10px] text-slate-400">asistentes</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: CREAR NUEVA REUNIÓN / CULTO                          */}
      {/* ============================================================== */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[#E5C378]" />
                <span>Crear Nueva Reunión / Culto</span>
              </h3>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Título de la Reunión
                </label>
                <input
                  type="text"
                  required
                  value={newSessionForm.title}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3.5 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  placeholder="ej. Culto Dominical de Celebración"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Tipo de Reunión</label>
                  <select
                    value={newSessionForm.type}
                    onChange={(e) =>
                      setNewSessionForm((prev) => ({
                        ...prev,
                        type: e.target.value as AttendanceSessionType,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  >
                    {Object.entries(SESSION_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">Lugar / Sede</label>
                  <input
                    type="text"
                    required
                    value={newSessionForm.location}
                    onChange={(e) =>
                      setNewSessionForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Fecha</label>
                  <input
                    type="date"
                    required
                    value={newSessionForm.date}
                    onChange={(e) =>
                      setNewSessionForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">Horario</label>
                  <input
                    type="time"
                    required
                    value={newSessionForm.time}
                    onChange={(e) =>
                      setNewSessionForm((prev) => ({ ...prev, time: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Notas / Predicador</label>
                <textarea
                  rows={2}
                  value={newSessionForm.notes}
                  onChange={(e) =>
                    setNewSessionForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Detalles adicionales opcionales..."
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] p-3 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="rounded-xl border border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Crear Reunión</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REGISTRO DE NUEVO VISITANTE Y ASISTENCIA             */}
      {/* ============================================================== */}
      {isNewVisitorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-400" />
                <span>Registro de Nuevo Visitante</span>
              </h3>
              <button
                onClick={() => setIsNewVisitorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisitor} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={newVisitorForm.fullName}
                  onChange={(e) =>
                    setNewVisitorForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3.5 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  placeholder="ej. Juan Pablo Hernández"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={newVisitorForm.phone}
                    onChange={(e) =>
                      setNewVisitorForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                    placeholder="ej. +1 555-0192"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Correo Electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={newVisitorForm.email}
                    onChange={(e) =>
                      setNewVisitorForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Preferencia de Contacto
                  </label>
                  <select
                    value={newVisitorForm.preferredContactMethod}
                    onChange={(e) =>
                      setNewVisitorForm((prev) => ({
                        ...prev,
                        preferredContactMethod: e.target.value as VisitorPreferredContact,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  >
                    {Object.entries(CONTACT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    ¿Cómo nos conoció?
                  </label>
                  <select
                    value={newVisitorForm.howDidYouHear}
                    onChange={(e) =>
                      setNewVisitorForm((prev) => ({ ...prev, howDidYouHear: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  >
                    {Object.entries(HOW_DID_YOU_HEAR_OPTIONS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CONSENTIMIENTO EXPLÍCITO */}
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newVisitorForm.followUpConsent}
                    onChange={(e) =>
                      setNewVisitorForm((prev) => ({
                        ...prev,
                        followUpConsent: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-emerald-200">
                      Autorizó contacto y seguimiento pastoral
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      El visitante consiente explícitamente recibir un saludo pastoral o invitación. No se crearán cuentas de usuario sin consentimiento.
                    </span>
                  </div>
                </label>
              </div>

              {/* Marcar en la reunión actual */}
              {selectedSessionId && currentSession && (
                <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newVisitorForm.markAsPresentInCurrentSession}
                    onChange={(e) =>
                      setNewVisitorForm((prev) => ({
                        ...prev,
                        markAsPresentInCurrentSession: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-[#1E2D4A] text-[#E5C378] focus:ring-[#E5C378]"
                  />
                  <span>
                    Marcar presente de inmediato en{' '}
                    <strong className="text-white">&quot;{currentSession.title}&quot;</strong>
                  </span>
                </label>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Petición de Oración / Motivo de Visita (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newVisitorForm.prayerRequest}
                  onChange={(e) =>
                    setNewVisitorForm((prev) => ({ ...prev, prayerRequest: e.target.value }))
                  }
                  placeholder="Por salud familiar, gratitud, trabajo..."
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] p-3 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setIsNewVisitorModalOpen(false)}
                  className="rounded-xl border border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-black hover:bg-emerald-400 disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Registrar Visitante</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: REGISTRAR CONTACTO Y SEGUIMIENTO PASTORAL            */}
      {/* ============================================================== */}
      {isFollowUpModalOpen && targetPersonForFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Heart className="h-4 w-4 text-[#E5C378]" />
                  <span>Registrar Contacto Pastoral</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Atención para <strong className="text-white">{targetPersonForFollowUp.name}</strong>
                </p>
              </div>
              <button
                onClick={() => {
                  setIsFollowUpModalOpen(false);
                  setTargetPersonForFollowUp(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFollowUp} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Medio Usado</label>
                  <select
                    value={followUpForm.contactType}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({
                        ...prev,
                        contactType: e.target.value as FollowUpContactType,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  >
                    {Object.entries(FOLLOWUP_CONTACT_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">Fecha del Contacto</label>
                  <input
                    type="date"
                    required
                    value={followUpForm.contactDate}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, contactDate: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">Resultado del Contacto</label>
                <select
                  value={followUpForm.result}
                  onChange={(e) =>
                    setFollowUpForm((prev) => ({
                      ...prev,
                      result: e.target.value as FollowUpResult,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                >
                  {Object.entries(FOLLOWUP_RESULTS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Nota Pastoral Confidencial *</span>
                  <span className="text-[10px] text-[#E5C378] flex items-center gap-1 font-bold">
                    <Lock className="h-3 w-3" /> Privado para Pastores
                  </span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={followUpForm.pastoralNotes}
                  onChange={(e) =>
                    setFollowUpForm((prev) => ({ ...prev, pastoralNotes: e.target.value }))
                  }
                  placeholder="Escribe lo conversado, motivos de oración o estado espiritual..."
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] p-3 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Próximo Paso / Compromiso
                  </label>
                  <input
                    type="text"
                    value={followUpForm.nextStep}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, nextStep: e.target.value }))
                    }
                    placeholder="ej. Llamar el jueves, invitar a grupo"
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">Fecha Límite</label>
                  <input
                    type="date"
                    value={followUpForm.nextStepDueDate}
                    onChange={(e) =>
                      setFollowUpForm((prev) => ({ ...prev, nextStepDueDate: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => {
                    setIsFollowUpModalOpen(false);
                    setTargetPersonForFollowUp(null);
                  }}
                  className="rounded-xl border border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Guardar Seguimiento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: CORRECCIÓN Y ANULACIÓN AUDITADA                      */}
      {/* ============================================================== */}
      {isVoidModalOpen && targetRecordForVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Corregir o Anular Asistencia</h3>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              Estás por anular la asistencia de{' '}
              <strong className="text-white">
                {targetRecordForVoid.attendeeType === 'member'
                  ? targetRecordForVoid.memberName
                  : targetRecordForVoid.visitorName}
              </strong>
              . El registro se conservará en el sistema con marca de auditoría y se descontará del conteo de presentes.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-300">
                Motivo de la Corrección * (mínimo 5 caracteres)
              </label>
              <textarea
                rows={3}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="ej. Se registró por error en lugar de otro hermano, o se retiró antes del servicio..."
                className="mt-1.5 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] p-3 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#1E2D4A] pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsVoidModalOpen(false);
                  setTargetRecordForVoid(null);
                }}
                className="rounded-xl border border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={actionLoading || voidReason.trim().length < 5}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Confirmar Anulación</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
