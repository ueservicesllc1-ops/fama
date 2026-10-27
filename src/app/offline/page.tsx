'use client';

import React from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, Home, ShieldAlert, Sparkles } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full rounded-3xl border border-[#25282E] bg-[#121417]/90 backdrop-blur-xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
        
        {/* Icono con resplandor dorado */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#E5C378] shadow-inner shadow-amber-500/20">
          <WifiOff className="w-10 h-10 animate-pulse stroke-[1.8]" />
        </div>

        {/* Títulos */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1D23] border border-[#2E323B] text-[11px] font-semibold text-[#E5C378] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Modo Sin Conexión — PWA FAMA</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white tracking-wide">
            Sin Conexión a Internet
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            No se pudo establecer contacto con los servidores de RENACER CHURCH. Los recursos básicos almacenados en tu dispositivo continúan accesibles.
          </p>
        </div>

        {/* Aviso de Seguridad Pastoral y Financiera */}
        <div className="rounded-2xl bg-[#0B0F17] border border-[#222732] p-4 text-left flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-200 font-semibold block">
              Integridad Congregacional & Seguridad de Datos
            </strong>
            <p>
              Por motivos de seguridad, las transacciones financieras (diezmos y ofrendas), el registro de asistencia a cultos, las peticiones de oración privadas y las solicitudes ministeriales <strong>únicamente se procesan con verificación activa en el servidor</strong>. No se registrarán operaciones simuladas sin conexión.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleReload}
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-lg shadow-[#C69A4B]/20 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar Conexión</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#17191C] hover:bg-[#20242B] text-slate-200 border border-[#2E323B] font-medium text-xs transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-[#C69A4B]" />
            <span>Volver al Inicio</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
