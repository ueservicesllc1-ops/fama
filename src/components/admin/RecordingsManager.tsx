'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Film,
  Cloud,
  Plus,
  RefreshCw,
  Eye,
  FileVideo,
  Clock,
  Calendar,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { Recording, RecordingVisibility } from '@/types/models';
import { fetchRecordingsFromFirestore } from '@/lib/firebase/services/contentService';
import { extractYouTubeVideoId } from '@/lib/streaming/youtubeUtils';
import Link from 'next/link';

const YouTubeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

interface RecordingsManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const RecordingsManager: React.FC<RecordingsManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de nueva grabación
  const [title, setTitle] = useState('');
  const [preacher, setPreacher] = useState('Pastor Luis Uchubanda');
  const [category, setCategory] = useState<'Domingos' | 'Estudio Bíblico' | 'Jóvenes' | 'Series Especiales'>('Domingos');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [description, setDescription] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [b2FileKey, setB2FileKey] = useState('');
  const [visibility, setVisibility] = useState<RecordingVisibility>('publica');

  // Estado del bucket B2
  const [b2Info] = useState({
    bucketName: 'famaweb',
    endpoint: 's3.us-east-005.backblazeb2.com',
  });

  const loadRecordings = useCallback(async () => {
    try {
      const data = await fetchRecordingsFromFirestore();
      setRecordings(data);
    } catch (err) {
      console.error('[RecordingsManager] Error cargando grabaciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const data = await fetchRecordingsFromFirestore();
        if (mounted) {
          setRecordings(data);
        }
      } catch (err) {
        console.error('[RecordingsManager] Error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const handleCreateRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanYtId = extractYouTubeVideoId(youtubeInput);
    if (!cleanYtId && !b2FileKey.trim()) {
      onNotify?.('Debes proporcionar un enlace/ID de YouTube o una clave de archivo en Backblaze B2.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // Registrar metadatos en Firestore mediante endpoint de servidor
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          preacher,
          category,
          date,
          durationMinutes: Number(durationMinutes),
          durationFormatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
          description,
          youtubeVideoId: cleanYtId || undefined,
          youtubeUrl: youtubeInput.trim() || undefined,
          b2FileKey: b2FileKey.trim() || undefined,
          status: 'disponible',
          visibility,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error registrando grabación.');
      }

      onNotify?.('Grabación registrada exitosamente.', 'success');
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setYoutubeInput('');
      setB2FileKey('');
      await loadRecordings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      onNotify?.(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. ESTADO DE BACKBLAZE B2 */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Almacenamiento Multimedia Backblaze B2</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-cyan-950/80 border-cyan-500/40 text-cyan-300">
                Bucket Oficial: {b2Info.bucketName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Endpoint S3: <code className="text-slate-300">{b2Info.endpoint}</code> (us-east-005)
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs rounded-xl transition-colors shadow-lg self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Vincular Grabación</span>
        </button>
      </div>

      {/* 2. CATÁLOGO DE GRABACIONES EN FIRESTORE */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Grabaciones & Predicaciones Almacenadas
            </h3>
          </div>
          <button
            onClick={loadRecordings}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Recargar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-7 h-7 text-[#D4AF37] animate-spin" />
            <p className="text-xs">Consultando catálogo en Firestore y B2...</p>
          </div>
        ) : recordings.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-slate-400">
            <FileVideo className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No hay grabaciones registradas en el sistema.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2D4A]">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#121B2F]/40 transition-colors"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white truncate">{rec.title}</span>
                    {rec.youtubeVideoId ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-red-950/60 border-red-500/40 text-red-300 inline-flex items-center gap-1">
                        <YouTubeIcon className="w-3 h-3" /> YouTube
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-cyan-950/60 border-cyan-500/40 text-cyan-300 inline-flex items-center gap-1">
                        <Cloud className="w-3 h-3" /> B2 S3
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        rec.status === 'disponible'
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : rec.status === 'procesando' || rec.status === 'transfiriendo'
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {rec.status}
                    </span>
                    <span className="text-[10px] bg-[#141E33] px-2 py-0.5 rounded text-slate-300 border border-[#1E2D4A]">
                      {rec.visibility}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span>{rec.preacher}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {rec.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {rec.durationFormatted}
                    </span>
                    {rec.youtubeVideoId && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-red-400 flex items-center gap-1">
                          <YouTubeIcon className="w-3 h-3" /> ID: {rec.youtubeVideoId}
                        </span>
                      </>
                    )}
                    {rec.b2FileKey && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[11px] text-cyan-400 truncate max-w-xs flex items-center gap-1">
                          <Cloud className="w-3 h-3" /> {rec.b2FileKey}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/predicaciones"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E2D4A] hover:bg-[#141E33] text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Ver en Videoteca</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. MODAL REGISTRAR GRABACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0E1626] border border-[#1E2D4A] rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2D4A] mb-4">
              <h3 className="text-base font-bold text-white">Registrar o Vincular Grabación</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecording} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título de la Predicación *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ej: El Poder de la Resurrección"
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Predicador *</label>
                  <input
                    type="text"
                    required
                    value={preacher}
                    onChange={(e) => setPreacher(e.target.value)}
                    className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as
                          | 'Domingos'
                          | 'Estudio Bíblico'
                          | 'Jóvenes'
                          | 'Series Especiales'
                      )
                    }
                    className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Domingos">Domingos</option>
                    <option value="Estudio Bíblico">Estudio Bíblico</option>
                    <option value="Jóvenes">Jóvenes</option>
                    <option value="Series Especiales">Series Especiales</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Fecha del Culto *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duración (minutos)</label>
                  <input
                    type="number"
                    min={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Opción 1: YouTube (Recomendado) */}
              <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <YouTubeIcon className="w-4 h-4 text-red-500" />
                    <span>ID o Enlace de YouTube</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-semibold bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Recomendado (Sin costos)
                  </span>
                </div>
                <input
                  type="text"
                  value={youtubeInput}
                  onChange={(e) => setYoutubeInput(e.target.value)}
                  placeholder="ej: https://www.youtube.com/watch?v=... o ID de 11 caracteres"
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-400 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Compatible con transmisiones grabadas en YouTube o videos subidos (públicos o no listados).
                </p>
              </div>

              {/* Opción 2: Backblaze B2 (Antiguas) */}
              <div className="p-3.5 rounded-xl bg-[#090F1C] border border-[#1E2D4A] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    <span>Clave en Backblaze B2</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    MP4 / HLS Legacy
                  </span>
                </div>
                <input
                  type="text"
                  value={b2FileKey}
                  onChange={(e) => setB2FileKey(e.target.value)}
                  placeholder="ej: grabaciones/2026/culto-2026-10-22.mp4"
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Visibilidad</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as RecordingVisibility)}
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="publica">Pública (Disponible para todos los visitantes)</option>
                  <option value="miembros">Miembros (Requiere inicio de sesión)</option>
                  <option value="privada">Privada (Solo líderes y administradores)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#070B14] border border-[#1E2D4A] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                    <span>Guardar Grabación</span>
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
