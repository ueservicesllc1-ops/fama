'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mail,
  MailCheck,
  MailWarning,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  User,
  Phone,
  Calendar,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Send,
  Loader2,
  X,
  MessageSquare,
  Check,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { ContactMessage, ContactStatus, EmailDeliveryStatus } from '@/types/models';

interface ContactMessagesManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
  onUnreadCountChange?: (count: number) => void;
}

export const ContactMessagesManager: React.FC<ContactMessagesManagerProps> = ({
  onNotify,
  onUnreadCountChange,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, pending: 0, attended: 0 });

  // Filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ContactStatus>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Modal de detalle
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Obtener token del usuario
  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  // Cargar lista de mensajes
  const loadMessages = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/contacts', { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron cargar los mensajes.');
      }

      setMessages(data.messages || []);
      setStats(data.stats || { total: 0, unread: 0, pending: 0, attended: 0 });
      setGmailConfigured(!!data.gmailConfigured);
      if (onUnreadCountChange) {
        onUnreadCountChange(data.stats?.unread || 0);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar mensajes de contacto';
      onNotify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader, onNotify, onUnreadCountChange]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Actualizar estado de lectura o atención
  const handleUpdateStatus = async (
    msgId: string,
    updates: { isRead?: boolean; status?: ContactStatus }
  ) => {
    setActionLoading('updating-status');
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/contacts/${msgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo actualizar el mensaje.');
      }

      // Actualizar en el estado local
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ...data.message } : m))
      );
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage((prev) => (prev ? { ...prev, ...data.message } : null));
      }

      // Recalcular stats locales
      setStats((prev) => {
        const isNowRead = updates.isRead !== undefined ? updates.isRead : selectedMessage?.isRead;
        const wasRead = selectedMessage?.isRead;
        const unreadDelta = updates.isRead !== undefined ? (isNowRead ? (wasRead ? 0 : -1) : wasRead ? 1 : 0) : 0;
        return {
          ...prev,
          unread: Math.max(0, prev.unread + unreadDelta),
        };
      });

      onNotify?.('Mensaje actualizado correctamente', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el mensaje';
      onNotify?.(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Reintentar envío de correo
  const handleRetryEmail = async (msgId: string, target: 'visitor' | 'admin' | 'both') => {
    setActionLoading(`retry-${target}`);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/contacts/${msgId}/retry-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ target }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo reintentar el envío.');
      }

      // Actualizar mensaje en memoria
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ...data.message } : m))
      );
      if (selectedMessage && selectedMessage.id === msgId) {
        setSelectedMessage(data.message);
      }

      const visitorOk = data.results?.visitorResult?.success;
      const adminOk = data.results?.adminResult?.success;

      if (visitorOk || adminOk) {
        onNotify?.('Notificaciones por correo procesadas correctamente.', 'success');
      } else {
        const detail =
          data.results?.visitorResult?.error ||
          data.results?.adminResult?.error ||
          'Revisa las credenciales de Gmail en .env.local';
        onNotify?.(`Reintento ejecutado: ${detail}`, 'info');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al reintentar envío';
      onNotify?.(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Abrir modal y marcar como leído automáticamente
  const handleOpenDetail = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      handleUpdateStatus(msg.id, { isRead: true });
    }
  };

  // Filtrado de mensajes
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      // Filtro de estado
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      // Filtro de lectura
      if (readFilter === 'unread' && m.isRead) return false;
      if (readFilter === 'read' && !m.isRead) return false;
      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = m.name?.toLowerCase().includes(term);
        const matchesEmail = m.email?.toLowerCase().includes(term);
        const matchesSubject = m.subject?.toLowerCase().includes(term);
        const matchesMessage = m.message?.toLowerCase().includes(term);
        return matchesName || matchesEmail || matchesSubject || matchesMessage;
      }
      return true;
    });
  }, [messages, statusFilter, readFilter, searchTerm]);

  // Formateador de fechas
  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Fecha no registrada';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  // Badge de estado de mensaje
  const renderStatusBadge = (status: ContactStatus) => {
    switch (status) {
      case 'attended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Atendido
          </span>
        );
      case 'reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-500/30">
            <Clock className="w-3 h-3" /> En Revisión
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" /> Pendiente
          </span>
        );
    }
  };

  // Badge de entrega de correo
  const renderEmailBadge = (status?: EmailDeliveryStatus, label = 'Correo') => {
    switch (status) {
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            <MailCheck className="w-3 h-3 text-emerald-400" /> {label}: Enviado
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-950/60 text-rose-300 border border-rose-500/30">
            <MailWarning className="w-3 h-3 text-rose-400" /> {label}: Falló
          </span>
        );
      case 'not_configured':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <Mail className="w-3 h-3" /> {label}: Sin pasarela
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" /> {label}: Pendiente
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETAS DE MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Recibidos</span>
            <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.total}</span>
            <span className="text-[11px] text-slate-500">mensajes</span>
          </div>
        </div>

        {/* No leídos */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
            <span>No Leídos</span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-200">{stats.unread}</span>
            <span className="text-[11px] text-amber-300/70">por revisar</span>
          </div>
        </div>

        {/* Pendientes */}
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Pendientes</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{stats.pending}</span>
            <span className="text-[11px] text-slate-500">sin atender</span>
          </div>
        </div>

        {/* Atendidos */}
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Atendidos</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-300">{stats.attended}</span>
            <span className="text-[11px] text-slate-500">resueltos</span>
          </div>
        </div>
      </div>

      {/* AVISO DE ESTADO GMAIL */}
      <div
        className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          gmailConfigured
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {gmailConfigured ? (
            <MailCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <MailWarning className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-0.5">
            <p className="font-bold text-white">
              {gmailConfigured
                ? 'Pasarela Gmail SMTP de RENACER CHURCH: Conectada'
                : 'Pasarela Gmail SMTP: Pendiente de credenciales privadas'}
            </p>
            <p className="text-[11px] opacity-90">
              {gmailConfigured
                ? 'Los correos de confirmación al visitante y notificaciones al administrador se envían automáticamente al registrarse cada mensaje.'
                : 'Configura las variables GMAIL_USER, GMAIL_APP_PASSWORD y CONTACT_NOTIFICATION_EMAIL en .env.local para activar los envíos en tiempo real.'}
            </p>
          </div>
        </div>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#2E3E5B] transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Búsqueda */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, asunto o contenido..."
              className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro Estado */}
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ContactStatus)}
              className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Solo Pendientes</option>
              <option value="reviewed">Solo En Revisión</option>
              <option value="attended">Solo Atendidos</option>
            </select>
          </div>

          {/* Filtro Lectura */}
          <div className="md:col-span-3">
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as 'all' | 'unread' | 'read')}
              className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] transition-colors"
            >
              <option value="all">Leídos y No Leídos</option>
              <option value="unread">Solo No Leídos</option>
              <option value="read">Solo Leídos</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>
            Mostrando <strong>{filteredMessages.length}</strong> de <strong>{messages.length}</strong> mensajes
          </span>
          {(searchTerm || statusFilter !== 'all' || readFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setReadFilter('all');
              }}
              className="text-[#D4AF37] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* LISTADO DE MENSAJES */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando mensajes pastorales de contacto...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No se encontraron mensajes</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {messages.length === 0
                ? 'Aún no se han recibido formularios de contacto en la plataforma.'
                : 'No hay mensajes que coincidan con los filtros de búsqueda aplicados.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2D4A]">
            {filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleOpenDetail(msg)}
                className={`p-4 sm:p-5 hover:bg-[#141E33]/70 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !msg.isRead ? 'bg-[#18233C]/40 border-l-4 border-l-[#D4AF37]' : ''
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!msg.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#D4AF37]" title="No leído" />
                    )}
                    <span className="font-bold text-white text-sm">{msg.name}</span>
                    <span className="text-xs text-slate-400">&lt;{msg.email}&gt;</span>
                    {msg.phone && (
                      <span className="text-xs text-slate-400 font-mono">· {msg.phone}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-200 truncate">
                      {msg.subject || 'Sin asunto'}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-[11px] text-slate-400 capitalize">
                      {msg.category ? msg.category.replace('_', ' ') : 'General'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 font-light">{msg.message}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(msg.createdAt)}
                    </span>
                    <span className="text-slate-600">|</span>
                    {renderStatusBadge(msg.status)}
                    <span className="text-slate-600">|</span>
                    {renderEmailBadge(msg.confirmationEmailStatus, 'Visitante')}
                    {renderEmailBadge(msg.adminNotificationStatus, 'Admin')}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateStatus(msg.id, { isRead: !msg.isRead });
                    }}
                    className="p-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 hover:text-white text-xs transition-colors"
                    title={msg.isRead ? 'Marcar como no leído' : 'Marcar como leído'}
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE Y GESTIÓN */}
      {selectedMessage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="w-full max-w-2xl bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between gap-4 border-b border-[#1E2D4A] pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                    Folio: {selectedMessage.id}
                  </span>
                  {renderStatusBadge(selectedMessage.status)}
                </div>
                <h3 className="text-xl font-bold text-white">{selectedMessage.subject}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(selectedMessage.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos del Remitente */}
            <div className="rounded-2xl bg-[#141E33]/60 border border-[#2E3E5B]/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Nombre Completo</span>
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {selectedMessage.name}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Correo Electrónico</span>
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="font-semibold text-[#D4AF37] hover:underline flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {selectedMessage.email}
                </a>
              </div>

              {selectedMessage.phone && (
                <div className="space-y-1">
                  <span className="text-slate-400 text-[11px] block">Teléfono / WhatsApp</span>
                  <p className="font-semibold text-white flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {selectedMessage.phone}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-slate-400 text-[11px] block">Categoría de Consulta</span>
                <p className="font-semibold text-white flex items-center gap-1.5 capitalize">
                  <Tag className="w-3.5 h-3.5 text-blue-400" />
                  {selectedMessage.category
                    ? selectedMessage.category.replace('_', ' ')
                    : 'General'}
                </p>
              </div>
            </div>

            {/* Mensaje Completo */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Mensaje Recibido del Remitente:
              </span>
              <div className="rounded-2xl bg-[#141E33] border border-[#2E3E5B] p-5 text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-light">
                {selectedMessage.message}
              </div>
            </div>

            {/* Notificaciones por Correo & Reintentos */}
            <div className="rounded-2xl bg-[#141E33]/40 border border-[#2E3E5B]/40 p-4 space-y-3">
              <span className="text-xs font-bold text-white block">
                Estado de Notificaciones Automáticas (Gmail SMTP)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Visitante */}
                <div className="p-3 rounded-xl bg-[#0E1626] border border-[#1E2D4A] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Confirmación a Visitante</span>
                    {renderEmailBadge(selectedMessage.confirmationEmailStatus, 'Visitante')}
                  </div>
                  {selectedMessage.confirmationEmailError && (
                    <p className="text-[10px] text-rose-400 font-mono line-clamp-2">
                      Error: {selectedMessage.confirmationEmailError}
                    </p>
                  )}
                  <button
                    onClick={() => handleRetryEmail(selectedMessage.id, 'visitor')}
                    disabled={actionLoading !== null}
                    className="w-full mt-1 py-1.5 px-3 rounded-lg bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-[11px] font-semibold border border-[#2E3E5B] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading === 'retry-visitor' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Reintentar a Visitante</span>
                  </button>
                </div>

                {/* Administrador */}
                <div className="p-3 rounded-xl bg-[#0E1626] border border-[#1E2D4A] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Aviso a Admin Pastoral</span>
                    {renderEmailBadge(selectedMessage.adminNotificationStatus, 'Admin')}
                  </div>
                  {selectedMessage.adminNotificationError && (
                    <p className="text-[10px] text-rose-400 font-mono line-clamp-2">
                      Error: {selectedMessage.adminNotificationError}
                    </p>
                  )}
                  <button
                    onClick={() => handleRetryEmail(selectedMessage.id, 'admin')}
                    disabled={actionLoading !== null}
                    className="w-full mt-1 py-1.5 px-3 rounded-lg bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-[11px] font-semibold border border-[#2E3E5B] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading === 'retry-admin' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Reintentar a Admin</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Acciones de Estado Pastoral */}
            <div className="border-t border-[#1E2D4A] pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    handleUpdateStatus(selectedMessage.id, { isRead: !selectedMessage.isRead })
                  }
                  disabled={actionLoading !== null}
                  className="px-3.5 py-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#2E3E5B] transition-colors"
                >
                  {selectedMessage.isRead ? 'Marcar como No Leído' : 'Marcar como Leído'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedMessage.id, { status: 'reviewed' })}
                  disabled={actionLoading !== null || selectedMessage.status === 'reviewed'}
                  className="px-3.5 py-2 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-colors disabled:opacity-40"
                >
                  En Revisión
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedMessage.id, { status: 'attended' })}
                  disabled={actionLoading !== null || selectedMessage.status === 'attended'}
                  className="px-4 py-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marcar Atendido</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
