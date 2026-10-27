'use client';

import React from 'react';
import { X, BookOpen, User, Sparkles, HeartHandshake, ShieldCheck } from 'lucide-react';
import { Culto } from '@/types/models';

interface CultoInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  culto: Culto | null;
}

export const CultoInfoModal: React.FC<CultoInfoModalProps> = ({ isOpen, onClose, culto }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0E1626] border border-[#1E2D4A] rounded-2xl shadow-2xl p-6 text-slate-200 max-h-[90vh] overflow-y-auto">
        
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#141E33] transition-colors"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera */}
        <div className="flex items-center gap-3 border-b border-[#1E2D4A] pb-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#F3D079]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
              FAMA Iglesia Virtual
            </span>
            <h3 className="text-lg font-bold text-white">Detalles del Culto & Mensaje</h3>
          </div>
        </div>

        <div className="space-y-5 text-xs sm:text-sm">
          {/* Título y Predicador */}
          <div className="bg-[#070B14] p-4 rounded-xl border border-[#1E2D4A] space-y-2">
            <span className="text-[11px] font-bold text-[#F3D079] uppercase tracking-wider">
              {culto?.status === 'en_vivo' ? 'EN VIVO AHORA' : 'CULTO CONGREGACIONAL'}
            </span>
            <h4 className="text-base sm:text-lg font-bold text-white">
              {culto?.title || "Reunión General FAMA"}
            </h4>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 text-slate-300">
                <User className="w-3.5 h-3.5 text-[#D4AF37]" />
                {culto?.preacher || "Pastor Luis Uchubanda"}
              </span>
              {culto?.scriptureReference && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  {culto.scriptureReference}
                </span>
              )}
            </div>
          </div>

          {/* Descripción / Bosquejo */}
          <div>
            <h5 className="font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              Descripción de la Enseñanza
            </h5>
            <div className="bg-[#141E33] p-3 rounded-lg border border-[#1E2D4A] text-slate-300 text-xs leading-relaxed">
              {culto?.description ||
                "Bienvenido a FAMA. Un lugar donde la fe, el amor y la misión transforman almas para la gloria de Dios."}
            </div>
          </div>

          {/* Diezmos y Ofrendas */}
          <div className="bg-gradient-to-br from-[#121B2F] to-[#0A101E] p-4 rounded-xl border border-[#D4AF37]/30 space-y-2">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-[#D4AF37]" />
              <h5 className="font-bold text-white text-xs uppercase tracking-wider">
                Generosidad & Ofrendas FAMA
              </h5>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              La plataforma FAMA integrará pasarelas de pago seguras y verificadas en una etapa posterior. Agradecemos la fidelidad de cada hermano que apoya el avance del evangelio y las misiones.
            </p>
            <div className="flex items-center gap-1 text-[11px] text-[#D4AF37]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Módulo de donaciones protegido y auditado próximamente.</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#1E2D4A] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#141E33] hover:bg-[#1E2D4A] text-white font-semibold text-xs rounded-xl border border-[#1E2D4A] transition-colors"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
};
