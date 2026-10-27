'use client';

import React, { useMemo, useState } from 'react';
import {
  DigitalSeatDefinition,
  NaveId,
  NAVE_METRICS,
  SEATS_BY_NAVE,
} from '@/data/auditorium275';
import { RealAttendee } from '@/lib/firebase/services/attendeesService';
import { DigitalAuditoriumSeat } from './DigitalAuditoriumSeat';
import {
  Users,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface AuditoriumNavesGridProps {
  attendeesMap: Record<string, RealAttendee>;
  currentUserId?: string;
  isHandRaised?: boolean;
  selectedNave: 'todas' | NaveId;
  onSelectNave: (nave: 'todas' | NaveId) => void;
  className?: string;
}

export const AuditoriumNavesGrid: React.FC<AuditoriumNavesGridProps> = ({
  attendeesMap,
  currentUserId,
  isHandRaised = false,
  selectedNave,
  onSelectNave,
  className = '',
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredSeat, setHoveredSeat] = useState<{
    seat: DigitalSeatDefinition;
    attendee?: RealAttendee;
    x: number;
    y: number;
  } | null>(null);

  // Contadores por nave y global
  const metrics = useMemo(() => {
    let izq = 0;
    let cen = 0;
    let der = 0;

    Object.values(attendeesMap).forEach((att) => {
      if (att.nave === 'izquierda') izq++;
      else if (att.nave === 'central') cen++;
      else if (att.nave === 'derecha') der++;
    });

    const totalOccupied = izq + cen + der;
    const totalAvailable = NAVE_METRICS.totalCapacity - totalOccupied;

    return {
      izq,
      cen,
      der,
      totalOccupied,
      totalAvailable,
      capacity: NAVE_METRICS.totalCapacity,
    };
  }, [attendeesMap]);

  // Manejo de zoom
  const handleZoomIn = () => setZoom((z) => Math.min(1.4, Number((z + 0.15).toFixed(2))));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, Number((z - 0.15).toFixed(2))));
  const handleZoomReset = () => setZoom(1);

  // Renderizador de una nave específica (agrupada en sus 10 filas)
  const renderNaveSection = (naveId: NaveId, isFocusMode: boolean = false) => {
    const seats = SEATS_BY_NAVE[naveId];
    const naveLabel = NAVE_METRICS[naveId].label;
    const capacity = NAVE_METRICS[naveId].capacity;
    const occupiedCount =
      naveId === 'izquierda' ? metrics.izq : naveId === 'central' ? metrics.cen : metrics.der;

    // Agrupar filas de 1 a 10
    const rows: { row: number; seats: DigitalSeatDefinition[] }[] = [];
    for (let r = 1; r <= 10; r++) {
      rows.push({
        row: r,
        seats: seats.filter((s) => s.row === r),
      });
    }

    const seatSize = isFocusMode ? 'lg' : zoom < 0.9 ? 'sm' : 'md';

    return (
      <div
        key={naveId}
        className={`flex flex-col items-center rounded-2xl border transition-all duration-300 p-2 sm:p-3.5 bg-[#080E1C]/90 backdrop-blur-md ${
          selectedNave === naveId
            ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/50 shadow-[0_0_24px_rgba(212,175,55,0.18)]'
            : 'border-[#1E2E4A]/60 hover:border-[#2C4166]'
        }`}
      >
        {/* Cabecera de la Nave */}
        <div className="w-full flex items-center justify-between gap-2 px-1 mb-2.5 pb-1.5 border-b border-[#1A263D] text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedNave === naveId ? 'bg-[#D4AF37] animate-pulse' : 'bg-blue-400'
              }`}
            />
            <span className="tracking-wide uppercase text-[11px] sm:text-xs text-white">
              {naveLabel}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <span className="text-[#D4AF37] font-semibold">{occupiedCount}</span>
            <span>/</span>
            <span>{capacity}</span>
          </div>
        </div>

        {/* Indicador de cercanía al Altar */}
        <div className="w-full text-center text-[9px] uppercase font-bold tracking-[0.2em] text-[#D4AF37]/70 mb-2 flex items-center justify-center gap-1.5">
          <span>▲ FRENTE HACIA EL ALTAR (FILA 1) ▲</span>
        </div>

        {/* Filas de la Nave (Fila 1 a Fila 10) */}
        <div className="flex flex-col gap-1.5 sm:gap-2 w-full items-center">
          {rows.map(({ row, seats: rowSeats }) => (
            <div key={row} className="flex items-center gap-1 sm:gap-1.5">
              {/* Etiqueta lateral de fila */}
              <span className="w-4 sm:w-5 text-[8px] font-mono text-slate-500 text-right pr-0.5 select-none">
                F{row}
              </span>

              {/* Contenedor de butacas de la fila */}
              <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
                {rowSeats.map((seat) => {
                  const attendee = attendeesMap[seat.id];
                  const isCurrent = attendee?.uid === currentUserId;

                  return (
                    <DigitalAuditoriumSeat
                      key={seat.id}
                      seat={seat}
                      attendee={attendee}
                      isCurrentUser={isCurrent}
                      isHandRaised={isHandRaised}
                      size={seatSize}
                      onHover={(s, att, e) => {
                        if (e) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setHoveredSeat({
                            seat: s,
                            attendee: att,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          });
                        }
                      }}
                      onLeave={() => setHoveredSeat(null)}
                    />
                  );
                })}
              </div>

              {/* Etiqueta lateral derecha de fila */}
              <span className="w-4 sm:w-5 text-[8px] font-mono text-slate-500 text-left pl-0.5 select-none">
                F{row}
              </span>
            </div>
          ))}
        </div>

        {/* Indicador posterior de la nave */}
        <div className="w-full text-center text-[8px] text-slate-500 tracking-wider mt-2 pt-1 border-t border-[#162136]">
          PASILLO POSTERIOR (FILA 10)
        </div>
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col w-full ${className}`}>
      {/* ========================================================
          BARRA DE ESTADO DE AFORO Y NAVEGACIÓN POR NAVES
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-3 bg-[#070D1A]/95 border-b border-[#18263F] text-xs">
        {/* Contadores Reales de Aforo */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-[#0C1629] border border-[#1E2E4E] px-2.5 py-1 rounded-full text-slate-200">
            <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="font-bold text-white">{metrics.totalOccupied}</span>
            <span className="text-slate-400">/ {metrics.capacity} conectados</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 bg-[#0C1629] border border-[#1E2E4E] px-2.5 py-1 rounded-full text-slate-300 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>{metrics.totalAvailable} butacas libres</span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-[#0A1222] border border-[#18263F]">
              Izq: <strong className="text-white">{metrics.izq}</strong>/90
            </span>
            <span className="px-2 py-0.5 rounded bg-[#0A1222] border border-[#18263F]">
              Cen: <strong className="text-white">{metrics.cen}</strong>/95
            </span>
            <span className="px-2 py-0.5 rounded bg-[#0A1222] border border-[#18263F]">
              Der: <strong className="text-white">{metrics.der}</strong>/90
            </span>
          </div>
        </div>

        {/* Selector de Naves y Controles de Zoom */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Tabs de Selección de Nave */}
          <div className="flex items-center bg-[#0C1629] p-0.5 rounded-xl border border-[#1A263D] text-[11px]">
            <button
              onClick={() => onSelectNave('todas')}
              className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                selectedNave === 'todas'
                  ? 'bg-[#D4AF37] text-black font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Panorámica (275)
            </button>
            <button
              onClick={() => onSelectNave('izquierda')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                selectedNave === 'izquierda'
                  ? 'bg-[#D4AF37] text-black font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Izquierda (90)
            </button>
            <button
              onClick={() => onSelectNave('central')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                selectedNave === 'central'
                  ? 'bg-[#D4AF37] text-black font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Central (95)
            </button>
            <button
              onClick={() => onSelectNave('derecha')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                selectedNave === 'derecha'
                  ? 'bg-[#D4AF37] text-black font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Derecha (90)
            </button>
          </div>

          {/* Controles de Zoom */}
          <div className="hidden lg:flex items-center gap-1 bg-[#0C1629] p-0.5 rounded-xl border border-[#1A263D]">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-[#141F36]"
              title="Alejar vista"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="px-1.5 py-0.5 text-[10px] font-mono text-slate-300 hover:text-white rounded hover:bg-[#141F36]"
              title="Restablecer escala al 100%"
            >
              {(zoom * 100).toFixed(0)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-[#141F36]"
              title="Acercar vista"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          ZONA DE BUTACAS: 3 NAVES CON PASILLOS AL ALTAR
         ======================================================== */}
      <div className="w-full overflow-x-auto p-3 sm:p-5 flex justify-center items-start custom-scrollbar">
        <div
          className="transition-transform duration-200 origin-top flex flex-col items-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* LÍNEA GUÍA HACIA EL ALTAR */}
          <div className="w-full max-w-4xl flex items-center justify-center gap-3 mb-4">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-[#D4AF37]" />
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E1626] border border-[#D4AF37]/50 text-[#F3D079] text-[10px] font-bold uppercase tracking-widest shadow-lg">
              <Sparkles className="w-3 h-3 text-[#D4AF37]" />
              <span>DIRECCIÓN AL ALTAR Y ESCENARIO FAMA</span>
            </div>
            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#D4AF37]/40 to-[#D4AF37]" />
          </div>

          {/* VISTA EN TRES NAVES O NAVE INDIVIDUAL */}
          {selectedNave === 'todas' ? (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1.1fr_auto_1fr] gap-3 sm:gap-4 items-start max-w-[1400px]">
              {/* 1. NAVE IZQUIERDA (90 butacas) */}
              {renderNaveSection('izquierda', false)}

              {/* PASILLO IZQUIERDO */}
              <div className="hidden md:flex flex-col items-center justify-around h-full py-8 px-1 select-none">
                <div className="h-full w-[2px] bg-gradient-to-b from-[#D4AF37]/40 via-[#1E2E4A] to-transparent rounded" />
                <span className="my-2 [writing-mode:vertical-lr] rotate-180 text-[8px] uppercase tracking-[0.3em] text-[#D4AF37]/60 font-mono">
                  PASILLO IZQUIERDO
                </span>
                <div className="h-full w-[2px] bg-gradient-to-b from-[#1E2E4A] via-[#D4AF37]/40 to-transparent rounded" />
              </div>

              {/* 2. NAVE CENTRAL (95 butacas) - Ligeramente destacada */}
              {renderNaveSection('central', false)}

              {/* PASILLO DERECHO */}
              <div className="hidden md:flex flex-col items-center justify-around h-full py-8 px-1 select-none">
                <div className="h-full w-[2px] bg-gradient-to-b from-[#D4AF37]/40 via-[#1E2E4A] to-transparent rounded" />
                <span className="my-2 [writing-mode:vertical-lr] rotate-180 text-[8px] uppercase tracking-[0.3em] text-[#D4AF37]/60 font-mono">
                  PASILLO DERECHO
                </span>
                <div className="h-full w-[2px] bg-gradient-to-b from-[#1E2E4A] via-[#D4AF37]/40 to-transparent rounded" />
              </div>

              {/* 3. NAVE DERECHA (90 butacas) */}
              {renderNaveSection('derecha', false)}
            </div>
          ) : (
            /* VISTA DE NAVE INDIVIDUAL AMPLIFICADA */
            <div className="w-full max-w-3xl">
              {renderNaveSection(selectedNave, true)}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          TOOLTIP DINÁMICO DE BUTACA (HOVER)
         ======================================================== */}
      {hoveredSeat && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-[#0A101E]/95 border border-[#D4AF37] px-3 py-2 rounded-xl shadow-2xl text-xs text-white backdrop-blur-md flex flex-col gap-1 min-w-[150px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${hoveredSeat.x}px`,
            top: `${hoveredSeat.y - 8}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1 text-[10px]">
            <span className="text-[#D4AF37] font-bold font-mono">
              {hoveredSeat.seat.seatCode}
            </span>
            <span className="text-slate-400 capitalize">
              {hoveredSeat.seat.naveLabel}
            </span>
          </div>

          <div className="text-[11px]">
            Fila {hoveredSeat.seat.row} · Asiento {hoveredSeat.seat.col}
          </div>

          {hoveredSeat.attendee ? (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="font-semibold text-[#F3D079]">
                  {hoveredSeat.attendee.displayName}
                </span>
                <span className="text-[9px] text-slate-300">
                  {hoveredSeat.attendee.isHandRaised
                    ? '✋ Mano levantada'
                    : 'Participante en vivo'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
              <span>Butaca disponible</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
