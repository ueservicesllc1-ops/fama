import React from 'react';
import { AuditoriumSeat } from './AuditoriumSeat';
import { LiveAttendee } from '@/types/models';

interface AuditoriumRowProps {
  rowNumber: number;
  attendees: LiveAttendee[];
  currentUserId?: string;
}

export const AuditoriumRow: React.FC<AuditoriumRowProps> = ({
  rowNumber,
  attendees,
  currentUserId,
}) => {
  return (
    <div className="relative flex items-center justify-center my-3 sm:my-4">
      {/* Etiqueta de la Fila (Izquierda) */}
      <div className="hidden md:flex items-center absolute -left-6 sm:left-2 lg:left-8 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        <span className="bg-[#0E1626] border border-[#1E2D4A] px-2 py-0.5 rounded text-[#D4AF37]">
          Fila {rowNumber}
        </span>
      </div>

      {/* Conjunto de Asientos con Curvatura Sutil */}
      <div className="flex items-center justify-center gap-2 sm:gap-3.5 lg:gap-5 px-2 overflow-x-auto max-w-full pb-2">
        {attendees.map((attendee) => (
          <AuditoriumSeat
            key={attendee.id}
            attendee={attendee}
            isCurrentUser={attendee.uid === currentUserId}
          />
        ))}
      </div>

      {/* Etiqueta de la Fila (Derecha) */}
      <div className="hidden md:flex items-center absolute -right-6 sm:right-2 lg:right-8 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
        <span className="bg-[#0E1626] border border-[#1E2D4A] px-2 py-0.5 rounded text-[#D4AF37]">
          Fila {rowNumber}
        </span>
      </div>
    </div>
  );
};
