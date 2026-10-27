'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  Calendar,
  Clock,
  Phone,
  Video,
  MapPin,
  ShieldCheck,
  Lock,
  Users,
  Globe,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Send,
  Loader2,
  Sparkles,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  PastoralCareRequest,
  PastoralRequestType,
  PastoralRequestStatus,
  PastoralModality,
  PastoralPrayerPrivacy,
  PastoralContactMethod,
} from '@/types/models';

interface MemberPastoralPortalProps {
  onOpenNotifications?: () => void;
}

const STATUS_CONFIG: Record<
  PastoralRequestStatus,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: 'Pendiente de Revisión',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    icon: Clock,
  },
  in_review: {
    label: 'En Revisión Pastoral',
    badgeClass: 'bg-sky-950/60 text-sky-300 border-sky-500/40',
    icon: RotateCcw,
  },
  approved: {
    label: 'Cita Aprobada & Confirmada',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    icon: CheckCircle2,
  },
  reschedule_proposed: {
    label: 'Reprogramación Propuesta',
    badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Atención Concluida',
    badgeClass: 'bg-teal-950/60 text-teal-300 border-teal-500/40',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: XCircle,
  },
};

const MODALITY_CONFIG: Record<PastoralModality, { label: string; icon: typeof MapPin }> = {
  presencial: { label: 'Presencial (En Templo)', icon: MapPin },
  telefonica: { label: 'Llamada Telefónica', icon: Phone },
  videollamada: { label: 'Videollamada Pastoral', icon: Video },
};

const PRIVACY_CONFIG: Record<
  PastoralPrayerPrivacy,
  { label: string; badge: string; icon: typeof Lock; desc: string }
> = {
  privada: {
    label: 'Estrictamente Privada',
    badge: 'bg-rose-950/50 text-rose-300 border-rose-500/30',
    icon: Lock,
    desc: 'Visible únicamente para ti y el pastor asignado.',
  },
  grupo_autorizado: {
    label: 'Equipo de Intercesión',
    badge: 'bg-purple-950/50 text-purple-300 border-purple-500/30',
    icon: Users,
    desc: 'Accesible exclusivamente para el equipo de intercesores autorizados.',
  },
  congregacion: {
    label: 'Muro Congregacional',
    badge: 'bg-blue-950/50 text-blue-300 border-blue-500/30',
    icon: Globe,
    desc: 'Requiere tu autorización expresa y aprobación pastoral previa.',
  },
};

export function MemberPastoralPortal({ onOpenNotifications }: MemberPastoralPortalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'mis_solicitudes' | 'nueva_solicitud'>('mis_solicitudes');
  const [requestType, setRequestType] = useState<PastoralRequestType>('cita');

  // Estados de consulta
  const [requests, setRequests] = useState<PastoralCareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Cancelación
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Formulario: Notificación
  const [notificationOptIn, setNotificationOptIn] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Formulario: Cita
  const [appointmentReason, setAppointmentReason] = useState('');
  const [modality, setModality] = useState<PastoralModality>('presencial');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('10:00 - 12:00');
  const [preferredContact, setPreferredContact] = useState<PastoralContactMethod>('whatsapp');
  const [comments, setComments] = useState('');

  // Formulario: Oración
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerText, setPrayerText] = useState('');
  const [prayerPrivacy, setPrayerPrivacy] = useState<PastoralPrayerPrivacy>('privada');
  const [allowPrayerGroup, setAllowPrayerGroup] = useState(false);
  const [allowPublicWall, setAllowPublicWall] = useState(false);

  // Formulario: Orientación
  const [orientationTopic, setOrientationTopic] = useState('Espiritual');
  const [orientationDescription, setOrientationDescription] = useState('');
  const [orientationContact, setOrientationContact] = useState<PastoralContactMethod>('whatsapp');
  const [orientationUrgency, setOrientationUrgency] = useState<'normal' | 'alta'>('normal');

  // Cargar solicitudes del miembro
  const fetchMyRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/pastoral-care', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener tus solicitudes.');
      setRequests(data.requests || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con el servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  // Manejador de Creación de Solicitud
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const token = await user.getIdToken();

      let bodyPayload: Record<string, any> = {
        type: requestType,
        memberNotificationOptIn: notificationOptIn,
      };

      if (requestType === 'cita') {
        if (!appointmentReason.trim()) throw new Error('Por favor indica el motivo general de la cita.');
        if (!preferredDate) throw new Error('Por favor selecciona una fecha preferida.');

        bodyPayload = {
          ...bodyPayload,
          reason: appointmentReason.trim(),
          modality,
          preferredDate,
          preferredTimeSlot,
          preferredContactMethod: preferredContact,
          comments: comments.trim() || undefined,
        };
      } else if (requestType === 'oracion') {
        if (!prayerText.trim()) throw new Error('Por favor escribe tu petición de oración.');

        bodyPayload = {
          ...bodyPayload,
          title: prayerTitle.trim() || undefined,
          requestText: prayerText.trim(),
          privacyLevel: prayerPrivacy,
          allowPrayerGroup,
          allowPublicWall: prayerPrivacy === 'congregacion' && allowPublicWall,
        };
      } else if (requestType === 'orientacion') {
        if (!orientationDescription.trim()) {
          throw new Error('Por favor describe brevemente el motivo de tu orientación.');
        }

        bodyPayload = {
          ...bodyPayload,
          topic: orientationTopic,
          description: orientationDescription.trim(),
          preferredContactMethod: orientationContact,
          urgencyLevel: orientationUrgency,
        };
      }

      const res = await fetch('/api/member/pastoral-care', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar tu solicitud.');

      setFeedback({
        msg: '¡Tu solicitud ha sido registrada exitosamente! El equipo pastoral la revisará con discreción.',
        type: 'success',
      });

      // Limpiar formularios
      setAppointmentReason('');
      setComments('');
      setPrayerTitle('');
      setPrayerText('');
      setOrientationDescription('');

      // Recargar solicitudes y cambiar a la pestaña de listado
      await fetchMyRequests();
      setTimeout(() => {
        setActiveTab('mis_solicitudes');
        setFeedback(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la solicitud.';
      setFeedback({ msg, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manejador de Cancelación de Solicitud
  const handleCancelRequest = async (id: string) => {
    if (!user) return;
    setIsSubmittingCancel(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/member/pastoral-care/${id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancelReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cancelar la solicitud.');

      setCancellingId(null);
      setCancelReason('');
      await fetchMyRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la solicitud.';
      alert(msg);
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Filtrado de solicitudes en cliente
  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return r.status === 'pending' || r.status === 'in_review';
    if (filterStatus === 'approved') return r.status === 'approved' || r.status === 'reschedule_proposed';
    if (filterStatus === 'completed') return r.status === 'completed';
    if (filterStatus === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Encabezado y Selector de Modo */}
      <div className="rounded-3xl border border-[#25282E] bg-gradient-to-br from-[#121417] via-[#16191E] to-[#121417] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#C69A4B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#E5C378] text-xs font-semibold uppercase tracking-wider">
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Ministerio de Cuidado & Acompañamiento</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Mi Atención Pastoral
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Un espacio sagrado, seguro y confidencial para conectar con tus pastores, agendar
              citas de consejería, compartir peticiones de oración y recibir acompañamiento espiritual.
            </p>
          </div>

          {/* Selector de subpestañas */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#070B14] border border-[#25282E] self-start sm:self-center">
            <button
              onClick={() => setActiveTab('mis_solicitudes')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'mis_solicitudes'
                  ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mis Solicitudes</span>
              {requests.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'mis_solicitudes' ? 'bg-black text-[#E5C378]' : 'bg-[#25282E] text-slate-300'
                  }`}
                >
                  {requests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('nueva_solicitud')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === 'nueva_solicitud'
                  ? 'bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black shadow-lg font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Nueva Solicitud</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          VISTA 1: MIS SOLICITUDES PASTORALES
         ======================================================== */}
      {activeTab === 'mis_solicitudes' && (
        <div className="space-y-6">
          {/* Barra de Filtros y Estado */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#121417] border border-[#25282E]">
            <div className="flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-slate-400 font-semibold px-2">Filtrar:</span>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'pending', label: 'En Espera' },
                { id: 'approved', label: 'Confirmadas / Aprobadas' },
                { id: 'completed', label: 'Completadas' },
                { id: 'cancelled', label: 'Canceladas' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                    filterStatus === f.id
                      ? 'bg-[#C69A4B]/20 text-[#E5C378] border border-[#C69A4B]/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-[#1A1D23]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchMyRequests}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl border border-[#25282E] text-slate-300 hover:text-white hover:border-[#C69A4B]/50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>

          {/* Carga o Error */}
          {loading && (
            <div className="p-12 text-center rounded-3xl border border-[#25282E] bg-[#121417]">
              <Loader2 className="w-8 h-8 text-[#C69A4B] animate-spin mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Cargando tus atenciones pastorales...</p>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Lista Vacía */}
          {!loading && !error && filteredRequests.length === 0 && (
            <div className="p-12 sm:p-16 text-center rounded-3xl border border-[#25282E] bg-[#121417]/80 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/20 flex items-center justify-center mx-auto text-[#E5C378]">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-editorial text-xl font-bold text-white">No tienes solicitudes registradas</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  ¿Necesitas hablar con un pastor, agendar una cita o compartir una necesidad de oración?
                  Estamos aquí para ti.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('nueva_solicitud')}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-sm shadow-lg hover:brightness-110 transition-all inline-flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Crear mi primera solicitud</span>
              </button>
            </div>
          )}

          {/* Listado de Solicitudes */}
          {!loading && !error && filteredRequests.length > 0 && (
            <div className="grid grid-cols-1 gap-6">
              {filteredRequests.map((req) => {
                const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusInfo.icon;

                const isAppointment = req.type === 'cita';
                const isPrayer = req.type === 'oracion';
                const isOrientation = req.type === 'orientacion';

                const canCancel = ['pending', 'in_review', 'reschedule_proposed'].includes(req.status);

                return (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-[#25282E] bg-[#121417] p-6 sm:p-8 space-y-6 shadow-xl hover:border-[#C69A4B]/30 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Encabezado de la Tarjeta */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2229]">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/20 flex items-center justify-center text-[#E5C378] shrink-0">
                          {isAppointment && <Calendar className="w-5 h-5" />}
                          {isPrayer && <ShieldCheck className="w-5 h-5" />}
                          {isOrientation && <HeartHandshake className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#C69A4B]">
                              {isAppointment && 'Cita Pastoral'}
                              {isPrayer && 'Petición de Oración'}
                              {isOrientation && 'Orientación & Acompañamiento'}
                            </span>
                            <span className="text-slate-500 text-xs">•</span>
                            <span className="text-slate-400 text-xs">#{req.id.slice(-5).toUpperCase()}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Registrada el {new Date(req.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Badge de Estado */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${statusInfo.badgeClass}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Contenido según tipo */}
                    {isAppointment && req.appointmentDetails && (
                      <div className="space-y-4">
                        <div className="bg-[#16191E] rounded-2xl p-4 sm:p-5 border border-[#25282E] space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Motivo de la Cita:
                          </p>
                          <p className="text-white text-sm sm:text-base leading-relaxed font-medium">
                            {req.appointmentDetails.reason}
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#25282E] text-xs">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Calendar className="w-4 h-4 text-[#C69A4B]" />
                              <span>Fecha preferida: <strong className="text-white">{req.appointmentDetails.preferredDate}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Clock className="w-4 h-4 text-[#C69A4B]" />
                              <span>Franja: <strong className="text-white">{req.appointmentDetails.preferredTimeSlot}</strong></span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              {req.appointmentDetails.modality === 'presencial' && <MapPin className="w-4 h-4 text-[#C69A4B]" />}
                              {req.appointmentDetails.modality === 'telefonica' && <Phone className="w-4 h-4 text-[#C69A4B]" />}
                              {req.appointmentDetails.modality === 'videollamada' && <Video className="w-4 h-4 text-[#C69A4B]" />}
                              <span>Modalidad: <strong className="text-white">{MODALITY_CONFIG[req.appointmentDetails.modality]?.label}</strong></span>
                            </div>
                          </div>

                          {req.appointmentDetails.comments && (
                            <p className="text-xs text-slate-400 italic pt-2">
                              Comentarios: &ldquo;{req.appointmentDetails.comments}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Banner de Cita Confirmada por Pastoral */}
                        {req.status === 'approved' && req.appointmentDetails.confirmedDate && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Cita Aprobada y Confirmada por el Equipo Pastoral</span>
                            </div>
                            <p className="text-xs text-emerald-100">
                              Tu cita ha sido agendada para el{' '}
                              <strong className="text-white underline">{req.appointmentDetails.confirmedDate}</strong> a las{' '}
                              <strong className="text-white underline">{req.appointmentDetails.confirmedTime}</strong> (
                              {req.appointmentDetails.confirmedModality || req.appointmentDetails.modality}).
                            </p>
                            {req.appointmentDetails.confirmedLocationOrLink && (
                              <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20 text-xs font-mono text-emerald-300">
                                Ubicación / Enlace: {req.appointmentDetails.confirmedLocationOrLink}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Banner de Reprogramación Propuesta */}
                        {req.status === 'reschedule_proposed' && req.rescheduleProposedDate && (
                          <div className="p-4 sm:p-5 rounded-2xl bg-purple-950/30 border border-purple-500/40 text-purple-200 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                              <AlertTriangle className="w-4 h-4 text-purple-400" />
                              <span>Propuesta de Reprogramación Pastoral</span>
                            </div>
                            <p className="text-xs text-purple-100">
                              El equipo pastoral te propone el siguiente horario alternativo:{' '}
                              <strong className="text-white">{req.rescheduleProposedDate}</strong> en la franja{' '}
                              <strong className="text-white">{req.rescheduleProposedTimeSlot}</strong>.
                            </p>
                            {req.rescheduleReason && (
                              <p className="text-xs text-purple-300 italic">
                                Motivo: &ldquo;{req.rescheduleReason}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {isPrayer && req.prayerDetails && (
                      <div className="space-y-4">
                        <div className="bg-[#16191E] rounded-2xl p-4 sm:p-5 border border-[#25282E] space-y-3">
                          {req.prayerDetails.title && (
                            <h4 className="text-base font-bold text-white">{req.prayerDetails.title}</h4>
                          )}
                          <p className="text-white text-sm leading-relaxed">{req.prayerDetails.requestText}</p>

                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#25282E]">
                            {/* Nivel de Privacidad */}
                            {(() => {
                              const priv = PRIVACY_CONFIG[req.prayerDetails.privacyLevel] || PRIVACY_CONFIG.privada;
                              const PrivIcon = priv.icon;
                              return (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${priv.badge}`}>
                                  <PrivIcon className="w-3.5 h-3.5" />
                                  <span>{priv.label}</span>
                                </span>
                              );
                            })()}

                            {req.prayerDetails.allowPrayerGroup && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/40 text-purple-300 border border-purple-500/30">
                                <Users className="w-3.5 h-3.5" />
                                <span>Compartida con Grupo de Oración</span>
                              </span>
                            )}

                            {req.prayerDetails.allowPublicWall && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/40 text-blue-300 border border-blue-500/30">
                                <Globe className="w-3.5 h-3.5" />
                                <span>
                                  {req.prayerDetails.approvedForPublicWall
                                    ? 'Publicada en el Muro Congregacional'
                                    : 'Autorizada para Muro (Pendiente de Aprobación)'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {isOrientation && req.orientationDetails && (
                      <div className="space-y-4">
                        <div className="bg-[#16191E] rounded-2xl p-4 sm:p-5 border border-[#25282E] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#C69A4B] uppercase tracking-wider">
                              Área: {req.orientationDetails.topic}
                            </span>
                            {req.orientationDetails.urgencyLevel === 'alta' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                                Urgencia Alta
                              </span>
                            )}
                          </div>
                          <p className="text-white text-sm leading-relaxed">{req.orientationDetails.description}</p>
                          <p className="text-xs text-slate-400 pt-2 border-t border-[#25282E]">
                            Medio de contacto preferido:{' '}
                            <strong className="text-slate-200 capitalize">
                              {req.orientationDetails.preferredContactMethod}
                            </strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Tarjeta de Respuesta Pastoral Visible */}
                    {req.publicResponse && (
                      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1B1E26] to-[#121417] border border-[#C69A4B]/40 space-y-3 relative overflow-hidden shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-[#C69A4B]" />
                            <span className="text-xs font-bold text-[#E5C378] uppercase tracking-wider">
                              Respuesta Pastoral Oficial
                            </span>
                          </div>
                          {req.respondedByName && (
                            <span className="text-xs text-slate-400">Por {req.respondedByName}</span>
                          )}
                        </div>
                        <p className="text-white text-sm leading-relaxed whitespace-pre-line">
                          {req.publicResponse}
                        </p>
                        {req.respondedAt && (
                          <p className="text-[11px] text-slate-500 text-right">
                            Respondido el {new Date(req.respondedAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Acciones del Miembro: Cancelación */}
                    {canCancel && (
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-[#1E2229]">
                        <span className="text-slate-400">
                          ¿Ya no requieres esta cita o atención? Puedes cancelarla antes de que concluya.
                        </span>
                        {cancellingId === req.id ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="text"
                              placeholder="Motivo breve (opcional)..."
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              className="px-3 py-1.5 rounded-xl bg-[#070B14] border border-[#25282E] text-white text-xs focus:outline-none focus:border-rose-500 w-full sm:w-60"
                            />
                            <button
                              onClick={() => handleCancelRequest(req.id)}
                              disabled={isSubmittingCancel}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors whitespace-nowrap"
                            >
                              {isSubmittingCancel ? '...' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => {
                                setCancellingId(null);
                                setCancelReason('');
                              }}
                              className="px-3 py-1.5 rounded-xl border border-[#25282E] text-slate-400 hover:text-white"
                            >
                              Atrás
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancellingId(req.id)}
                            className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold transition-colors self-end sm:self-auto"
                          >
                            Cancelar Solicitud
                          </button>
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

      {/* ========================================================
          VISTA 2: NUEVA SOLICITUD PASTORAL
         ======================================================== */}
      {activeTab === 'nueva_solicitud' && (
        <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-6 sm:p-8 space-y-8 shadow-2xl">
          {/* Selector de Tipo */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Selecciona el Tipo de Atención Pastoral:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'cita' as PastoralRequestType,
                  title: 'Cita Pastoral',
                  desc: 'Reunión de consejería presencial o por videollamada.',
                  icon: Calendar,
                },
                {
                  id: 'oracion' as PastoralRequestType,
                  title: 'Petición de Oración',
                  desc: 'Petición confidencial para intercesión pastoral.',
                  icon: ShieldCheck,
                },
                {
                  id: 'orientacion' as PastoralRequestType,
                  title: 'Acompañamiento',
                  desc: 'Orientación espiritual, familiar o en duelo.',
                  icon: HeartHandshake,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = requestType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setRequestType(item.id);
                      setFeedback(null);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#1F232B] to-[#14171C] border-[#C69A4B] shadow-lg ring-1 ring-[#C69A4B]/40'
                        : 'bg-[#16191E] border-[#25282E] hover:border-[#353942]'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-[#C69A4B] text-black' : 'bg-[#25282E] text-slate-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${isSelected ? 'text-[#E5C378]' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Formulario Principal */}
          <form onSubmit={handleSubmitRequest} className="space-y-6">
            {/* SUB-FORM 1: CITA PASTORAL */}
            {requestType === 'cita' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Banner de Aviso de Reserva */}
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Nota importante:</strong> Tu solicitud de cita permanecerá como{' '}
                    <em>Pendiente</em> hasta que un pastor autorizado revise la disponibilidad ministerial y te
                    envíe la confirmación formal.
                  </p>
                </div>

                {/* Motivo General */}
                <div className="space-y-2">
                  <label className="text-slate-200 text-xs font-semibold block">
                    Motivo General de la Cita *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Consejería matrimonial, orientación espiritual, duda doctrinal..."
                    value={appointmentReason}
                    onChange={(e) => setAppointmentReason(e.target.value)}
                    maxLength={300}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                {/* Modalidad y Contacto */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Modalidad de Atención</label>
                    <select
                      value={modality}
                      onChange={(e) => setModality(e.target.value as PastoralModality)}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="presencial">Presencial (En Oficinas / Templo)</option>
                      <option value="telefonica">Llamada Telefónica</option>
                      <option value="videollamada">Videollamada Pastoral (Virtual)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Medio de Contacto Preferido</label>
                    <select
                      value={preferredContact}
                      onChange={(e) => setPreferredContact(e.target.value as PastoralContactMethod)}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="telefono">Llamada Directa</option>
                      <option value="email">Correo Electrónico</option>
                      <option value="presencial">En el Templo</option>
                    </select>
                  </div>
                </div>

                {/* Fecha y Franja Horaria */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Fecha Preferida *</label>
                    <input
                      type="date"
                      required
                      value={preferredDate}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Franja Horaria Preferida *</label>
                    <select
                      value={preferredTimeSlot}
                      onChange={(e) => setPreferredTimeSlot(e.target.value)}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="09:00 - 11:00">Mañana (09:00 - 11:00)</option>
                      <option value="11:00 - 13:00">Mediodía (11:00 - 13:00)</option>
                      <option value="15:00 - 17:00">Tarde (15:00 - 17:00)</option>
                      <option value="17:00 - 19:00">Tarde / Noche (17:00 - 19:00)</option>
                    </select>
                  </div>
                </div>

                {/* Comentarios Opcionales */}
                <div className="space-y-2">
                  <label className="text-slate-200 text-xs font-semibold block">
                    Comentarios Adicionales (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detalles que desees que el pastor conozca antes de la cita..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    maxLength={1000}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              </div>
            )}

            {/* SUB-FORM 2: PETICIÓN DE ORACIÓN */}
            {requestType === 'oracion' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Título Opcional */}
                <div className="space-y-2">
                  <label className="text-slate-200 text-xs font-semibold block">
                    Título de la Petición (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Por la salud de mi madre, restauración laboral..."
                    value={prayerTitle}
                    onChange={(e) => setPrayerTitle(e.target.value)}
                    maxLength={150}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                {/* Petición Text */}
                <div className="space-y-2">
                  <label className="text-slate-200 text-xs font-semibold block">
                    Motivo o Petición de Oración *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Escribe tu petición aquí. La leeremos con reverencia y fe..."
                    value={prayerText}
                    onChange={(e) => setPrayerText(e.target.value)}
                    maxLength={1000}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                {/* Nivel de Privacidad Explícito */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Nivel de Privacidad de la Petición:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'privada' as PastoralPrayerPrivacy,
                        title: 'Privada',
                        desc: 'Solo tú y el personal pastoral autorizado.',
                        icon: Lock,
                      },
                      {
                        id: 'grupo_autorizado' as PastoralPrayerPrivacy,
                        title: 'Grupo de Oración',
                        desc: 'Equipo de intercesión autorizado de la iglesia.',
                        icon: Users,
                      },
                      {
                        id: 'congregacion' as PastoralPrayerPrivacy,
                        title: 'Congregacional',
                        desc: 'Requiere tu consentimiento + aprobación pastoral.',
                        icon: Globe,
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = prayerPrivacy === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setPrayerPrivacy(item.id);
                            if (item.id === 'privada') {
                              setAllowPrayerGroup(false);
                              setAllowPublicWall(false);
                            } else if (item.id === 'grupo_autorizado') {
                              setAllowPrayerGroup(true);
                              setAllowPublicWall(false);
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#1C2028] border-[#C69A4B] shadow-md ring-1 ring-[#C69A4B]/40'
                              : 'bg-[#16191E] border-[#25282E]'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-[#E5C378]' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">{item.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Opciones de Consentimiento Explícito */}
                <div className="space-y-3 p-4 rounded-2xl bg-[#16191E] border border-[#25282E]">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowPrayerGroup}
                      onChange={(e) => setAllowPrayerGroup(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-white block">
                        Permitir compartir con el equipo de intercesores autorizados
                      </span>
                      <span className="text-slate-400">
                        Hermanos consagrados al ministerio de oración que orarán específicamente por tu causa.
                      </span>
                    </div>
                  </label>

                  {prayerPrivacy === 'congregacion' && (
                    <label className="flex items-start gap-3 cursor-pointer pt-3 border-t border-[#25282E]">
                      <input
                        type="checkbox"
                        checked={allowPublicWall}
                        onChange={(e) => setAllowPublicWall(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-[#E5C378] block">
                          Autorizo expresamente que esta petición se publique en el Muro Comunitario de Oración
                        </span>
                        <span className="text-slate-400">
                          Solo se publicará una vez que el personal pastoral autorizado verifique y apruebe el contenido.
                        </span>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* SUB-FORM 3: ORIENTACIÓN & ACOMPAÑAMIENTO */}
            {requestType === 'orientacion' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">
                      Área o Tema de Orientación *
                    </label>
                    <select
                      value={orientationTopic}
                      onChange={(e) => setOrientationTopic(e.target.value)}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="Espiritual">Crecimiento Espiritual & Fe</option>
                      <option value="Familiar">Familia & Crianza</option>
                      <option value="Matrimonial">Matrimonio & Pareja</option>
                      <option value="Duelo">Duelo / Pérdida de un Ser Querido</option>
                      <option value="Personal">Personal / Crisis Vital</option>
                      <option value="Otro">Otro Asunto</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Nivel de Urgencia</label>
                    <select
                      value={orientationUrgency}
                      onChange={(e) => setOrientationUrgency(e.target.value as 'normal' | 'alta')}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="normal">Normal (Atención en los próximos días)</option>
                      <option value="alta">Alta (Situación crítica o dolor agudo)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-200 text-xs font-semibold block">
                    Describe tu situación o consulta *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explica con confianza cómo podemos acompañarte en oración y consejo pastoral..."
                    value={orientationDescription}
                    onChange={(e) => setOrientationDescription(e.target.value)}
                    maxLength={1000}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-slate-200 text-xs font-semibold block">Medio de Contacto Preferido</label>
                  <select
                    value={orientationContact}
                    onChange={(e) => setOrientationContact(e.target.value as PastoralContactMethod)}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#C69A4B]"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telefono">Llamada Telefónica</option>
                    <option value="email">Correo Electrónico</option>
                    <option value="presencial">Presencial en el Templo</option>
                  </select>
                </div>
              </div>
            )}

            {/* PREFERENCIA DE NOTIFICACIONES */}
            <div className="p-4 rounded-2xl bg-[#16191E] border border-[#25282E]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationOptIn}
                  onChange={(e) => setNotificationOptIn(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                />
                <div className="text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-[#C69A4B]" />
                    <span>Recibir avisos discretos en mi Centro de Notificaciones</span>
                  </span>
                  <span className="text-slate-400">
                    Te notificaremos cuando tu cita sea confirmada o cuando el equipo pastoral te responda.
                  </span>
                </div>
              </label>
            </div>

            {/* Feedback Message */}
            {feedback && (
              <div
                className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <p>{feedback.msg}</p>
              </div>
            )}

            {/* Botón de Envío */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#C69A4B] via-[#E5C378] to-[#9E7A32] text-black font-bold text-sm shadow-xl hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando al Equipo Pastoral...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitud Pastoral</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
