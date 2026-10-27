'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Cloud,
  BookOpen,
  User,
  Calendar,
  Loader2,
  AlertCircle,
  Clock,
  Tv,
} from 'lucide-react';
import { Recording } from '@/types/models';
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  isValidYouTubeInput,
} from '@/lib/streaming/youtubeUtils';

interface VideoPlayerModalProps {
  recording: Recording | null;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ recording, onClose }) => {
  // 1. Detección y validación de Video de YouTube
  const ytCandidate =
    recording?.youtubeVideoId ||
    recording?.youtubeUrl ||
    (recording?.b2VideoUrl && isValidYouTubeInput(recording.b2VideoUrl)
      ? recording.b2VideoUrl
      : null);

  const ytVideoId = extractYouTubeVideoId(ytCandidate);
  const ytEmbedUrl = ytVideoId
    ? buildYouTubeEmbedUrl(ytVideoId, { autoplay: true, mute: false, controls: true })
    : null;

  // 2. Lógica para grabaciones directas o almacenadas en Backblaze B2
  const directUrl =
    !ytEmbedUrl && recording?.b2VideoUrl && !recording?.b2FileKey
      ? recording.b2VideoUrl
      : null;
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const playbackUrl = directUrl || fetchedUrl;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(85);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Obtener URL de reproducción autorizada (solo si NO es de YouTube)
  useEffect(() => {
    let mounted = true;
    if (
      !recording ||
      ytEmbedUrl ||
      (recording.b2VideoUrl && !recording.b2FileKey)
    ) {
      return;
    }

    const fetchPlaybackUrl = async () => {
      setIsLoadingUrl(true);
      setPlaybackError(null);

      try {
        const res = await fetch(`/api/recordings/${recording.id}/playback`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(
            json.error || 'No se pudo obtener la URL de reproducción autorizada.'
          );
        }
        const data = await res.json();
        if (mounted) {
          if (data.embedUrl) {
            // Caso donde el backend resolvió una URL incrustada
            setFetchedUrl(data.embedUrl);
          } else {
            setFetchedUrl(data.playbackUrl);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error cargando video';
        if (mounted) {
          setPlaybackError(msg);
        }
      } finally {
        if (mounted) {
          setIsLoadingUrl(false);
        }
      }
    };

    fetchPlaybackUrl();
    return () => {
      mounted = false;
    };
  }, [recording, ytEmbedUrl]);

  // Manejo de reproducción / pausa en video HTML5
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  // Manejo de volumen en video HTML5
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Manejo de pantalla completa
  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Adelantar / retroceder en la barra de progreso
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  if (!recording) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0E1626] border border-[#1E2D4A] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Barra Superior */}
        <div className="p-3 sm:p-4 bg-[#070B14] border-b border-[#1E2D4A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              FAMA Videoteca de Predicaciones
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-[#141E33] rounded-lg transition-colors"
            aria-label="Cerrar video"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================
            REPRODUCTOR DE VIDEO: YOUTUBE EMBED O HTML5 B2 NATIVO
           ======================================================== */}
        <div
          ref={containerRef}
          className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center select-none"
        >
          {/* CASO A: REPRODUCCIÓN MEDIANTE YOUTUBE */}
          {ytEmbedUrl ? (
            <div className="relative w-full h-full bg-black">
              <iframe
                src={ytEmbedUrl}
                title={recording.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0 select-auto"
              />
            </div>
          ) : isLoadingUrl ? (
            /* CASO B1: CARGANDO URL DE B2 */
            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              <p className="text-xs">Consultando archivo en Backblaze B2...</p>
            </div>
          ) : playbackUrl ? (
            /* CASO B2: ARCHIVO DIRECTO O PRESIGNED URL DE BACKBLAZE B2 */
            <div className="relative w-full h-full group flex items-center justify-center">
              <video
                ref={videoRef}
                src={playbackUrl}
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setCurrentTime(videoRef.current.currentTime);
                  }
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    setDuration(videoRef.current.duration);
                  }
                }}
                onWaiting={() => setIsBuffering(true)}
                onPlaying={() => setIsBuffering(false)}
                onError={() => {
                  setPlaybackError('Error al reproducir el archivo multimedia.');
                }}
                onClick={togglePlay}
                className="w-full h-full object-contain cursor-pointer"
              />

              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                  <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
                </div>
              )}

              {!isPlaying && !isBuffering && (
                <button
                  onClick={togglePlay}
                  className="absolute z-10 w-16 h-16 rounded-full bg-[#D4AF37] hover:bg-[#F3D079] text-black flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
                  aria-label="Reproducir"
                >
                  <Play className="w-7 h-7 fill-black ml-1" />
                </button>
              )}

              {/* Controles de video HTML5 */}
              <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col gap-2 text-xs text-white z-10 transition-opacity duration-200 group-hover:opacity-100 opacity-90 sm:opacity-0 sm:hover:opacity-100">
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setIsMuted(!isMuted)}>
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-red-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(Number(e.target.value));
                          if (isMuted) setIsMuted(false);
                        }}
                        className="w-16 h-1 bg-slate-700 rounded accent-[#D4AF37]"
                      />
                    </div>

                    <span className="text-[11px] text-slate-300 font-mono">
                      {formatDuration(currentTime)} / {formatDuration(duration || recording.durationMinutes * 60)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded border border-white/10 text-slate-300">
                      B2 Storage
                    </span>
                    <button onClick={toggleFullscreen} title="Pantalla completa">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CASO B3: SIN ARCHIVO DISPONIBLE */
            <div className="p-6 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#141E33] border border-[#1E2D4A] flex items-center justify-center text-slate-400">
                <AlertCircle className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  {recording.status === 'procesando' || recording.status === 'transfiriendo'
                    ? 'Grabación en proceso'
                    : 'Video no disponible'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  {playbackError ||
                    'La grabación aún no cuenta con un archivo o enlace de reproducción asignado.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Metadatos y Detalles de la Grabación */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">
                {recording.category} {recording.seriesTitle ? `• ${recording.seriesTitle}` : ''}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white">{recording.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                  {recording.preacher}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {recording.date}
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {recording.durationFormatted}
                </span>
                {recording.scriptureReference && (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    {recording.scriptureReference}
                  </span>
                )}
              </div>
            </div>

            {/* Aviso de Almacenamiento: YouTube o Backblaze B2 */}
            {ytEmbedUrl ? (
              <div className="bg-[#070B14] border border-[#1E2D4A] rounded-xl p-3 shrink-0 text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1.5 text-xs text-red-400 font-semibold">
                  <Tv className="w-3.5 h-3.5" />
                  <span>Alojado en YouTube</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  ID: {ytVideoId}
                </p>
              </div>
            ) : (
              <div className="bg-[#070B14] border border-[#1E2D4A] rounded-xl p-3 shrink-0 text-right space-y-0.5">
                <div className="flex items-center justify-end gap-1.5 text-xs text-cyan-400 font-semibold">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Backblaze B2 Storage</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">
                  Bucket: famaweb • us-east-005
                </p>
              </div>
            )}
          </div>

          <p className="text-sm text-slate-300 leading-relaxed border-t border-[#1E2D4A] pt-4">
            {recording.description}
          </p>

          {/* Tags */}
          {recording.tags && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-xs text-slate-500">Temas:</span>
              {recording.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[#141E33] text-slate-300 text-xs px-2.5 py-1 rounded-lg border border-[#1E2D4A]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
