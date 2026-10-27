'use client';

import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Radio, Check, Sparkles, User } from 'lucide-react';
import { ChurchEvent } from '@/types/models';

interface EventCardProps {
  event: ChurchEvent;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const [registered, setRegistered] = useState(false);

  return (
    <div className="bg-[#0E1626] border border-[#1E2D4A] rounded-2xl overflow-hidden hover:border-[#D4AF37]/50 transition-all duration-300 shadow-xl flex flex-col justify-between">
      {/* Imagen del Evento */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#141E33]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={event.imageUrl || '/images/hero_worship.jpg'}
          alt={event.title || 'Evento Congregacional FAMA'}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1626] via-transparent to-transparent opacity-90" />

        {/* Categoría */}
        <div className="absolute top-3 left-3 bg-[#070B14]/90 text-[#F3D079] border border-[#D4AF37]/40 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm">
          {event.category}
        </div>

        {/* Transmisión en Vivo disponible */}
        {event.isOnline && (
          <div className="absolute top-3 right-3 bg-red-950/80 text-red-300 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span>Iglesia Virtual</span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37]">
            <Calendar className="w-3.5 h-3.5" />
            <span>{event.date}</span>
            <span className="text-slate-600">•</span>
            <Clock className="w-3.5 h-3.5" />
            <span>{event.time}</span>
          </div>

          <h3 className="text-lg font-bold text-white leading-tight">
            {event.title}
          </h3>

          <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
            {event.description}
          </p>
        </div>

        <div className="space-y-3 pt-3 border-t border-[#1E2D4A]/60">
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
            {event.speaker && (
              <div className="flex items-center gap-2 text-slate-400">
                <User className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="truncate">{event.speaker}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setRegistered(!registered)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
              registered
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-[#141E33] hover:bg-[#D4AF37] text-white hover:text-black border border-[#1E2D4A]'
            }`}
          >
            {registered ? (
              <>
                <Check className="w-4 h-4" />
                <span>Interés Registrado</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>Registrarme al Evento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
