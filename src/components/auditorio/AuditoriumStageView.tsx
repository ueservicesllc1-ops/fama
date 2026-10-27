'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  Heart,
  Info,
  MessageSquare,
  Maximize2,
  Tv,
  LayoutGrid,
} from 'lucide-react';
import { RealAttendee } from '@/lib/firebase/services/attendeesService';
import { Culto } from '@/types/models';
import { BroadcastScreen } from './BroadcastScreen';
import { AuditoriumNavesGrid } from './AuditoriumNavesGrid';
import { NaveId } from '@/data/auditorium275';

interface AuditoriumStageViewProps {
  culto: Culto | null;
  attendees: RealAttendee[];
  currentUserId?: string;
  isHandRaised: boolean;
  onToggleHand: () => void;
  onSendReaction: (emoji: string) => void;
  onOpenPrayerModal: () => void;
  onFocusChat: () => void;
  onOpenInfoModal: () => void;
}

const REACTIONS = [
  { label: 'Amén', emoji: '🙏' },
  { label: 'Amor', emoji: '❤️' },
  { label: 'Gloria a Dios', emoji: '🙌' },
  { label: 'Fuego Santo', emoji: '🔥' },
  { label: 'La Cruz', emoji: '✝️' },
];

export const AuditoriumStageView: React.FC<AuditoriumStageViewProps> = ({
  culto,
  attendees,
  currentUserId,
  isHandRaised,
  onToggleHand,
  onSendReaction,
  onOpenPrayerModal,
  onFocusChat,
  onOpenInfoModal,
}) => {
  const [selectedNave, setSelectedNave] = useState<'todas' | NaveId>('todas');
  const [viewMode, setViewMode] = useState<'panoramica' | 'escenario' | 'butacas'>('panoramica');
  const [showReactions, setShowReactions] = useState(false);
  const [showPrayer, setShowPrayer] = useState(false);

  // Mapeo eficiente de butaca -> participante real
  const attendeesMap = useMemo(() => {
    const map: Record<string, RealAttendee> = {};
    (attendees || []).forEach((att) => {
      if (att && att.seatId) {
        map[att.seatId] = att;
      }
    });
    return map;
  }, [attendees]);

  const dockBtn =
    'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-medium transition-colors hover:bg-[#141E33] hover:text-white sm:px-3 sm:py-2 text-xs select-none';

  return (
    <div className="relative w-full flex-1 flex flex-col select-none rounded-2xl border border-[#162032] bg-[#05080F] shadow-2xl overflow-hidden">
      
      {/* ========================================================
          BARRA SUPERIOR DE ENCABEZADO Y SELECTOR DE VISTA
         ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-[#080E1C] border-b border-[#18263F] text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold uppercase tracking-wider text-white">
            Auditorio Virtual FAMA
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-[#D4AF37] text-[11px] font-medium hidden sm:inline">
            Aforo 275 Butacas Dinámicas
          </span>
        </div>

        {/* Selector de modo de enfoque de pantalla */}
        <div className="flex items-center gap-1 bg-[#050912] p-1 rounded-xl border border-[#1A263D] text-[11px]">
          <button
            onClick={() => setViewMode('panoramica')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium ${
              viewMode === 'panoramica'
                ? 'bg-[#1E2D4A] text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista completa con escenario y butacas"
          >
            <Maximize2 className="w-3 h-3 text-[#D4AF37]" />
            <span className="hidden sm:inline">Panorámica</span>
          </button>

          <button
            onClick={() => setViewMode('escenario')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium ${
              viewMode === 'escenario'
                ? 'bg-[#1E2D4A] text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Enfoque en la transmisión del altar"
          >
            <Tv className="w-3 h-3 text-blue-400" />
            <span className="hidden sm:inline">Escenario</span>
          </button>

          <button
            onClick={() => setViewMode('butacas')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium ${
              viewMode === 'butacas'
                ? 'bg-[#1E2D4A] text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Enfoque en las 275 butacas digitales"
          >
            <LayoutGrid className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Butacas (275)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          ZONA SUPERIOR: ESCENARIO ARQUITECTÓNICO FAMA
          (Usa la imagen 'auditorium_stage_clean.jpg' estática y limpia)
         ======================================================== */}
      {viewMode !== 'butacas' && (
        <div className="relative w-full overflow-hidden bg-black aspect-[16/9] max-h-[460px] lg:max-h-[500px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/auditorium_stage_clean.jpg"
            alt="Escenario Auditorio FAMA"
            draggable={false}
            className="w-full h-full object-cover object-top pointer-events-none select-none"
          />

          {/* Área de transmisión real integrada en el centro del altar sin duplicar pantallas */}
          <div
            className="absolute z-10"
            style={{
              left: '50%',
              top: '12%',
              width: '38%',
              maxWidth: '480px',
              transform: 'translateX(-50%)',
            }}
          >
            <BroadcastScreen culto={culto} />
          </div>

          {/* Iluminación dorada ambiental sobre los escalones hacia el suelo */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#05080F] via-transparent to-transparent pointer-events-none" />
        </div>
      )}

      {/* ========================================================
          ZONA INFERIOR: SUELO DEL AUDITORIO Y 275 BUTACAS DIGITALES
         ======================================================== */}
      {viewMode !== 'escenario' && (
        <div className="relative w-full flex-1 bg-[#05080F]">
          <AuditoriumNavesGrid
            attendeesMap={attendeesMap}
            currentUserId={currentUserId}
            isHandRaised={isHandRaised}
            selectedNave={selectedNave}
            onSelectNave={setSelectedNave}
          />
        </div>
      )}

      {/* ========================================================
          DOCK FLOTANTE DE CONTROLES DEL CULTO
         ======================================================== */}
      <div className="sticky bottom-2 z-40 flex justify-center px-3 py-1 pointer-events-none">
        <div className="relative flex items-center gap-1 rounded-2xl border border-[#1E2D4A] bg-[#090F1C]/95 px-3 py-1.5 text-xs text-slate-200 shadow-2xl backdrop-blur-xl sm:gap-2 sm:px-4 sm:py-2 pointer-events-auto">
          {/* Botón de Mano Levantada */}
          <button
            onClick={onToggleHand}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-medium transition-all sm:gap-2 sm:px-3 sm:py-2 ${
              isHandRaised
                ? 'bg-[#E5C378] font-bold text-black shadow-lg shadow-[#E5C378]/40'
                : 'hover:bg-[#141E33] hover:text-white'
            }`}
          >
            <span className="text-sm">✋</span>
            <span className="hidden sm:inline">
              {isHandRaised ? 'Bajar la mano' : 'Levantar la mano'}
            </span>
          </button>

          {/* Menú de Reacciones Reales */}
          <div className="relative">
            <button onClick={() => setShowReactions((v) => !v)} className={dockBtn}>
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              <span className="hidden sm:inline">Reaccionar</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {showReactions && (
              <div className="absolute bottom-12 left-0 z-50 flex items-center gap-2 rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-2 shadow-2xl">
                {REACTIONS.map((r) => (
                  <button
                    key={r.label}
                    title={r.label}
                    onClick={() => {
                      onSendReaction(r.emoji);
                      setShowReactions(false);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-transform hover:scale-125 hover:bg-[#141E33]"
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menú de Petición de Oración */}
          <div className="relative">
            <button onClick={() => setShowPrayer((v) => !v)} className={dockBtn}>
              <span className="text-sm">🙏</span>
              <span className="hidden sm:inline">Oración</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {showPrayer && (
              <div className="absolute bottom-12 left-0 z-50 w-52 space-y-1 rounded-xl border border-[#1E2D4A] bg-[#0E1626] p-2 text-xs shadow-2xl">
                <button
                  onClick={() => {
                    onOpenPrayerModal();
                    setShowPrayer(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-slate-200 transition-colors hover:bg-[#141E33] hover:text-white"
                >
                  Redactar petición de oración
                </button>
                <button
                  onClick={() => {
                    onSendReaction('🙏');
                    setShowPrayer(false);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-slate-200 transition-colors hover:bg-[#141E33] hover:text-white"
                >
                  Decir Amén
                </button>
              </div>
            )}
          </div>

          {/* Botón de Chat */}
          <button onClick={onFocusChat} className={dockBtn} title="Abrir el chat">
            <MessageSquare className="h-4 w-4 text-slate-300" />
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* Botón de Información */}
          <button onClick={onOpenInfoModal} className={dockBtn} title="Información del culto">
            <Info className="h-4 w-4 text-slate-300" />
            <span className="hidden sm:inline">Información</span>
          </button>
        </div>
      </div>
    </div>
  );
};
