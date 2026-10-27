'use client';

import React, { useRef, useState, useEffect } from 'react';
import {
  Maximize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
  Signal,
} from 'lucide-react';
import { Culto } from '@/types/models';
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  isValidYouTubeInput,
} from '@/lib/streaming/youtubeUtils';

interface BroadcastScreenProps {
  culto: Culto | null;
  interactive?: boolean;
}

export const BroadcastScreen: React.FC<BroadcastScreenProps> = ({
  culto,
  interactive = true,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(85);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Detección y validación de señal de YouTube Live
  const ytCandidate =
    culto?.youtubeVideoId ||
    culto?.youtubeUrl ||
    (culto?.streamPlaybackUrl && isValidYouTubeInput(culto.streamPlaybackUrl)
      ? culto.streamPlaybackUrl
      : null);

  const ytVideoId = extractYouTubeVideoId(ytCandidate);
  const ytEmbedUrl = ytVideoId
    ? buildYouTubeEmbedUrl(ytVideoId, { autoplay: true, mute: false, controls: true })
    : null;

  // 2. Detección de stream nativo HLS / MP4
  const streamUrl = !ytEmbedUrl ? culto?.streamPlaybackUrl : null;

  const isLive =
    culto?.status === 'en_vivo' && Boolean(ytEmbedUrl || streamUrl);
  const isPreparing = culto?.status === 'preparando_transmision';

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

  // Sincronizar volumen con elemento de video nativo
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Manejo de reproducción / pausa en video nativo
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Reintento de conexión
  const handleRetry = () => {
    setHasError(false);
    setErrorMessage(null);
    setIsLoading(true);
    if (videoRef.current && streamUrl) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('No se pudo restablecer la conexión con la señal en directo.');
      });
    }
  };

  const ic = 'w-[3.4cqw] h-[3.4cqw]';
  const btn = 'text-white hover:text-[#E5C378] transition-colors focus:outline-none';

  return (
    <div
      ref={containerRef}
      style={{ containerType: 'inline-size' }}
      className="relative aspect-video w-full overflow-hidden rounded-[1.2cqw] border-[0.35cqw] border-[#2A3B5A] bg-[#03060B] shadow-[0_2cqw_5cqw_rgba(0,0,0,0.9),0_0_6cqw_rgba(229,195,120,0.2)]"
    >
      {/* ========================================================
          CASO 1A: TRANSMISIÓN EN VIVO MEDIANTE YOUTUBE LIVE (IFRAME OFICIAL)
         ======================================================== */}
      {isLive && ytEmbedUrl ? (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={ytEmbedUrl}
            title={culto?.title || 'Transmisión en directo de FAMA por YouTube Live'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0 select-auto"
          />
        </div>
      ) : isLive && streamUrl ? (
        /* ========================================================
            CASO 1B: SEÑAL REAL HLS / MP4 (REPRODUCTOR HTML5 NATIVO)
           ======================================================== */
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={streamUrl}
            autoPlay
            playsInline
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
              setErrorMessage('Señal interrumpida o fuera de línea.');
            }}
            className="w-full h-full object-contain"
          />

          {/* Estado de Carga / Buffering */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm gap-[1cqw]">
              <Loader2 className="w-[8cqw] h-[8cqw] text-[#D4AF37] animate-spin" />
              <span className="text-[2.2cqw] text-slate-200 font-semibold tracking-wider">
                Sintonizando señal en directo...
              </span>
            </div>
          )}

          {/* Estado de Error / Desconexión Real */}
          {hasError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/85 p-[4cqw] text-center gap-[2cqw]">
              <div className="w-[10cqw] h-[10cqw] rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center">
                <AlertCircle className="w-[5cqw] h-[5cqw] text-rose-400" />
              </div>
              <div className="space-y-[0.5cqw]">
                <h4 className="text-[3.2cqw] font-bold text-white">
                  Señal de transmisión no disponible
                </h4>
                <p className="text-[2cqw] text-slate-300 max-w-[60cqw]">
                  {errorMessage || 'Esperando reconexión del servidor de streaming...'}
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-[1cqw] px-[3cqw] py-[1.2cqw] bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-[2cqw] rounded-full transition-colors shadow-lg"
              >
                <RefreshCw className="w-[2.4cqw] h-[2.4cqw]" />
                <span>Reintentar conexión</span>
              </button>
            </div>
          )}

          {/* Insignia EN VIVO Real */}
          <div className="absolute left-[2.2cqw] top-[2.2cqw] flex items-center gap-[0.8cqw] rounded-full bg-[#DC2626] px-[1.8cqw] py-[0.6cqw] text-[2.2cqw] font-bold uppercase tracking-wider text-white shadow-lg z-10">
            <span className="h-[1.2cqw] w-[1.2cqw] animate-ping rounded-full bg-white" />
            EN VIVO
          </div>

          {/* Título y Predicador */}
          <div className="pointer-events-none absolute bottom-[8cqw] left-[3cqw] space-y-[0.4cqw] text-white z-10">
            <h2 className="text-[4.4cqw] font-extrabold leading-tight tracking-tight drop-shadow-md">
              {culto?.title || 'Culto General'}
            </h2>
            <p className="text-[2.4cqw] font-semibold text-slate-100">
              {culto?.preacher || 'Pastor Luis Uchubanda'}
            </p>
          </div>

          {/* Barra de Controles para stream nativo */}
          {interactive && (
            <div className="absolute inset-x-0 bottom-0 flex h-[7cqw] items-center justify-between bg-gradient-to-t from-black/95 to-transparent px-[2.4cqw] text-white z-10">
              <div className="flex items-center gap-[2.2cqw]">
                <button
                  onClick={togglePlay}
                  className={btn}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isPlaying ? (
                    <Pause className={`${ic} fill-white`} />
                  ) : (
                    <Play className={`${ic} fill-white`} />
                  )}
                </button>

                <div className="flex items-center gap-[1cqw]">
                  <button
                    onClick={() => setIsMuted((m) => !m)}
                    className={btn}
                    aria-label="Silenciar"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className={`${ic} text-red-400`} />
                    ) : (
                      <Volume2 className={ic} />
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
                    className="h-[0.6cqw] w-[10cqw] cursor-pointer rounded accent-[#E5C378]"
                    aria-label="Volumen"
                  />
                </div>
              </div>

              <div className="flex items-center gap-[2cqw] text-slate-300">
                <button onClick={toggleFullscreen} className={btn} title="Pantalla completa">
                  <Maximize2 className={ic} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : isPreparing ? (
        /* ========================================================
            CASO 2: PREPARANDO TRANSMISIÓN
           ======================================================== */
        <div className="h-full w-full flex flex-col items-center justify-center p-[4cqw] text-center bg-gradient-to-br from-[#070D18] via-[#040810] to-[#020306] relative">
          <div className="w-[10cqw] h-[10cqw] rounded-full bg-amber-950/60 border border-amber-500/40 flex items-center justify-center mb-[2cqw] shadow-xl">
            <Signal className="w-[5cqw] h-[5cqw] text-amber-400 animate-pulse" />
          </div>

          <span className="text-[1.8cqw] font-bold uppercase tracking-[0.25em] text-amber-400 mb-[0.8cqw]">
            Ajustando Señal de Transmisión
          </span>

          <h3 className="text-[3.8cqw] font-extrabold text-white mb-[1cqw]">
            {culto?.title || 'Culto Congregacional'}
          </h3>

          <p className="text-[2cqw] text-slate-300 max-w-[65cqw] leading-relaxed mb-[2cqw]">
            El equipo técnico y el pastor están preparando la transmisión en directo. La señal
            comenzará en unos momentos.
          </p>

          <div className="flex items-center gap-[1.5cqw] text-[1.8cqw] text-amber-300 bg-amber-950/40 px-[2.5cqw] py-[0.8cqw] rounded-full border border-amber-500/30">
            <Loader2 className="w-[2cqw] h-[2cqw] animate-spin" />
            <span>Verificando conexión con YouTube Live / Servidor de Streaming...</span>
          </div>
        </div>
      ) : (
        /* ========================================================
            CASO 3: PANTALLA DE ESPERA ELEGANTE (SIN TRANSMISIÓN ACTIVA)
           ======================================================== */
        <div className="h-full w-full flex flex-col items-center justify-center p-[4cqw] text-center bg-gradient-to-br from-[#070D18] via-[#040810] to-[#020306] relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,transparent_70%)] pointer-events-none" />

          <div className="w-[10cqw] h-[10cqw] rounded-full bg-[#111A2D] border border-[#223352] flex items-center justify-center mb-[2cqw] shadow-xl">
            <Radio className="w-[5cqw] h-[5cqw] text-[#D4AF37]" />
          </div>

          <span className="text-[1.8cqw] font-bold uppercase tracking-[0.25em] text-[#D4AF37] mb-[0.8cqw]">
            Auditorio Virtual FAMA
          </span>

          <h3 className="text-[3.8cqw] font-extrabold text-white mb-[1cqw]">
            {culto?.title || 'Próximo Culto Congregacional'}
          </h3>

          <p className="text-[2.2cqw] text-slate-200 font-medium max-w-[65cqw] leading-relaxed mb-[2cqw]">
            La transmisión estará disponible al iniciar el culto.
          </p>

          <div className="flex items-center gap-[3cqw] text-[1.8cqw] text-slate-400 bg-[#0B1324] px-[2.5cqw] py-[1cqw] rounded-full border border-[#1E2E4A]">
            <span className="flex items-center gap-[0.8cqw]">
              <Calendar className="w-[2.2cqw] h-[2.2cqw] text-[#D4AF37]" />
              {culto?.scheduledStartTime
                ? new Date(culto.scheduledStartTime).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'Horario Congregacional'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-[0.8cqw]">
              <Clock className="w-[2.2cqw] h-[2.2cqw] text-[#D4AF37]" />
              {culto?.scheduledStartTime
                ? new Date(culto.scheduledStartTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'En Vivo'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
