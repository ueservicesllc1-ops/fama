'use client';

import React from 'react';
import { AuditoriumRow } from './AuditoriumRow';
import { LiveAttendee } from '@/types/models';
import { Sparkles, Info, Users } from 'lucide-react';

interface VirtualAuditoriumProps {
  attendees: LiveAttendee[];
  currentUserId?: string;
  isUserHandRaised: boolean;
}

export const VirtualAuditorium: React.FC<VirtualAuditoriumProps> = ({
  attendees,
  currentUserId = 'current-user',
  isUserHandRaised,
}) => {
  // Combinamos el estado interactivo del usuario actual con los datos del auditorio
  const dynamicAttendees = attendees.map((att) => {
    if (att.uid === currentUserId) {
      return {
        ...att,
        isHandRaised: isUserHandRaised,
      };
    }
    return att;
  });

  // Agrupamos por fila (1 a 4)
  const rows = [1, 2, 3, 4].map((rowNum) => ({
    rowNumber: rowNum,
    seats: dynamicAttendees.filter((att) => att.seatRow === rowNum),
  }));

  const totalSeats = attendees.length;
  const handsRaisedCount = dynamicAttendees.filter((a) => a.isHandRaised).length;

  return (
    <div className="w-full max-w-6xl mx-auto my-6 px-2 sm:px-4">
      {/* Contenedor del Auditorio con Perspectiva e Iluminación de Escenario */}
      <div className="relative bg-gradient-to-b from-[#0A101E] via-[#070B14] to-[#04060A] border border-[#1E2D4A] rounded-3xl p-4 sm:p-8 shadow-2xl overflow-hidden">
        
        {/* Iluminación de escenario que desciende desde la pantalla */}
        <div className="absolute top-0 left-1/4 right-1/4 h-28 bg-gradient-to-b from-blue-500/10 via-[#D4AF37]/5 to-transparent blur-2xl pointer-events-none" />
        
        {/* Barra superior de métricas del auditorio */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#1E2D4A]/70 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-white uppercase tracking-wider">
              Auditorio Virtual FAMA
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Plataforma Congregacional</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#0E1626] border border-[#1E2D4A] px-3 py-1 rounded-full text-slate-300">
              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{totalSeats} en butacas interactivas</span>
            </div>

            {handsRaisedCount > 0 && (
              <div className="flex items-center gap-1.5 bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-3 py-1 rounded-full text-[#F3D079]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{handsRaisedCount} manos alzadas</span>
              </div>
            )}
          </div>
        </div>

        {/* Indicador visual del púlpito / frente */}
        <div className="w-48 sm:w-72 h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent mx-auto mb-4 rounded-full" />
        <span className="block text-center text-[10px] uppercase font-bold tracking-[0.25em] text-slate-500 mb-6">
          ↑ PÚLPITO / PANTALLA PRINCIPAL ↑
        </span>

        {/* Filas de Butacas con distribución ordenada */}
        <div className="relative z-10 space-y-4">
          {rows.map(({ rowNumber, seats }) => (
            <AuditoriumRow
              key={rowNumber}
              rowNumber={rowNumber}
              attendees={seats}
              currentUserId={currentUserId}
            />
          ))}
        </div>

        {/* Barra de pie con aviso sobre arquitectura y datos */}
        <div className="relative z-10 mt-8 pt-4 border-t border-[#1E2D4A]/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
            <span>
              Butacas con avatares individuales y estado de conexión en vivo.
            </span>
          </div>
          <span className="text-[10px] text-slate-400 bg-[#0E1626] px-2 py-0.5 rounded border border-[#1E2D4A]">
            Datos de demostración aislados • Preparado para Firebase Firestore
          </span>
        </div>

      </div>
    </div>
  );
};
