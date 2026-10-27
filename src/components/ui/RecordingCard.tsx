'use client';

import React from 'react';
import { Play, Clock, Calendar, User, BookOpen } from 'lucide-react';
import { Recording } from '@/types/models';

interface RecordingCardProps {
  recording: Recording;
  onSelect?: (recording: Recording) => void;
}

export const RecordingCard: React.FC<RecordingCardProps> = ({ recording, onSelect }) => {
  return (
    <div
      onClick={() => onSelect && onSelect(recording)}
      className="group bg-[#0E1626] border border-[#1E2D4A] rounded-2xl overflow-hidden hover:border-[#D4AF37]/60 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-2xl hover:shadow-[#D4AF37]/10 cursor-pointer flex flex-col justify-between"
    >
      {/* Contenedor Miniatura */}
      <div className="relative aspect-video w-full overflow-hidden bg-[#141E33]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={recording.thumbnailUrl || '/images/auditorium_stage_clean.jpg'}
          alt={recording.title || 'Predicación FAMA'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1626] via-transparent to-transparent opacity-80" />

        {/* Botón Play Superpuesto */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37] text-black flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-[#F3D079] transition-all duration-200">
            <Play className="w-5 h-5 fill-black ml-0.5" />
          </div>
        </div>

        {/* Duración */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/85 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-sm">
          <Clock className="w-3 h-3 text-[#D4AF37]" />
          <span>{recording.durationFormatted || 'En diferido'}</span>
        </div>

        {/* Categoría */}
        <div className="absolute top-2.5 left-2.5 bg-[#070B14]/90 text-[#F3D079] border border-[#D4AF37]/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-sm">
          {recording.category || 'Mensaje'}
        </div>
      </div>

      {/* Contenido / Metadatos */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {recording.seriesTitle && (
            <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider block">
              Serie: {recording.seriesTitle}
            </span>
          )}

          <h3 className="text-base font-bold text-white group-hover:text-[#F3D079] transition-colors line-clamp-2 leading-snug">
            {recording.title || 'Sin título'}
          </h3>

          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {recording.description || 'Mensaje de la Palabra de Dios.'}
          </p>
        </div>

        <div className="pt-3 border-t border-[#1E2D4A]/60 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <User className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="truncate max-w-[140px]">{recording.preacher || 'FAMA'}</span>
          </span>

          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Calendar className="w-3 h-3" />
            <span>{recording.date ? String(recording.date).split(',')[0] : ''}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
