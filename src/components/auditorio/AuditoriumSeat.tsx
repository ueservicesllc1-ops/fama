'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Hand, UserCheck } from 'lucide-react';
import { LiveAttendee } from '@/types/models';

interface AuditoriumSeatProps {
  attendee: LiveAttendee;
  isCurrentUser?: boolean;
}

export const AuditoriumSeat: React.FC<AuditoriumSeatProps> = ({
  attendee,
  isCurrentUser = false,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center group cursor-pointer transition-all duration-200"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      {/* Indicador Flotante de Mano Levantada */}
      {attendee.isHandRaised && (
        <div className="absolute -top-6 z-20 animate-bounce">
          <div className="flex items-center gap-1 bg-gradient-to-r from-[#D4AF37] to-[#F3D079] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg shadow-[#D4AF37]/40">
            <Hand className="w-3 h-3 fill-black" />
            <span className="hidden sm:inline">Mano alzada</span>
          </div>
        </div>
      )}

      {/* Tooltip con Datos del Asistente */}
      {showTooltip && (
        <div className="absolute -top-12 z-30 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95">
          <div className="bg-[#0E1626] border border-[#D4AF37]/50 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl shadow-black/80 flex items-center gap-2 whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            <span className="font-semibold text-[#F3D079]">{attendee.displayName}</span>
            <span className="text-[10px] text-slate-400">
              (Fila {attendee.seatRow}, Asiento {attendee.seatNumber})
            </span>
            {isCurrentUser && (
              <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-1 py-0.5 rounded">
                Tú
              </span>
            )}
          </div>
          <div className="w-2 h-2 bg-[#0E1626] border-r border-b border-[#D4AF37]/50 transform rotate-45 mx-auto -mt-1"></div>
        </div>
      )}

      {/* Avatar del Asistente / Miembro sentado */}
      <div className="relative mb-[-8px] z-10">
        <div
          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full p-[2px] transition-all duration-300 ${
            isCurrentUser
              ? 'ring-2 ring-[#D4AF37] shadow-lg shadow-[#D4AF37]/40 scale-105'
              : attendee.isHandRaised
              ? 'ring-2 ring-[#F3D079] scale-105'
              : 'group-hover:scale-105 group-hover:ring-1 group-hover:ring-slate-400'
          }`}
          style={{
            background: isCurrentUser
              ? 'linear-gradient(135deg, #F3D079, #996515)'
              : attendee.isHandRaised
              ? 'linear-gradient(135deg, #D4AF37, #1E2D4A)'
              : 'linear-gradient(135deg, #1E2D4A, #0E1626)',
          }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden bg-[#141E33]">
            {attendee.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attendee.avatarUrl}
                alt={attendee.displayName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
                {attendee.displayName.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Punto Verde de Conexión en Vivo */}
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070B14]"
          title="Conectado en directo"
        />
      </div>

      {/* Estructura Visual de la Butaca de Auditorio */}
      <div className="w-11 sm:w-14 h-7 sm:h-9 bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#090D16] rounded-t-lg rounded-b-md border-t border-x border-[#334155] shadow-md flex flex-col justify-end p-1 transition-colors group-hover:border-[#D4AF37]/60">
        {/* Espaldar tapizado con textura */}
        <div className="w-full h-2 rounded-t-sm bg-[#162032] border-t border-slate-600/40"></div>
        {/* Cojín del asiento */}
        <div className="w-full h-3 rounded-sm bg-gradient-to-r from-[#111827] via-[#1E293B] to-[#111827]"></div>
      </div>

      {/* Nombre recortado bajo el asiento para pantallas grandes */}
      <span className="hidden sm:block text-[10px] text-slate-400 group-hover:text-white truncate max-w-[65px] text-center mt-1 font-medium">
        {isCurrentUser ? "Tú" : attendee.displayName.split(" ")[0]}
      </span>
    </div>
  );
};
