'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Loader2,
  Shield,
  Sliders,
  Check,
  Smartphone,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { AppNotification, UserCommunicationPreferences } from '@/types/models';
import { urlBase64ToUint8Array } from '@/lib/pwa/pwaUtils';

interface NotificationsCenterProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
  showPreferences?: boolean;
}

const CATEGORY_STYLES: Record<string, { label: string; badge: string }> = {
  general: { label: 'General', badge: 'bg-slate-800 text-slate-300 border-slate-700' },
  eventos: { label: 'Eventos', badge: 'bg-blue-950/60 text-blue-300 border-blue-500/40' },
  ministerios: { label: 'Comunidad', badge: 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' },
  pastoral: { label: 'Pastoral', badge: 'bg-purple-950/60 text-purple-300 border-purple-500/40' },
  urgente: { label: 'Urgente', badge: 'bg-rose-950/60 text-rose-300 border-rose-500/40' },
  sistema: { label: 'Sistema', badge: 'bg-amber-950/60 text-amber-300 border-amber-500/40' },
};

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  onNotify,
  showPreferences = true,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Preferencias
  const [preferences, setPreferences] = useState<UserCommunicationPreferences>({
    emailEventReminders: true,
    emailMinistryAnnouncements: true,
    emailGeneralNews: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Estado de Web Push (PWA)
  const [pushSupported, setPushSupported] = useState(false);
  const [pushActive, setPushActive] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushLoading, setPushLoading] = useState(false);

  // Comprobar compatibilidad y suscripción existente
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);

      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setPushActive(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Helper para headers
  const getAuthHeaders = useCallback(async () => {
    if (!user) throw new Error('Usuario no autenticado.');
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, [user]);

  // Cargar Notificaciones
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/member/notifications', { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar avisos.');

      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error(err);
      onNotify?.('Error al cargar notificaciones.', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders, onNotify]);

  // Cargar Preferencias
  const loadPreferences = useCallback(async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/member/preferences', { headers });
      const data = await res.json();
      if (res.ok && data.preferences) {
        setPreferences(data.preferences);
      }
    } catch (err) {
      console.error(err);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    loadNotifications();
    if (showPreferences) {
      loadPreferences();
    }
  }, [loadNotifications, loadPreferences, showPreferences]);

  // Marcar como leída
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/member/notifications/${id}/read`, {
        method: 'PATCH',
        headers,
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Marcar todas como leídas
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setActionLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/member/notifications/mark-all-read', {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        onNotify?.('Todas las notificaciones marcadas como leídas.', 'success');
      }
    } catch (err) {
      console.error(err);
      onNotify?.('Error al actualizar notificaciones.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Guardar Preferencias de Comunicación
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/member/preferences', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(preferences),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar.');

      onNotify?.('Preferencias de comunicación actualizadas.', 'success');
    } catch (err: unknown) {
      console.error(err);
      onNotify?.(err instanceof Error ? err.message : 'Error al guardar preferencias.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  // Activar o desactivar notificaciones push del sistema operativo
  const handleTogglePush = async () => {
    if (!user || !pushSupported) return;
    setPushLoading(true);

    const vapidKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BGIgq5whj4UGQmzx8gxd2Rb0kt7wpo9Xet33o0QX9Bq4aRHfOEjcgmJkWEYNO-i61FcRd8Gn3oBGIkJVXt_BceM';

    try {
      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();

      if (existingSub) {
        // Desactivar
        const endpoint = existingSub.endpoint;
        await existingSub.unsubscribe();
        const headers = await getAuthHeaders();
        await fetch('/api/member/push-subscription', {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ endpoint }),
        });
        setPushActive(false);
        onNotify?.('Notificaciones push desactivadas en este dispositivo.', 'info');
      } else {
        // Activar: solicitar permiso de forma explícita por clic del usuario
        const permission = await Notification.requestPermission();
        setPushPermission(permission);
        if (permission !== 'granted') {
          onNotify?.('Permiso para notificaciones no concedido por el navegador.', 'error');
          setPushLoading(false);
          return;
        }

        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        });

        const headers = await getAuthHeaders();
        const res = await fetch('/api/member/push-subscription', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            subscription: newSub.toJSON(),
          }),
        });

        if (res.ok) {
          setPushActive(true);
          onNotify?.('¡Notificaciones push activadas con éxito en este dispositivo!', 'success');
        } else {
          throw new Error('No se pudo registrar la suscripción en el servidor.');
        }
      }
    } catch (err: unknown) {
      console.error('[NotificationsCenter] Error en push:', err);
      const msg = err instanceof Error ? err.message : 'Error al gestionar notificaciones push.';
      onNotify?.(msg, 'error');
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* SECCIÓN 1: NOTIFICACIONES DEL MIEMBRO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#1E2D4A] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5C378]/15 text-[#E5C378]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Centro de Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-[#E5C378] px-2 py-0.5 text-[10px] font-bold text-black">
                    {unreadCount} nuevas
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Avisos institucionales, eventos y actualizaciones dirigidas a tu cuenta.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1E2D4A] bg-[#141E33] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:text-white transition-colors self-start sm:self-auto"
            >
              <CheckCheck className="h-4 w-4 text-[#E5C378]" />
              <span>Marcar todas como leídas</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#E5C378]" />
            <p className="mt-2 text-xs text-slate-400">Cargando tus notificaciones...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#1E2D4A] p-12 text-center text-xs text-slate-400">
            <Bell className="mx-auto h-10 w-10 text-slate-500 mb-2 opacity-50" />
            <p className="font-semibold text-white">No tienes notificaciones pendientes</p>
            <p className="mt-1">
              Aquí aparecerán las confirmaciones de eventos, avisos de comunidad y notas pastorales.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const style = CATEGORY_STYLES[n.category] || CATEGORY_STYLES.general;

              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && handleMarkAsRead(n.id)}
                  className={`group relative rounded-2xl border p-4 sm:p-5 transition-all ${
                    !n.read
                      ? 'border-[#E5C378]/40 bg-[#0E1626] shadow-lg shadow-[#E5C378]/5'
                      : 'border-[#1E2D4A]/60 bg-[#0A101D]/80 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${style.badge}`}
                        >
                          {style.label}
                        </span>

                        {!n.read && (
                          <span className="flex items-center gap-1 rounded-full bg-[#E5C378] px-2 py-0.5 text-[9px] font-black text-black animate-pulse">
                            Nueva
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">
                          {new Date(n.createdAt).toLocaleDateString([], {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white pt-1">{n.title}</h4>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {n.message}
                      </p>

                      {n.relatedUrl && (
                        <div className="pt-2">
                          <Link
                            href={n.relatedUrl}
                            onClick={() => !n.read && handleMarkAsRead(n.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5C378] hover:underline"
                          >
                            <span>Ver detalles relacionados</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {!n.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(n.id, e)}
                        className="rounded-lg bg-[#141E33] p-1.5 text-slate-400 hover:text-[#E5C378] shrink-0"
                        title="Marcar como leída"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN 2: PREFERENCIAS DE COMUNICACIÓN INSTITUCIONAL */}
      {showPreferences && (
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-[#1E2D4A] pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Preferencias de Comunicación</h4>
              <p className="text-xs text-slate-400">
                Elige qué tipo de correos informativos deseas recibir de RENACER CHURCH.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="space-y-3 text-xs">
              {/* Recordatorios de Eventos */}
              <label className="flex items-start gap-3 rounded-xl border border-[#1E2D4A] bg-[#141E33]/50 p-3.5 cursor-pointer hover:border-[#E5C378]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.emailEventReminders}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      emailEventReminders: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#1E2D4A] text-[#E5C378] focus:ring-[#E5C378]"
                />
                <div>
                  <span className="block font-bold text-white">
                    Recordatorios de Eventos Congregacionales
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Avisos por correo sobre cultos especiales, conferencias y actividades en las que te hayas inscrito.
                  </span>
                </div>
              </label>

              {/* Avisos de Ministerios y Grupos */}
              <label className="flex items-start gap-3 rounded-xl border border-[#1E2D4A] bg-[#141E33]/50 p-3.5 cursor-pointer hover:border-[#E5C378]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.emailMinistryAnnouncements}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      emailMinistryAnnouncements: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#1E2D4A] text-[#E5C378] focus:ring-[#E5C378]"
                />
                <div>
                  <span className="block font-bold text-white">
                    Avisos de Grupos de Conexión y Ministerios
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Notificaciones de líderes sobre reuniones de grupos pequeños y áreas de servicio.
                  </span>
                </div>
              </label>

              {/* Boletín General */}
              <label className="flex items-start gap-3 rounded-xl border border-[#1E2D4A] bg-[#141E33]/50 p-3.5 cursor-pointer hover:border-[#E5C378]/30 transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.emailGeneralNews}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      emailGeneralNews: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#1E2D4A] text-[#E5C378] focus:ring-[#E5C378]"
                />
                <div>
                  <span className="block font-bold text-white">
                    Boletín Informativo y Novedades Pastorales
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-0.5">
                    Cartas pastorales, devocionales y anuncios generales de la congregación.
                  </span>
                </div>
              </label>
            </div>

            {/* Aviso de Seguridad No Desactivable */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-200 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Aviso de Seguridad:</strong> Las alertas críticas de seguridad, restablecimiento de contraseña y confirmaciones inmediatas de tus solicitudes son esenciales y permanecen siempre activas para proteger tu cuenta.
              </span>
            </div>

            {/* Notificaciones Push del Sistema Operativo (PWA) */}
            <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Smartphone className="w-4 h-4 text-[#E5C378]" />
                  <span>Notificaciones Push del Sistema Operativo (PWA)</span>
                </div>
                {pushSupported && (
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
                      pushActive
                        ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                        : pushPermission === 'denied'
                        ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {pushActive
                      ? 'Activas en este Dispositivo'
                      : pushPermission === 'denied'
                      ? 'Bloqueadas en Navegador'
                      : 'Inactivas en este Dispositivo'}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Recibe avisos inmediatos en la pantalla de bloqueo y barra de notificaciones de tu teléfono o computadora cuando se publiquen cultos en vivo o comunicados urgentes.
              </p>

              {!pushSupported ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-[11px] text-slate-400">
                  Tu navegador actual no tiene soporte para la API Web Push. Las notificaciones internas dentro de la plataforma continúan 100% operativas.
                </div>
              ) : pushPermission === 'denied' ? (
                <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-[11px] text-rose-300 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Las notificaciones fueron bloqueadas en la configuración del navegador. Para habilitarlas, accede a los permisos de sitio de tu navegador y autoriza las notificaciones para FAMA.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Certificado VAPID institucional configurado</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePush}
                    disabled={pushLoading}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      pushActive
                        ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40'
                        : 'bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] shadow-md shadow-[#C69A4B]/20'
                    }`}
                  >
                    {pushLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Procesando...</span>
                      </>
                    ) : pushActive ? (
                      <span>Desactivar en este Dispositivo</span>
                    ) : (
                      <span>Activar Notificaciones Push</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingPrefs}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E5C378] px-5 py-2 text-xs font-bold text-black hover:bg-[#F3D079] disabled:opacity-50 transition-colors"
              >
                {savingPrefs && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Guardar Preferencias</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
