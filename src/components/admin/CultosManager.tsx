'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Radio,
  Calendar,
  Clock,
  Plus,
  Play,
  Square,
  RefreshCw,
  Signal,
  ExternalLink,
  Film,
  Loader2,
  X,
  Tv,
  HelpCircle,
  Video,
  HardDrive,
  Check,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { Culto, CultoType } from '@/types/models';
import { extractYouTubeVideoId } from '@/lib/streaming/youtubeUtils';
import Link from 'next/link';

interface CultosManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const CultosManager: React.FC<CultosManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [cultos, setCultos] = useState<Culto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showObsHelp, setShowObsHelp] = useState(false);

  // Modal para nuevo culto
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPreacher, setNewPreacher] = useState('Pastor Luis Uchubanda');
  const [newType, setNewType] = useState<CultoType>('domingo_general');
  const [newDateTime, setNewDateTime] = useState('');
  const [newScripture, setNewScripture] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newYoutubeInput, setNewYoutubeInput] = useState('');

  // Modal para vincular YouTube Live a un culto existente
  const [editingCulto, setEditingCulto] = useState<Culto | null>(null);
  const [editYtInput, setEditYtInput] = useState('');
  const [isUpdatingYt, setIsUpdatingYt] = useState(false);

  // Obtener token del usuario para autenticar peticiones de servidor
  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  // Cargar cultos desde la API de administración
  const loadCultos = useCallback(async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/cultos', { headers });
      if (res.ok) {
        const data = await res.json();
        setCultos(data.cultos || []);
      }
    } catch (err) {
      console.error('[CultosManager] Error cargando cultos:', err);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (!user) {
        if (mounted) setLoading(false);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/admin/cultos', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && mounted) {
          const data = await res.json();
          setCultos(data.cultos || []);
        }
      } catch (err) {
        console.error('[CultosManager] Error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Manejo de acciones sobre un culto
  const handleAction = async (
    cultoId: string,
    action: 'preparar' | 'consultar_senial' | 'iniciar' | 'finalizar' | 'cancelar'
  ) => {
    setActionLoading(`${cultoId}-${action}`);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/cultos/${cultoId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al ejecutar la acción');
      }

      onNotify?.(data.message || `Acción '${action}' ejecutada correctamente.`, 'success');
      await loadCultos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      onNotify?.(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Crear nuevo culto
  const handleCreateCulto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDateTime) {
      onNotify?.('Por favor complete el título y la fecha programada.', 'error');
      return;
    }

    // Validar ID de YouTube si se introdujo
    let ytId: string | undefined = undefined;
    if (newYoutubeInput.trim()) {
      const extracted = extractYouTubeVideoId(newYoutubeInput);
      if (!extracted) {
        onNotify?.(
          'El formato del enlace o ID de YouTube Live no es válido. Introduzca un ID de 11 caracteres o URL de YouTube.',
          'error'
        );
        return;
      }
      ytId = extracted;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/cultos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          title: newTitle,
          preacher: newPreacher,
          type: newType,
          scheduledStartTime: newDateTime,
          scriptureReference: newScripture,
          description: newDescription,
          youtubeVideoId: ytId,
          youtubeUrl: newYoutubeInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al programar el culto');
      }

      onNotify?.('Culto programado exitosamente en Cloud Firestore.', 'success');
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewScripture('');
      setNewYoutubeInput('');
      await loadCultos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear culto';
      onNotify?.(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar vinculación de YouTube Live a un culto existente
  const handleSaveYoutubeLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCulto) return;

    let ytId: string | null = null;
    if (editYtInput.trim()) {
      const extracted = extractYouTubeVideoId(editYtInput);
      if (!extracted) {
        onNotify?.('El formato del enlace o ID de YouTube Live no es válido.', 'error');
        return;
      }
      ytId = extracted;
    }

    setIsUpdatingYt(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/cultos/${editingCulto.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          action: 'actualizar_youtube',
          youtubeVideoId: ytId,
          youtubeUrl: editYtInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al vincular YouTube Live');
      }

      onNotify?.(
        ytId
          ? 'YouTube Live vinculado exitosamente al culto.'
          : 'Se ha desvinculado la transmisión de YouTube.',
        'success'
      );
      setEditingCulto(null);
      setEditYtInput('');
      await loadCultos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar YouTube Live';
      onNotify?.(msg, 'error');
    } finally {
      setIsUpdatingYt(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ESTADO DEL PROVEEDOR Y GUÍA OBS STUDIO */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Transmisión con YouTube Live + OBS Studio</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-950/80 border-emerald-500/40 text-emerald-300">
                  Integración Activa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Emisión directa desde OBS Studio hacia YouTube. FAMA reproduce el directo en el Altar y almacena la grabación sin costos de proveedores externos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowObsHelp(!showObsHelp)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-[#1E2D4A] transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-[#D4AF37]" />
              <span>Instrucciones OBS</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs rounded-xl transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Culto</span>
            </button>
          </div>
        </div>

        {/* Guía Desplegable de Configuración para OBS Studio */}
        {showObsHelp && (
          <div className="pt-4 border-t border-[#1E2D4A] grid gap-3 sm:grid-cols-2 text-xs text-slate-300 bg-[#070B14]/80 p-4 rounded-xl border border-[#1E2D4A]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#D4AF37]">
                <Video className="w-4 h-4" />
                <span>1. Configuración de Emisión en OBS Studio</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  En <strong className="text-slate-200">YouTube Studio</strong>: Clic en <em>Crear &gt; Emitir en directo</em>.
                </li>
                <li>
                  Copie su <strong className="text-white">Clave de emisión</strong> personal desde YouTube Studio.
                </li>
                <li>
                  En <strong className="text-slate-200">OBS Studio</strong>: Abra <em>Ajustes &gt; Emisión</em>. Seleccione el servicio <em>YouTube - RTMPS</em> y pegue su clave.
                </li>
                <li className="text-amber-300/90 font-medium">
                  Nota de seguridad: Por protección, la clave de transmisión personal NUNCA se solicita ni almacena en FAMA.
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <HardDrive className="w-4 h-4" />
                <span>2. Grabación Local en Disco Duro</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                <li>
                  En <strong className="text-slate-200">OBS Studio</strong>: Abra <em>Ajustes &gt; General</em> o <em>Salida &gt; Grabando</em>.
                </li>
                <li>
                  Marque la casilla <strong className="text-white">&quot;Iniciar grabación automáticamente al transmitir&quot;</strong>.
                </li>
                <li>
                  OBS guardará una copia en alta calidad en su disco duro mientras transmite a YouTube.
                </li>
                <li>
                  Copie el ID o enlace de la transmisión de YouTube y péguelo en el culto correspondiente en FAMA.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* 2. LISTADO DE CULTOS */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Sesiones Congregacionales y Cultos
            </h3>
          </div>
          <button
            onClick={loadCultos}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Actualizar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-7 h-7 text-[#D4AF37] animate-spin" />
            <p className="text-xs">Consultando cultos en Cloud Firestore...</p>
          </div>
        ) : cultos.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-slate-400">
            <Calendar className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No hay cultos programados en el sistema.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2D4A]">
            {cultos.map((culto) => {
              const isLive = culto.status === 'en_vivo';
              const isPreparing = culto.status === 'preparando_transmision';
              const isEnded = culto.status === 'finalizado';
              const hasYoutube = Boolean(culto.youtubeVideoId);

              return (
                <div
                  key={culto.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#121B2F]/40 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{culto.title}</span>

                      {/* Estado del Culto */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isLive
                            ? 'bg-red-950/80 border border-red-500/50 text-red-300 animate-pulse'
                            : isPreparing
                              ? 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
                              : isEnded
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-blue-950/80 border border-blue-500/50 text-blue-300'
                        }`}
                      >
                        {culto.status.replace('_', ' ')}
                      </span>

                      {/* Badge de YouTube Live */}
                      {hasYoutube ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-red-950/50 border border-red-500/40 text-red-300 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-red-400" />
                          <span>YouTube: {culto.youtubeVideoId}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400">
                          Sin YouTube Live
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span>Predicador: <strong className="text-slate-200">{culto.preacher}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {new Date(culto.scheduledStartTime).toLocaleString('es-ES', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      {culto.recordingStatus && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-cyan-400">
                            <Film className="w-3.5 h-3.5" />
                            Grabación: {culto.recordingStatus}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acciones de Control de Transmisión */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Botón Vincular / Modificar YouTube */}
                    <button
                      onClick={() => {
                        setEditingCulto(culto);
                        setEditYtInput(culto.youtubeVideoId || culto.youtubeUrl || '');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E2D4A] bg-[#0E1626] hover:bg-[#141E33] text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                      title="Configurar ID de YouTube Live"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>{hasYoutube ? 'Editar YouTube' : 'Vincular YouTube'}</span>
                    </button>

                    {/* Botón Preparar */}
                    {culto.status === 'programado' && (
                      <button
                        onClick={() => handleAction(culto.id, 'preparar')}
                        disabled={actionLoading === `${culto.id}-preparar`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E2D4A] bg-[#0E1626] hover:bg-[#141E33] text-xs font-semibold text-amber-300 transition-colors"
                      >
                        <Signal className="w-3.5 h-3.5" />
                        <span>Preparar</span>
                      </button>
                    )}

                    {/* Botón Iniciar Transmisión En Vivo */}
                    {(culto.status === 'programado' || isPreparing) && (
                      <button
                        onClick={() => handleAction(culto.id, 'iniciar')}
                        disabled={actionLoading === `${culto.id}-iniciar`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Transmitir En Vivo</span>
                      </button>
                    )}

                    {/* Botón Finalizar */}
                    {isLive && (
                      <button
                        onClick={() => handleAction(culto.id, 'finalizar')}
                        disabled={actionLoading === `${culto.id}-finalizar`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-md"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                        <span>Finalizar Culto</span>
                      </button>
                    )}

                    {/* Ver en el Auditorio Virtual */}
                    <Link
                      href="/iglesia-virtual"
                      className="p-2 rounded-lg border border-[#1E2D4A] hover:bg-[#141E33] text-slate-300 hover:text-white transition-colors"
                      title="Ver en auditorio virtual"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MODAL VINCULAR YOUTUBE LIVE A UN CULTO EXISTENTE */}
      {editingCulto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-[#0E1626] border border-[#1E2D4A] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A] mb-4">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold text-white">Vincular YouTube Live</h3>
              </div>
              <button
                onClick={() => setEditingCulto(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3 font-semibold">
              Culto: <span className="text-white">{editingCulto.title}</span>
            </p>

            <form onSubmit={handleSaveYoutubeLive} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ID o Enlace de YouTube Live
                </label>
                <input
                  type="text"
                  value={editYtInput}
                  onChange={(e) => setEditYtInput(e.target.value)}
                  placeholder="ej: dQw4w9WgXcQ o https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  Pegue el enlace del directo programado en YouTube Studio o su identificador de 11 caracteres. Deje vacío para desvincular.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setEditingCulto(null)}
                  className="px-4 py-2 rounded-xl border border-[#1E2D4A] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingYt}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isUpdatingYt ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DE CREACIÓN DE CULTO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0E1626] border border-[#1E2D4A] rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2D4A] mb-4">
              <h3 className="text-base font-bold text-white">Programar Nuevo Culto</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCulto} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título de la Reunión *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="ej: Culto Dominical de Adoración & Palabra"
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Predicador / Pastor *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPreacher}
                    onChange={(e) => setNewPreacher(e.target.value)}
                    className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tipo de Culto
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as CultoType)}
                    className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="domingo_general">Domingo General</option>
                    <option value="miercoles_estudio">Miércoles de Estudio</option>
                    <option value="jovenes">Culto de Jóvenes</option>
                    <option value="oracion">Noche de Oración</option>
                    <option value="especial">Servicio Especial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Fecha y Hora Programadas *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={newDateTime}
                  onChange={(e) => setNewDateTime(e.target.value)}
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  ID o Enlace de YouTube Live (Opcional)
                </label>
                <input
                  type="text"
                  value={newYoutubeInput}
                  onChange={(e) => setNewYoutubeInput(e.target.value)}
                  placeholder="ej: dQw4w9WgXcQ o https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#D4AF37]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Puede vincularlo ahora o después de haber programado el directo en YouTube Studio.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Cita Bíblica Principal
                </label>
                <input
                  type="text"
                  value={newScripture}
                  onChange={(e) => setNewScripture(e.target.value)}
                  placeholder="ej: Romanos 8:28"
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Temática o propósito del culto..."
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#1E2D4A] text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Programar Culto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
