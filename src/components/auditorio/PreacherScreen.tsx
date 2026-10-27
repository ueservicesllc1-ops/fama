'use client';

import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Play,
  Pause,
  Radio,
  Clock,
  Calendar,
} from 'lucide-react';
import { Culto } from '@/types/models';

interface PreacherScreenProps {
  culto?: Culto | null;
  onOpenInfo?: () => void;
}

export const PreacherScreen: React.FC<PreacherScreenProps> = ({ culto, onOpenInfo }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const isLive = culto?.status === 'en_vivo';

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden bg-black border border-[#1E2D4A] shadow-2xl aspect-video group select-none"
    >
      {isLive ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={culto?.thumbnailUrl || "/images/preacher_stream_hd.jpg"}
            alt={culto?.title || "Transmisión en vivo FAMA"}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isPlaying ? "brightness-100" : "brightness-50"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none" />

          {/* Insignia EN VIVO */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>EN VIVO</span>
          </div>

          {/* Título */}
          <div className="absolute bottom-16 left-6 text-white space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold">{culto?.title || "Culto General"}</h3>
            <p className="text-sm text-slate-300">{culto?.preacher || "Pastor Luis Uchubanda"}</p>
          </div>

          {/* Barra de Controles */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsPlaying(!isPlaying)} className="hover:text-[#F3D079]">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={() => setIsMuted(!isMuted)} className="hover:text-[#F3D079]">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>
            <button onClick={toggleFullscreen} className="hover:text-[#F3D079]">
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#0A101E] to-[#04060A]">
          <Radio className="w-12 h-12 text-[#D4AF37] mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            {culto?.title || "Próximo Culto Congregacional"}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            {culto?.description || "La transmisión en directo se activará al iniciar la reunión."}
          </p>
          <span className="text-[11px] text-slate-300 bg-[#0E1626] border border-[#1E2D4A] px-3 py-1 rounded-full">
            {culto?.preacher || "Pastor Luis Uchubanda"}
          </span>
        </div>
      )}
    </div>
  );
};
