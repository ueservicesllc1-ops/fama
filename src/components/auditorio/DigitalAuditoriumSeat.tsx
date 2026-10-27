'use client';

import React from 'react';
import { DigitalSeatDefinition } from '@/data/auditorium275';
import { RealAttendee } from '@/lib/firebase/services/attendeesService';

interface DigitalAuditoriumSeatProps {
  seat: DigitalSeatDefinition;
  attendee?: RealAttendee;
  isCurrentUser?: boolean;
  isHandRaised?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (seat: DigitalSeatDefinition, attendee?: RealAttendee) => void;
  onHover?: (seat: DigitalSeatDefinition, attendee?: RealAttendee, e?: React.MouseEvent) => void;
  onLeave?: () => void;
}

export const DigitalAuditoriumSeat: React.FC<DigitalAuditoriumSeatProps> = ({
  seat,
  attendee,
  isCurrentUser = false,
  isHandRaised = false,
  size = 'md',
  onClick,
  onHover,
  onLeave,
}) => {
  const isOccupied = !!attendee;
  const hand = isCurrentUser ? isHandRaised : attendee?.isHandRaised;

  // Clases dimensionales según tamaño
  const sizeClasses = {
    sm: 'w-6 h-7 text-[9px]',
    md: 'w-8 h-9 text-[10px]',
    lg: 'w-10 h-11 text-xs',
  }[size];

  return (
    <div
      role="button"
      tabIndex={0}
      id={seat.id}
      aria-label={`Butaca ${seat.seatCode} ${isOccupied ? `ocupada por ${attendee.displayName}` : 'disponible'}`}
      onClick={() => onClick?.(seat, attendee)}
      onMouseEnter={(e) => onHover?.(seat, attendee, e)}
      onMouseLeave={() => onLeave?.()}
      className={`group relative flex flex-col items-center justify-center transition-all duration-200 select-none cursor-pointer focus:outline-none ${sizeClasses}`}
    >
      {/* Indicador flotante de Mano Levantada */}
      {hand && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 animate-bounce text-xs sm:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] filter"
          title="Mano levantada"
        >
          ✋
        </span>
      )}

      {/* RENDER BUTACA OCUPADA */}
      {isOccupied ? (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Respaldo sutil de la butaca detrás del avatar */}
          <div className="absolute inset-0 rounded-t-lg bg-[#0C1527] border border-[#233554] shadow-md" />

          {/* Avatar del participante real */}
          <div
            className={`relative z-10 w-[84%] h-[84%] rounded-full overflow-hidden flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 ${
              isCurrentUser
                ? 'ring-2 ring-[#E5C378] ring-offset-1 ring-offset-[#080D1A] shadow-[0_0_12px_rgba(229,195,120,0.8)]'
                : hand
                  ? 'ring-2 ring-[#E5C378]'
                  : 'ring-1 ring-[#3A5078]'
            }`}
          >
            {attendee.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attendee.photoURL}
                alt={attendee.displayName}
                loading="lazy"
                draggable={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1A2742] to-[#0D1526] flex items-center justify-center text-white">
                <span className="font-bold text-[#E5C378] tracking-wider text-[0.65em] uppercase">
                  {attendee.displayName.slice(0, 2)}
                </span>
              </div>
            )}

            {/* Punto verde de conexión activa en vivo */}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black shadow-sm" />
          </div>
        </div>
      ) : (
        /* RENDER BUTACA DISPONIBLE / VACÍA (Aspecto teatro Navy & Gold moderno) */
        <div className="relative w-full h-full flex flex-col items-center justify-between p-[2px] transition-transform duration-150 group-hover:-translate-y-0.5">
          {/* Respaldo de la butaca */}
          <div className="w-full h-[62%] rounded-t-md bg-gradient-to-b from-[#111C33] to-[#0A1120] border border-[#1E2E4E] group-hover:border-[#D4AF37]/70 group-hover:shadow-[0_0_8px_rgba(212,175,55,0.35)] transition-colors flex items-center justify-center">
            {/* Costura / acento dorado sutil */}
            <div className="w-[60%] h-[1px] bg-[#D4AF37]/25 group-hover:bg-[#D4AF37]/60 transition-colors" />
          </div>

          {/* Asiento / cojín inferior */}
          <div className="w-[88%] h-[32%] rounded-b-md bg-[#0C1527] border-x border-b border-[#1E2E4E] group-hover:border-[#D4AF37]/60 group-hover:bg-[#131F38] transition-colors flex items-center justify-center">
            <span className="text-[7px] text-slate-500 font-mono group-hover:text-[#D4AF37] transition-colors leading-none">
              {seat.col}
            </span>
          </div>

          {/* Reposabrazos izquierdo y derecho sutiles */}
          <div className="absolute left-0 top-[28%] bottom-[20%] w-[1.5px] bg-[#16223B] rounded-l" />
          <div className="absolute right-0 top-[28%] bottom-[20%] w-[1.5px] bg-[#16223B] rounded-r" />
        </div>
      )}
    </div>
  );
};
