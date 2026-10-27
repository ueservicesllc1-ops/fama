'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  HeartHandshake,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Lock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Loader2,
  Sparkles,
  Search,
  Eye,
  RefreshCw,
  History,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { canAccessPastoral } from '@/lib/pastoral/pastoralClientHelper';
import {
  PastoralCareRequest,
  PastoralRequestType,
  PastoralRequestStatus,
  PastoralModality,
  PastoralPrayerPrivacy,
  PastoralInternalNote,
  PastoralAuditEntry,
} from '@/types/models';

interface PastoralManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const STATUS_CONFIG: Record<
  PastoralRequestStatus,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  pending: {
    label: 'Pendiente',
    badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/40',
    icon: Clock,
  },
  in_review: {
    label: 'En Revisión',
    badgeClass: 'bg-sky-950/60 text-sky-300 border-sky-500/40',
    icon: RotateCcw,
  },
  approved: {
    label: 'Aprobada / Confirmada',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    icon: CheckCircle2,
  },
  reschedule_proposed: {
    label: 'Reprogramación Propuesta',
    badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/40',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completada',
    badgeClass: 'bg-teal-950/60 text-teal-300 border-teal-500/40',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: XCircle,
  },
};

export function PastoralManager({ onNotify }: PastoralManagerProps) {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<PastoralCareRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Estadísticas rápidas
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inReview: 0,
    approved: 0,
    completed: 0,
  });

  // Modal de Detalle y Gestión
  const [selectedRequest, setSelectedRequest] = useState<PastoralCareRequest | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'gestion' | 'notas' | 'auditoria'>('gestion');

  // Campos de formulario en modal
  const [editStatus, setEditStatus] = useState<PastoralRequestStatus>('pending');
  const [assignedPastorName, setAssignedPastorName] = useState('');
  const [publicResponse, setPublicResponse] = useState('');
  const [newInternalNote, setNewInternalNote] = useState('');

  // Confirmación de Cita
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmTime, setConfirmTime] = useState('10:00');
  const [confirmModality, setConfirmModality] = useState<PastoralModality>('presencial');
  const [confirmLocationOrLink, setConfirmLocationOrLink] = useState('');

  // Reprogramación de Cita
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('15:00 - 17:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Aprobación de Muro de Oración
  const [approveForWall, setApproveForWall] = useState(false);

  // Estado de guardado
  const [saving, setSaving] = useState(false);

  const hasAccess = canAccessPastoral(profile);

  // Cargar solicitudes pastorales desde la API segura
  const fetchRequests = useCallback(async () => {
    if (!user || !hasAccess) return;
    setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`/api/admin/pastoral-care?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al consultar solicitudes.');

      setRequests(data.requests || []);
      if (data.stats) setStats(data.stats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con la base de datos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, hasAccess, typeFilter, statusFilter, searchTerm]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Abrir modal con los datos actuales
  const handleOpenModal = (req: PastoralCareRequest) => {
    setSelectedRequest(req);
    setActiveModalTab('gestion');
    setEditStatus(req.status);
    setAssignedPastorName(req.assignedPastorName || profile?.displayName || 'Pastor');
    setPublicResponse(req.publicResponse || '');
    setNewInternalNote('');

    // Pre-cargar datos de cita si existen
    if (req.appointmentDetails) {
      setConfirmDate(req.appointmentDetails.confirmedDate || req.appointmentDetails.preferredDate || '');
      setConfirmTime(req.appointmentDetails.confirmedTime || '10:00');
      setConfirmModality(req.appointmentDetails.confirmedModality || req.appointmentDetails.modality || 'presencial');
      setConfirmLocationOrLink(req.appointmentDetails.confirmedLocationOrLink || '');
    }

    setRescheduleDate(req.rescheduleProposedDate || '');
    setRescheduleTimeSlot(req.rescheduleProposedTimeSlot || '15:00 - 17:00');
    setRescheduleReason(req.rescheduleReason || '');
    setApproveForWall(Boolean(req.prayerDetails?.approvedForPublicWall));
  };

  // Guardar Cambios en la Solicitud
  const handleSaveModal = async () => {
    if (!user || !selectedRequest) return;
    setSaving(true);

    try {
      const token = await user.getIdToken();

      const bodyPayload: Record<string, any> = {
        status: editStatus,
        assignedPastorUid: user.uid,
        assignedPastorName: assignedPastorName.trim() || user.displayName || 'Pastor',
        publicResponse: publicResponse.trim() || undefined,
        newInternalNote: newInternalNote.trim() || undefined,
      };

      // Si es cita y se marca como aprobada
      if (selectedRequest.type === 'cita' && editStatus === 'approved') {
        if (!confirmDate || !confirmTime) {
          throw new Error('Debe especificar la fecha y hora confirmadas para aprobar la cita.');
        }
        bodyPayload.confirmedAppointment = {
          date: confirmDate,
          time: confirmTime,
          modality: confirmModality,
          locationOrLink: confirmLocationOrLink.trim() || undefined,
        };
      }

      // Si se propone reprogramación
      if (selectedRequest.type === 'cita' && editStatus === 'reschedule_proposed') {
        if (!rescheduleDate) {
          throw new Error('Debe especificar la nueva fecha propuesta.');
        }
        bodyPayload.rescheduleProposal = {
          date: rescheduleDate,
          timeSlot: rescheduleTimeSlot,
          reason: rescheduleReason.trim() || undefined,
        };
      }

      // Si se aprueba para muro congregacional
      if (selectedRequest.type === 'oracion' && approveForWall) {
        bodyPayload.approveForPublicWall = true;
      }

      const res = await fetch(`/api/admin/pastoral-care/${selectedRequest.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la solicitud.');

      if (onNotify) {
        onNotify('Solicitud pastoral actualizada correctamente.', 'success');
      }

      // Actualizar vista local
      setSelectedRequest(data.request);
      setNewInternalNote('');
      await fetchRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar cambios.';
      if (onNotify) onNotify(msg, 'error');
      else alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // Si el usuario no tiene permisos pastorales explícitos
  if (!hasAccess) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto my-12">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-editorial text-2xl font-bold text-white">Acceso Pastoral Restringido</h3>
        <p className="text-slate-300 text-sm leading-relaxed">
          Esta sección contiene <strong>peticiones íntimas, motivos de oración confidenciales y notas pastorales protegidas</strong>.
          Por políticas de protección espiritual y privacidad ministerial de RENACER CHURCH, se requiere rol de{' '}
          <span className="text-[#E5C378] font-bold">Pastor</span> o un permiso pastoral explícito concedido por el liderazgo.
        </p>
        <p className="text-xs text-slate-500">
          Si requieres acceso para labores de consejería, contacta al Pastor Principal o al Administrador de la plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Encabezado Principal */}
      <div className="rounded-3xl border border-[#25282E] bg-gradient-to-br from-[#121417] via-[#16191E] to-[#121417] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C69A4B]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#E5C378] text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Centro de Cuidado Ministerial Confidencial</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Portal de Atención Pastoral
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Administración autorizada de citas de consejería, intercesión confidencial, orientación
              espiritual y seguimiento con separación estricta entre respuestas y notas internas.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="self-start md:self-center px-4 py-2.5 rounded-xl border border-[#25282E] bg-[#16191E] hover:border-[#C69A4B]/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C69A4B]' : ''}`} />
            <span>Actualizar Solicitudes</span>
          </button>
        </div>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Solicitudes', value: stats.total, color: 'text-white', border: 'border-[#25282E]' },
          { label: 'Pendientes', value: stats.pending, color: 'text-amber-400', border: 'border-amber-500/30' },
          { label: 'En Revisión', value: stats.inReview, color: 'text-sky-400', border: 'border-sky-500/30' },
          { label: 'Aprobadas / Citas', value: stats.approved, color: 'text-emerald-400', border: 'border-emerald-500/30' },
        ].map((card, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-[#121417] border ${card.border} space-y-1 shadow-lg`}
          >
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{card.label}</p>
            <p className={`text-2xl sm:text-3xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#121417] border border-[#25282E] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tipo */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Tipo:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
            >
              <option value="all">Todos los Tipos</option>
              <option value="cita">Citas Pastorales</option>
              <option value="oracion">Peticiones de Oración</option>
              <option value="orientacion">Orientaciones</option>
            </select>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#16191E] border border-[#25282E] rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
            >
              <option value="all">Todos los Estados</option>
              <option value="pending">Pendientes</option>
              <option value="in_review">En Revisión</option>
              <option value="approved">Aprobadas</option>
              <option value="reschedule_proposed">Reprogramadas</option>
              <option value="completed">Completadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
        </div>

        {/* Buscador de texto */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por miembro o motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#16191E] border border-[#25282E] rounded-xl pl-9 pr-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
          />
        </div>
      </div>

      {/* Tabla / Listado de Solicitudes */}
      {loading ? (
        <div className="p-16 text-center rounded-3xl border border-[#25282E] bg-[#121417]">
          <Loader2 className="w-8 h-8 text-[#C69A4B] animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando registros pastorales...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-[#25282E] bg-[#121417] space-y-3">
          <HeartHandshake className="w-12 h-12 text-slate-500 mx-auto" />
          <h4 className="font-editorial text-lg font-bold text-white">No hay solicitudes con los filtros aplicados</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Prueba ajustando los filtros de estado o tipo en la barra superior.
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#25282E] bg-[#121417] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#16191E] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#25282E]">
                <tr>
                  <th className="py-3.5 px-4">Miembro Solicitante</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Detalle Principal</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Pastor Asignado</th>
                  <th className="py-3.5 px-4">Fecha</th>
                  <th className="py-3.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2229]">
                {requests.map((req) => {
                  const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusInfo.icon;

                  let detailSummary = '';
                  if (req.type === 'cita' && req.appointmentDetails) {
                    detailSummary = `${req.appointmentDetails.reason} (${req.appointmentDetails.modality})`;
                  } else if (req.type === 'oracion' && req.prayerDetails) {
                    detailSummary = req.prayerDetails.title || req.prayerDetails.requestText.slice(0, 50) + '...';
                  } else if (req.type === 'orientacion' && req.orientationDetails) {
                    detailSummary = `${req.orientationDetails.topic}: ${req.orientationDetails.description.slice(0, 50)}...`;
                  }

                  return (
                    <tr key={req.id} className="hover:bg-[#16191E]/60 transition-colors">
                      <td className="py-4 px-4 font-medium text-white">
                        <div className="flex flex-col">
                          <span className="font-bold">{req.userName}</span>
                          <span className="text-[11px] text-slate-400">{req.userEmail}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="capitalize font-semibold text-[#E5C378]">
                          {req.type === 'cita' && 'Cita Pastoral'}
                          {req.type === 'oracion' && 'Petición'}
                          {req.type === 'orientacion' && 'Orientación'}
                        </span>
                      </td>

                      <td className="py-4 px-4 max-w-xs text-slate-300 truncate font-light">
                        {detailSummary}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${statusInfo.badgeClass}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-400">
                        {req.assignedPastorName || <span className="italic text-slate-500">Sin asignar</span>}
                      </td>

                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleOpenModal(req)}
                          className="px-3 py-1.5 rounded-xl border border-[#C69A4B]/40 bg-[#C69A4B]/10 hover:bg-[#C69A4B]/20 text-[#E5C378] font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Gestionar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE GESTIÓN PASTORAL Y DETALLES
         ======================================================== */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-[#121417] border border-[#25282E] rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#25282E]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C69A4B]">
                    Solicitud #{selectedRequest.id.slice(-5).toUpperCase()}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-xs text-slate-400 capitalize">{selectedRequest.type}</span>
                </div>
                <h3 className="font-editorial text-xl font-bold text-white mt-1">
                  Atención Pastoral: {selectedRequest.userName}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedRequest.userEmail} {selectedRequest.userPhone ? `• Tel: ${selectedRequest.userPhone}` : ''}
                </p>
              </div>

              <button
                onClick={() => setSelectedRequest(null)}
                className="w-8 h-8 rounded-full bg-[#1A1D24] text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Pestañas del Modal */}
            <div className="flex items-center gap-2 border-b border-[#25282E] pb-2 text-xs font-semibold">
              <button
                onClick={() => setActiveModalTab('gestion')}
                className={`px-3 py-1.5 rounded-xl transition-colors ${
                  activeModalTab === 'gestion'
                    ? 'bg-[#C69A4B]/20 text-[#E5C378] border border-[#C69A4B]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gestión & Respuesta
              </button>

              <button
                onClick={() => setActiveModalTab('notas')}
                className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
                  activeModalTab === 'notas'
                    ? 'bg-purple-950/40 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Notas Internas ({selectedRequest.internalNotes?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveModalTab('auditoria')}
                className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 ${
                  activeModalTab === 'auditoria'
                    ? 'bg-sky-950/40 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Auditoría</span>
              </button>
            </div>

            {/* CONTENIDO 1: GESTIÓN Y RESPUESTA */}
            {activeModalTab === 'gestion' && (
              <div className="space-y-6">
                {/* Resumen del Contenido Solicitado */}
                <div className="p-4 rounded-2xl bg-[#16191E] border border-[#25282E] space-y-3 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider">Detalles de la Solicitud:</p>

                  {selectedRequest.type === 'cita' && selectedRequest.appointmentDetails && (
                    <div className="space-y-2 text-white">
                      <p>
                        <strong className="text-slate-300">Motivo:</strong> {selectedRequest.appointmentDetails.reason}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-slate-300">
                        <p>
                          <strong>Modalidad:</strong> {selectedRequest.appointmentDetails.modality}
                        </p>
                        <p>
                          <strong>Contacto preferido:</strong> {selectedRequest.appointmentDetails.preferredContactMethod}
                        </p>
                        <p>
                          <strong>Fecha solicitada:</strong> {selectedRequest.appointmentDetails.preferredDate}
                        </p>
                        <p>
                          <strong>Franja horaria:</strong> {selectedRequest.appointmentDetails.preferredTimeSlot}
                        </p>
                      </div>
                      {selectedRequest.appointmentDetails.comments && (
                        <p className="text-slate-400 italic">
                          Comentarios: &ldquo;{selectedRequest.appointmentDetails.comments}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {selectedRequest.type === 'oracion' && selectedRequest.prayerDetails && (
                    <div className="space-y-2 text-white">
                      {selectedRequest.prayerDetails.title && (
                        <p className="font-bold text-[#E5C378]">{selectedRequest.prayerDetails.title}</p>
                      )}
                      <p className="whitespace-pre-line">{selectedRequest.prayerDetails.requestText}</p>
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#25282E]">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                          Privacidad: {selectedRequest.prayerDetails.privacyLevel}
                        </span>
                        {selectedRequest.prayerDetails.allowPrayerGroup && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300">
                            Autorizado para Grupo de Oración
                          </span>
                        )}
                        {selectedRequest.prayerDetails.allowPublicWall && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300">
                            Autorizado por Miembro para Muro Público
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedRequest.type === 'orientacion' && selectedRequest.orientationDetails && (
                    <div className="space-y-2 text-white">
                      <p>
                        <strong className="text-slate-300">Área:</strong> {selectedRequest.orientationDetails.topic}
                      </p>
                      <p className="whitespace-pre-line">{selectedRequest.orientationDetails.description}</p>
                      <p className="text-slate-400">
                        Contacto: {selectedRequest.orientationDetails.preferredContactMethod} • Urgencia:{' '}
                        {selectedRequest.orientationDetails.urgencyLevel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Formulario de Acciones */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Estado */}
                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Estado de la Solicitud</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as PastoralRequestStatus)}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_review">En Revisión Pastoral</option>
                      <option value="approved">Aprobada / Confirmada</option>
                      <option value="reschedule_proposed">Reprogramación Propuesta</option>
                      <option value="completed">Completada / Atendida</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>

                  {/* Asignar Pastor */}
                  <div className="space-y-2">
                    <label className="text-slate-200 text-xs font-semibold block">Pastor Responsable Asignado</label>
                    <input
                      type="text"
                      placeholder="Nombre del Pastor..."
                      value={assignedPastorName}
                      onChange={(e) => setAssignedPastorName(e.target.value)}
                      className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>
                </div>

                {/* Confirmación de Cita (si el estado es Aprobada y es tipo cita) */}
                {selectedRequest.type === 'cita' && editStatus === 'approved' && (
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Definir Datos de Confirmación de la Cita:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">Fecha Confirmada</label>
                        <input
                          type="date"
                          value={confirmDate}
                          onChange={(e) => setConfirmDate(e.target.value)}
                          className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">Hora Confirmada</label>
                        <input
                          type="time"
                          value={confirmTime}
                          onChange={(e) => setConfirmTime(e.target.value)}
                          className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">Modalidad</label>
                        <select
                          value={confirmModality}
                          onChange={(e) => setConfirmModality(e.target.value as PastoralModality)}
                          className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                        >
                          <option value="presencial">Presencial (Templo)</option>
                          <option value="telefonica">Telefónica</option>
                          <option value="videollamada">Videollamada</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Ubicación física o Enlace virtual</label>
                      <input
                        type="text"
                        placeholder="Ej: Oficina Pastoral #2 o Enlace Google Meet / Zoom..."
                        value={confirmLocationOrLink}
                        onChange={(e) => setConfirmLocationOrLink(e.target.value)}
                        className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Reprogramación de Cita (si el estado es reprogramacion_propuesta) */}
                {selectedRequest.type === 'cita' && editStatus === 'reschedule_proposed' && (
                  <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-4 animate-in fade-in">
                    <div className="flex items-center gap-2 font-bold text-xs text-purple-300">
                      <AlertTriangle className="w-4 h-4 text-purple-400" />
                      <span>Propuesta de Horario Alternativo:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">Nueva Fecha Propuesta</label>
                        <input
                          type="date"
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-300 block mb-1">Franja Horaria Propuesta</label>
                        <input
                          type="text"
                          placeholder="Ej: 16:00 - 17:00"
                          value={rescheduleTimeSlot}
                          onChange={(e) => setRescheduleTimeSlot(e.target.value)}
                          className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-300 block mb-1">Motivo de la Reprogramación</label>
                      <input
                        type="text"
                        placeholder="Ej: Convocatoria a reunión de presbiterio en el horario solicitado..."
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="w-full bg-[#070B14] border border-[#25282E] rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                {/* Aprobación para Publicación en Muro de Oración */}
                {selectedRequest.type === 'oracion' && selectedRequest.prayerDetails?.allowPublicWall && (
                  <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={approveForWall}
                        onChange={(e) => setApproveForWall(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                      />
                      <div className="text-xs">
                        <span className="font-semibold text-white block">
                          Aprobar y publicar en el Muro Congregacional de Oración
                        </span>
                        <span className="text-slate-400">
                          El miembro autorizó expresamente su publicación. Al marcar esta opción, aparecerá en el muro de intercesión.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                {/* Respuesta Visible para el Miembro */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-200 text-xs font-semibold block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C69A4B]" />
                      <span>Respuesta Visible para el Miembro</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Será visible en el perfil del miembro</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Escribe la respuesta o saludo pastoral que el miembro leerá en su perfil..."
                    value={publicResponse}
                    onChange={(e) => setPublicResponse(e.target.value)}
                    maxLength={2000}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              </div>
            )}

            {/* CONTENIDO 2: NOTAS INTERNAS CONFIDENCIALES */}
            {activeModalTab === 'notas' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-purple-300">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <span>Notas Internas de Seguimiento Pastoral (Estrictamente Privadas)</span>
                  </div>
                  <p className="text-purple-300/80">
                    Estas notas están reservadas <strong>exclusivamente para el equipo pastoral</strong>.
                    NUNCA son enviadas ni mostradas en el perfil del miembro bajo ninguna circunstancia.
                  </p>
                </div>

                {/* Listado de notas anteriores */}
                {selectedRequest.internalNotes && selectedRequest.internalNotes.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Notas:</p>
                    {selectedRequest.internalNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-xl bg-[#16191E] border border-[#25282E] space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-bold text-[#E5C378]">{note.authorName}</span>
                          <span>{new Date(note.createdAt).toLocaleString('es-ES')}</span>
                        </div>
                        <p className="text-white leading-relaxed whitespace-pre-line">{note.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic text-center py-4">
                    No se han registrado notas internas aún.
                  </p>
                )}

                {/* Formulario para agregar nueva nota */}
                <div className="space-y-2 pt-2 border-t border-[#25282E]">
                  <label className="text-slate-200 text-xs font-semibold block">
                    Registrar Nueva Nota Confidencial
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Registra observaciones sobre la cita, acuerdos o aspectos a orar en privado..."
                    value={newInternalNote}
                    onChange={(e) => setNewInternalNote(e.target.value)}
                    maxLength={1500}
                    className="w-full bg-[#16191E] border border-[#25282E] rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* CONTENIDO 3: AUDITORÍA & TRAZABILIDAD */}
            {activeModalTab === 'auditoria' && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Trazabilidad de Acciones Autorizadas:
                </p>

                {selectedRequest.auditLog && selectedRequest.auditLog.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedRequest.auditLog.map((entry, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-[#16191E] border border-[#25282E] flex items-start justify-between text-xs gap-3"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white capitalize">{entry.action}</span>
                            <span className="text-[10px] text-slate-400">por {entry.performedByName} ({entry.performedByRole})</span>
                          </div>
                          {entry.noteSummary && (
                            <p className="text-slate-300 text-[11px]">{entry.noteSummary}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(entry.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">Sin registros de auditoría.</p>
                )}
              </div>
            )}

            {/* Footer de Acciones del Modal */}
            <div className="pt-4 border-t border-[#25282E] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2.5 rounded-xl border border-[#25282E] text-slate-400 hover:text-white text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C69A4B] to-[#9E7A32] text-black font-bold text-xs shadow-lg hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando Cambios...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Guardar Actualizaciones</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
