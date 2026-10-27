'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Megaphone,
  Mail,
  Send,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Archive,
  Plus,
  Loader2,
  FileText,
  Lock,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  XCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import {
  InstitutionalAnnouncement,
  AnnouncementCategory,
  AnnouncementTarget,
  EmailBroadcastLog,
  UserRole,
} from '@/types/models';

interface CommunicationsManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type TabKey = 'comunicados' | 'redactar' | 'historial';

const CATEGORY_LABELS: Record<
  AnnouncementCategory,
  { label: string; badgeColor: string }
> = {
  general: {
    label: 'Informativo General',
    badgeColor: 'border-slate-500/40 bg-slate-800 text-slate-300',
  },
  eventos: {
    label: 'Aviso de Evento',
    badgeColor: 'border-blue-500/40 bg-blue-950/40 text-blue-300',
  },
  ministerios: {
    label: 'Grupos & Ministerios',
    badgeColor: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300',
  },
  pastoral: {
    label: 'Mensaje Pastoral',
    badgeColor: 'border-purple-500/40 bg-purple-950/40 text-purple-300',
  },
  urgente: {
    label: 'Aviso Urgente',
    badgeColor: 'border-rose-500/40 bg-rose-950/40 text-rose-300',
  },
};

const TARGET_LABELS: Record<AnnouncementTarget, string> = {
  all: 'Toda la Congregación',
  group: 'Grupo de Conexión Específico',
  ministry: 'Ministerio Específico',
  roles: 'Roles Seleccionados',
};

export const CommunicationsManager: React.FC<CommunicationsManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('comunicados');

  // Estados de datos
  const [announcements, setAnnouncements] = useState<InstitutionalAnnouncement[]>([]);
  const [broadcasts, setBroadcasts] = useState<EmailBroadcastLog[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [loadingBroadcasts, setLoadingBroadcasts] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AnnouncementCategory>('all');

  // Formulario de Redacción
  const [formData, setFormData] = useState<{
    title: string;
    message: string;
    category: AnnouncementCategory;
    targetAudience: AnnouncementTarget;
    targetRoles: UserRole[];
    targetGroupId: string;
    targetMinistryId: string;
    sendEmail: boolean;
    relatedUrl: string;
  }>({
    title: '',
    message: '',
    category: 'general',
    targetAudience: 'all',
    targetRoles: ['member', 'leader', 'pastor'],
    targetGroupId: '',
    targetMinistryId: '',
    sendEmail: false,
    relatedUrl: '',
  });

  // Vista Previa de Destinatarios
  const [audiencePreview, setAudiencePreview] = useState<{
    totalMatchedMembers: number;
    recipientsWithEmail: number;
    optedInForEmail: number;
    optedOutForEmail: number;
    previewNames: string[];
  } | null>(null);
  const [isCalculatingAudience, setIsCalculatingAudience] = useState(false);

  // Modales
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isConfirmSendModalOpen, setIsConfirmSendModalOpen] = useState(false);
  const [selectedAnnouncementDetail, setSelectedAnnouncementDetail] = useState<InstitutionalAnnouncement | null>(null);

  // Helper para headers
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Usuario no autenticado.');
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [user]);

  // Cargar Comunicados
  const loadAnnouncements = useCallback(async () => {
    if (!user) return;
    setLoadingAnnouncements(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/communications/announcements', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar comunicados.');
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error(err);
      onNotify?.('Error al cargar comunicados.', 'error');
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  // Cargar Historial de Envíos
  const loadBroadcasts = useCallback(async () => {
    if (!user) return;
    setLoadingBroadcasts(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/communications/broadcasts', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar historial de correos.');
      setBroadcasts(data.broadcasts || []);
    } catch (err) {
      console.error(err);
      onNotify?.('Error al cargar historial de correos.', 'error');
    } finally {
      setLoadingBroadcasts(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  useEffect(() => {
    loadAnnouncements();
    loadBroadcasts();
  }, [loadAnnouncements, loadBroadcasts]);

  // Calcular audiencia objetivo cuando cambia el target
  const calculateAudience = useCallback(async () => {
    if (!user) return;
    setIsCalculatingAudience(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/communications/preview-audience', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetAudience: formData.targetAudience,
          targetGroupId: formData.targetGroupId || undefined,
          targetMinistryId: formData.targetMinistryId || undefined,
          targetRoles: formData.targetRoles,
          category: formData.category,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAudiencePreview(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCalculatingAudience(false);
    }
  }, [user, getAuthHeaders, formData.targetAudience, formData.targetGroupId, formData.targetMinistryId, formData.targetRoles, formData.category]);

  useEffect(() => {
    if (activeTab === 'redactar') {
      calculateAudience();
    }
  }, [activeTab, calculateAudience]);

  // Enviar / Publicar Comunicado
  const handlePublish = async (asDraft = false) => {
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      onNotify?.('El título del comunicado debe tener al menos 3 caracteres.', 'error');
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 5) {
      onNotify?.('El cuerpo del comunicado debe tener al menos 5 caracteres.', 'error');
      return;
    }

    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/communications/announcements', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: formData.title.trim(),
          message: formData.message.trim(),
          category: formData.category,
          targetAudience: formData.targetAudience,
          targetRoles: formData.targetRoles,
          targetGroupId: formData.targetGroupId || undefined,
          targetMinistryId: formData.targetMinistryId || undefined,
          status: asDraft ? 'draft' : 'published',
          sendEmail: asDraft ? false : formData.sendEmail,
          relatedUrl: formData.relatedUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar el comunicado.');

      onNotify?.(
        asDraft
          ? 'Borrador guardado exitosamente.'
          : 'Comunicado publicado y notificaciones enviadas.',
        'success'
      );

      setIsConfirmSendModalOpen(false);
      setIsPreviewModalOpen(false);
      setFormData({
        title: '',
        message: '',
        category: 'general',
        targetAudience: 'all',
        targetRoles: ['member', 'leader', 'pastor'],
        targetGroupId: '',
        targetMinistryId: '',
        sendEmail: false,
        relatedUrl: '',
      });

      setActiveTab('comunicados');
      await loadAnnouncements();
      await loadBroadcasts();
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al publicar comunicado.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Archivar Comunicado
  const handleArchive = async (id: string) => {
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/communications/announcements/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'archived' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al archivar.');

      onNotify?.('Comunicado archivado. Se conserva en el historial.', 'success');
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      onNotify?.('Error al archivar el comunicado.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrado de comunicados
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
      return true;
    });
  }, [announcements, statusFilter, categoryFilter]);

  // Métricas KPI
  const stats = useMemo(() => {
    const published = announcements.filter((a) => a.status === 'published').length;
    const drafts = announcements.filter((a) => a.status === 'draft').length;
    const totalEmailsSent = broadcasts.reduce((acc, b) => acc + (b.acceptedBySmtpCount || 0), 0);
    const totalAttempted = broadcasts.reduce((acc, b) => acc + (b.totalRecipientsExpected || 0), 0);
    const acceptanceRate =
      totalAttempted > 0 ? Math.round((totalEmailsSent / totalAttempted) * 100) : 100;

    return { published, drafts, totalEmailsSent, acceptanceRate };
  }, [announcements, broadcasts]);

  return (
    <div className="space-y-6">
      {/* TARJETAS KPI SUPERIORES */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Publicados</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Megaphone className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.published}</span>
            <span className="text-[11px] text-slate-400">avisos activos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Notificaciones en plataforma</p>
        </div>

        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Borradores</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.drafts}</span>
            <span className="text-[11px] text-slate-400">por revisar</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Pendientes de publicación</p>
        </div>

        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Correos Despachados</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Mail className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.totalEmailsSent}</span>
            <span className="text-[11px] text-slate-400">mensajes</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Aceptados por Gmail SMTP</p>
        </div>

        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626]/80 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Aceptación SMTP</span>
            <div className="rounded-lg bg-[#E5C378]/10 p-2 text-[#E5C378]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.acceptanceRate}%</span>
            <span className="text-[11px] text-emerald-400">óptimo</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Sin rebotes masivos</p>
        </div>
      </div>

      {/* CONMUTADOR DE PESTAÑAS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1E2D4A] pb-3">
        <button
          onClick={() => setActiveTab('comunicados')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'comunicados'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <Megaphone className="h-4 w-4" />
          <span>Comunicados Institucionales</span>
        </button>

        <button
          onClick={() => setActiveTab('redactar')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'redactar'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Redactar Comunicado</span>
        </button>

        <button
          onClick={() => setActiveTab('historial')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'historial'
              ? 'bg-[#E5C378] text-black shadow-lg shadow-[#E5C378]/20'
              : 'border border-[#1E2D4A] bg-[#0E1626] text-slate-300 hover:bg-[#141E33] hover:text-white'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>Historial de Envíos & Auditoría</span>
          {broadcasts.length > 0 && (
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
              {broadcasts.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* PESTAÑA 1: LISTA DE COMUNICADOS INSTITUCIONALES               */}
      {/* ============================================================== */}
      {activeTab === 'comunicados' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-[#1E2D4A] bg-[#0E1626] px-3 py-1.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
              >
                <option value="all">Todos los Estados</option>
                <option value="published">Publicados</option>
                <option value="draft">Borradores</option>
                <option value="archived">Archivados</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="rounded-xl border border-[#1E2D4A] bg-[#0E1626] px-3 py-1.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
              >
                <option value="all">Todas las Categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setActiveTab('redactar')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-3.5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] transition-colors self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Comunicado</span>
            </button>
          </div>

          {loadingAnnouncements ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#E5C378]" />
              <p className="mt-2 text-xs text-slate-400">Cargando comunicados institucionales...</p>
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-12 text-center text-xs text-slate-400">
              <Megaphone className="mx-auto h-10 w-10 text-slate-500 mb-2 opacity-50" />
              <p className="font-semibold text-white">No se encontraron comunicados</p>
              <p className="mt-1">
                Utiliza el botón &quot;Nuevo Comunicado&quot; para redactar una notificación a los miembros.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnnouncements.map((a) => {
                const isPublished = a.status === 'published';
                const isDraft = a.status === 'draft';
                const isArchived = a.status === 'archived';

                return (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 sm:p-5 hover:border-[#E5C378]/40 transition-colors"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                              CATEGORY_LABELS[a.category]?.badgeColor ||
                              'border-slate-500 text-slate-300'
                            }`}
                          >
                            {CATEGORY_LABELS[a.category]?.label || a.category}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                              isPublished
                                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                                : isDraft
                                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                                : 'border-slate-700 bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isPublished ? 'Publicado' : isDraft ? 'Borrador' : 'Archivado'}
                          </span>

                          <span className="text-[11px] text-slate-400">
                            Audiencia: <strong className="text-slate-300">{TARGET_LABELS[a.targetAudience]}</strong>
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-white pt-1">{a.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap line-clamp-3">
                          {a.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedAnnouncementDetail(a)}
                          className="rounded-lg border border-[#1E2D4A] bg-[#141E33] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white"
                        >
                          Ver Detalle
                        </button>

                        {isPublished && (
                          <button
                            onClick={() => handleArchive(a.id)}
                            disabled={actionLoading}
                            className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-500 hover:text-amber-200"
                            title="Archivar sin borrar del historial"
                          >
                            Archivar
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Resumen de entregas */}
                    <div className="mt-4 pt-3 border-t border-[#1E2D4A] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        <span>📅 {a.publishDate}</span>
                        <span>Autor: {a.createdByName}</span>
                        {a.inAppRecipientsCount !== undefined && (
                          <span className="text-emerald-400 font-semibold">
                            ✓ {a.inAppRecipientsCount} notificaciones en app
                          </span>
                        )}
                      </div>

                      {a.emailSent && a.emailDeliverySummary && (
                        <div className="flex items-center gap-2 text-blue-300 font-semibold">
                          <Mail className="h-3.5 w-3.5" />
                          <span>
                            {a.emailDeliverySummary.acceptedBySmtp} correos aceptados por SMTP (
                            {a.emailDeliverySummary.skippedDueToPreferences} omitidos por preferencias)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 2: REDACTAR COMUNICADO Y VISTA PREVIA                 */}
      {/* ============================================================== */}
      {activeTab === 'redactar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulario de Redacción */}
          <div className="lg:col-span-7 rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[#E5C378]" />
              <span>Redacción de Comunicado</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Título del Comunicado *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="ej. Culto Especial de Primicias y Noche de Alabanza"
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3.5 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, category: e.target.value as AnnouncementCategory }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300">
                    Audiencia Destinataria
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        targetAudience: e.target.value as AnnouncementTarget,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3 py-2.5 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                  >
                    {Object.entries(TARGET_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Enlace Relacionado en la Plataforma (opcional)
                </label>
                <input
                  type="text"
                  value={formData.relatedUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, relatedUrl: e.target.value }))}
                  placeholder="ej. /eventos, /comunidad o /cultos"
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3.5 py-2 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300">
                  Cuerpo del Mensaje *
                </label>
                <textarea
                  rows={6}
                  value={formData.message}
                  onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Escribe el comunicado congregacional aquí..."
                  className="mt-1 w-full rounded-xl border border-[#1E2D4A] bg-[#141E33] p-3 text-xs text-white focus:border-[#E5C378] focus:outline-none"
                />
              </div>

              {/* Opción de Envío por Correo Gmail SMTP */}
              <div className="rounded-xl border border-[#1E2D4A] bg-[#141E33]/70 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sendEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, sendEmail: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-[#E5C378] text-[#E5C378] focus:ring-[#E5C378]"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-[#E5C378]" />
                      <span>Enviar además por Correo Electrónico (Gmail SMTP)</span>
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Se despachará de forma individual y controlada a las direcciones de correo de los miembros destinatarios que hayan autorizado esta categoría.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => handlePublish(true)}
                  disabled={actionLoading}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Guardar como Borrador
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5C378]/40 bg-[#E5C378]/15 px-4 py-2 text-xs font-bold text-[#E5C378] hover:bg-[#E5C378] hover:text-black transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Vista Previa</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmSendModalOpen(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>Publicar Comunicado</span>
                </button>
              </div>
            </div>
          </div>

          {/* Panel Lateral: Audiencia y Resumen de Impacto */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-5">
              <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-[#E5C378]" />
                <span>Impacto de Audiencia en Tiempo Real</span>
              </h4>

              {isCalculatingAudience ? (
                <div className="py-6 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#E5C378]" />
                  <p className="mt-2 text-xs text-slate-400">Verificando miembros en el servidor...</p>
                </div>
              ) : audiencePreview ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#141E33]">
                    <span className="text-slate-300">Total Miembros Destinatarios:</span>
                    <strong className="text-white font-mono text-sm">
                      {audiencePreview.totalMatchedMembers}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#141E33]">
                    <span className="text-slate-300">Correos válidos registrados:</span>
                    <strong className="text-blue-400 font-mono text-sm">
                      {audiencePreview.recipientsWithEmail}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-emerald-200">Recepción autorizada (Opt-in):</span>
                    <strong className="text-emerald-300 font-mono text-sm">
                      {audiencePreview.optedInForEmail}
                    </strong>
                  </div>

                  {audiencePreview.optedOutForEmail > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                      <span className="text-amber-200">Omitidos por preferencias:</span>
                      <strong className="text-amber-300 font-mono text-sm">
                        {audiencePreview.optedOutForEmail}
                      </strong>
                    </div>
                  )}

                  {audiencePreview.previewNames.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Ejemplo de destinatarios:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {audiencePreview.previewNames.map((name, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-[#141E33] px-2 py-0.5 text-[10px] text-slate-300"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No se pudo estimar la audiencia.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PESTAÑA 3: HISTORIAL DE ENVÍOS & AUDITORÍA SMTP               */}
      {/* ============================================================== */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#E5C378]" />
                <span>Auditoría de Envíos de Correo Gmail SMTP</span>
              </h3>
              <p className="text-xs text-slate-400">
                Registro inmutable de difusiones realizadas, respuestas de aceptación del servidor SMTP y filtros de preferencia.
              </p>
            </div>
          </div>

          {loadingBroadcasts ? (
            <div className="p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#E5C378]" />
              <p className="mt-2 text-xs text-slate-400">Cargando registros de auditoría...</p>
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-12 text-center text-xs text-slate-400">
              <Mail className="mx-auto h-10 w-10 text-slate-500 mb-2 opacity-50" />
              <p className="font-semibold text-white">No se han realizado envíos de correo masivo</p>
              <p className="mt-1">
                Los registros de difusiones aparecerán aquí con el detalle de entrega SMTP.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 sm:p-5 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1E2D4A] pb-3">
                    <div>
                      <h4 className="font-bold text-white text-sm">{b.subject}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Iniciado: {new Date(b.startedAt).toLocaleString()} · Autor: {b.authorName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        ✓ {b.acceptedBySmtpCount} Aceptados SMTP
                      </span>
                      {b.skippedCount > 0 && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                          {b.skippedCount} Omitidos
                        </span>
                      )}
                      {b.failedCount > 0 && (
                        <span className="rounded-full border border-rose-500/40 bg-rose-950/40 px-2.5 py-0.5 text-[10px] font-bold text-rose-300">
                          {b.failedCount} Fallidos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-slate-400 font-semibold mb-2">
                      Registro de entrega individual ({b.recipientsLog.length} destinatarios):
                    </p>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-[#1E2D4A] bg-[#0A101D] p-2 space-y-1">
                      {b.recipientsLog.map((log, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] py-1 px-2 rounded hover:bg-[#141E33]"
                        >
                          <span className="font-mono text-slate-300">{log.recipientEmail}</span>
                          <span
                            className={`font-semibold ${
                              log.status === 'accepted_by_smtp'
                                ? 'text-emerald-400'
                                : log.status === 'skipped_preference'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {log.status === 'accepted_by_smtp'
                              ? 'Aceptado SMTP'
                              : log.status === 'skipped_preference'
                              ? 'Omitido por preferencia'
                              : 'Fallo entrega'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VISTA PREVIA DEL COMUNICADO                            */}
      {/* ============================================================== */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#E5C378]" />
                <span>Vista Previa del Comunicado</span>
              </h3>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-[#282B33] bg-[#17191C] p-5 shadow-inner">
              <span className="inline-block rounded-full bg-[#E5C378]/20 border border-[#E5C378]/40 px-2.5 py-0.5 text-[10px] font-bold text-[#E5C378] uppercase mb-2">
                {CATEGORY_LABELS[formData.category]?.label || formData.category}
              </span>
              <h4 className="text-lg font-black text-white">{formData.title || 'Título del Comunicado'}</h4>
              <p className="mt-0.5 text-[10px] text-slate-400">RENACER CHURCH — Plataforma Digital FAMA</p>

              <div className="mt-4 text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                {formData.message || 'Cuerpo del mensaje institucional...'}
              </div>

              {formData.relatedUrl && (
                <div className="mt-5 text-center">
                  <span className="inline-block rounded-full bg-[#C69A4B] px-5 py-2 text-xs font-bold text-black shadow-md">
                    Ver en la Plataforma ({formData.relatedUrl})
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-xl bg-[#E5C378] px-4 py-2 text-xs font-bold text-black hover:bg-[#F3D079]"
              >
                Cerrar Vista Previa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRMACIÓN EXPLÍCITA DE ENVÍO MASIVO                 */}
      {/* ============================================================== */}
      {isConfirmSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-[#E5C378]/40 bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-[#E5C378]">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Confirmar Publicación y Difusión</h3>
            </div>

            <p className="mt-3 text-xs text-slate-300 leading-relaxed">
              Estás por publicar el comunicado{' '}
              <strong className="text-white">&quot;{formData.title}&quot;</strong>.
            </p>

            <div className="mt-3 rounded-xl border border-[#1E2D4A] bg-[#141E33] p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Notificaciones en app:</span>
                <strong className="text-white">
                  {audiencePreview?.totalMatchedMembers ?? 0} miembros
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Envío por correo:</span>
                <strong className={formData.sendEmail ? 'text-blue-400' : 'text-slate-500'}>
                  {formData.sendEmail
                    ? `${audiencePreview?.optedInForEmail ?? 0} correos a despachar`
                    : 'Desactivado'}
                </strong>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3 border-t border-[#1E2D4A] pt-4">
              <button
                type="button"
                onClick={() => setIsConfirmSendModalOpen(false)}
                className="rounded-xl border border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handlePublish(false)}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Confirmar y Enviar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DETALLE DEL COMUNICADO                                 */}
      {/* ============================================================== */}
      {selectedAnnouncementDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2D4A] pb-3">
              <h3 className="text-base font-bold text-white">Detalle del Comunicado</h3>
              <button
                onClick={() => setSelectedAnnouncementDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Título:</span>
                <p className="text-white font-bold text-sm">{selectedAnnouncementDetail.title}</p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">Mensaje:</span>
                <p className="text-slate-200 bg-[#141E33] p-3 rounded-xl whitespace-pre-wrap leading-relaxed">
                  {selectedAnnouncementDetail.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400">Categoría:</span>{' '}
                  <strong className="text-white">{selectedAnnouncementDetail.category}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Audiencia:</span>{' '}
                  <strong className="text-white">{TARGET_LABELS[selectedAnnouncementDetail.targetAudience]}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Fecha Publicación:</span>{' '}
                  <strong className="text-white">{selectedAnnouncementDetail.publishDate}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Estado:</span>{' '}
                  <strong className="text-white uppercase">{selectedAnnouncementDetail.status}</strong>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedAnnouncementDetail(null)}
                className="rounded-xl border border-[#1E2D4A] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-[#141E33]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
