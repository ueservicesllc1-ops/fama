'use client';

import React, { useState } from 'react';
import {
  Hand,
  Smile,
  MessageSquare,
  HeartHandshake,
  Info,
  Check
} from 'lucide-react';

interface CultoControlsProps {
  isHandRaised: boolean;
  onToggleHand: () => void;
  onSendReaction: (reaction: string) => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  onOpenPrayerModal: () => void;
  onOpenInfoModal: () => void;
}

export const CultoControls: React.FC<CultoControlsProps> = ({
  isHandRaised,
  onToggleHand,
  onSendReaction,
  isChatOpen,
  onToggleChat,
  onOpenPrayerModal,
  onOpenInfoModal,
}) => {
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const reactionsList = [
    { label: 'Amén / Oración', emoji: '🙏' },
    { label: 'Amor de Cristo', emoji: '❤️' },
    { label: 'Gloria a Dios', emoji: '🙌' },
    { label: 'Fuego Santo', emoji: '🔥' },
    { label: 'La Cruz', emoji: '✝️' },
  ];

  const handleSelectReaction = (emoji: string) => {
    onSendReaction(emoji);
    setShowReactionsMenu(false);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 px-4">
      <div className="relative bg-[#0A101E]/95 backdrop-blur-xl border border-[#1E2D4A] rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 flex flex-wrap items-center justify-between gap-2">
        
        {/* GRUPO 1: Levantar la Mano */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleHand}
            className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 ${
              isHandRaised
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3D079] text-black shadow-lg shadow-[#D4AF37]/30 ring-2 ring-[#F3D079]'
                : 'bg-[#141E33] text-slate-200 hover:text-white hover:bg-[#1E2D4A] border border-[#1E2D4A]'
            }`}
            title="Levanta tu mano para participar o unirte a la ministración"
          >
            <Hand className={`w-4 h-4 ${isHandRaised ? 'fill-black stroke-black' : ''}`} />
            <span>{isHandRaised ? 'Mano Levantada' : 'Levantar Mano'}</span>
            {isHandRaised && (
              <span className="w-2 h-2 rounded-full bg-emerald-700 animate-ping"></span>
            )}
          </button>

          {/* Menú de Reacciones */}
          <div className="relative">
            <button
              onClick={() => setShowReactionsMenu(!showReactionsMenu)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 hover:text-white border border-[#1E2D4A] transition-colors"
            >
              <Smile className="w-4 h-4 text-[#F3D079]" />
              <span className="hidden sm:inline">Reaccionar</span>
            </button>

            {showReactionsMenu && (
              <div className="absolute bottom-14 left-0 z-30 bg-[#0E1626] border border-[#1E2D4A] rounded-2xl p-2 shadow-2xl flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2">
                {reactionsList.map((item) => (
                  <button
                    key={item.emoji}
                    onClick={() => handleSelectReaction(item.emoji)}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:scale-125 hover:bg-[#141E33] rounded-xl transition-all duration-150"
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* GRUPO 2: Chat, Peticiones e Info */}
        <div className="flex items-center gap-2">
          {/* Botón Chat */}
          <button
            onClick={onToggleChat}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors ${
              isChatOpen
                ? 'bg-[#D4AF37]/20 text-[#F3D079] border border-[#D4AF37]/40'
                : 'bg-[#141E33] text-slate-200 hover:text-white hover:bg-[#1E2D4A] border border-[#1E2D4A]'
            }`}
            title="Abrir o cerrar chat en vivo"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden md:inline">Chat</span>
          </button>

          {/* Botón Peticiones de Oración */}
          <button
            onClick={onOpenPrayerModal}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 hover:text-white border border-[#1E2D4A] transition-colors"
            title="Enviar petición de oración a los intercesores"
          >
            <HeartHandshake className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">Petición de Oración</span>
          </button>

          {/* Botón Información del Culto */}
          <button
            onClick={onOpenInfoModal}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 hover:text-white border border-[#1E2D4A] transition-colors"
            title="Información, notas del sermón y diezmos"
          >
            <Info className="w-4 h-4 text-[#D4AF37]" />
            <span className="hidden lg:inline">Info Culto</span>
          </button>
        </div>

      </div>
    </div>
  );
};
