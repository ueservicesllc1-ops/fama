'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, Compass, Shield, Users, Radio, Database, Cloud } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#05080F] border-t border-[#1E2D4A] pt-16 pb-12 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Columna 1: Identidad FAMA Oficial */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block group py-1" title="FAMA - Inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-fondo-negro.png"
                alt="FAMA — Fe · Amor · Misión · Almas"
                className="h-14 sm:h-16 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Una plataforma digital integral para la congregación de Cristo. Conectando corazones en adoración, discipulado bíblico y comunión fraternal en cualquier lugar del mundo.
            </p>

            {/* Los 4 Pilares de FAMA */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#0E1626] p-2 rounded-lg border border-[#1E2D4A]/60">
                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span><strong>F</strong>E inquebrantable</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#0E1626] p-2 rounded-lg border border-[#1E2D4A]/60">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <span><strong>A</strong>MOR sacrificial</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#0E1626] p-2 rounded-lg border border-[#1E2D4A]/60">
                <Compass className="w-3.5 h-3.5 text-blue-400" />
                <span><strong>M</strong>ISIÓN global</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#0E1626] p-2 rounded-lg border border-[#1E2D4A]/60">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span><strong>A</strong>LMAS preciosas</span>
              </div>
            </div>
          </div>

          {/* Columna 2: Plataforma y Cultos */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cultos & Auditorio</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/iglesia-virtual" className="hover:text-[#F3D079] transition-colors flex items-center gap-1.5 text-slate-300">
                  <Radio className="w-3.5 h-3.5 text-red-500" />
                  Iglesia Virtual en Vivo
                </Link>
              </li>
              <li>
                <Link href="/cultos" className="hover:text-[#F3D079] transition-colors">
                  Cultos Anteriores
                </Link>
              </li>
              <li>
                <Link href="/predicaciones" className="hover:text-[#F3D079] transition-colors">
                  Series Bíblicas
                </Link>
              </li>
              <li>
                <Link href="/eventos" className="hover:text-[#F3D079] transition-colors">
                  Calendario de Eventos
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Comunidad & Vida */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Comunidad</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/quienes-somos" className="hover:text-[#F3D079] transition-colors">
                  Quiénes Somos
                </Link>
              </li>
              <li>
                <Link href="/comunidad" className="hover:text-[#F3D079] transition-colors">
                  Comunidad
                </Link>
              </li>
              <li>
                <Link href="/recursos" className="hover:text-[#F3D079] transition-colors">
                  Recursos Espirituales
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="hover:text-[#F3D079] transition-colors">
                  Contacto & Pastoral
                </Link>
              </li>
              <li>
                <Link href="/galeria" className="hover:text-[#F3D079] transition-colors">
                  Galería Fotográfica
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Horarios & Arquitectura */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Horarios de Culto</h4>
            <div className="text-xs space-y-1.5 text-slate-300">
              <p className="font-semibold text-white">Culto Dominical:</p>
              <p className="text-slate-400">10:00 AM & 6:00 PM</p>
              <p className="font-semibold text-white pt-1">Estudio Bíblico:</p>
              <p className="text-slate-400">Miércoles 7:30 PM</p>
              <p className="font-semibold text-white pt-1">Jóvenes FAMA:</p>
              <p className="text-slate-400">Sábados 6:30 PM</p>
            </div>

            <div className="pt-3 border-t border-[#1E2D4A]/50 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Arquitectura Técnica</span>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Database className="w-3 h-3 text-[#D4AF37]" />
                <span>Firestore Ready</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Cloud className="w-3 h-3 text-cyan-400" />
                <span>Backblaze B2 Ready</span>
              </div>
            </div>
          </div>

        </div>

        {/* Barra inferior */}
        <div className="pt-8 border-t border-[#1E2D4A] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © 2026 FAMA — FE · AMOR · MISIÓN · ALMAS. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/acceso" className="hover:text-slate-200">Acceso a Miembros</Link>
            <Link href="/registro" className="hover:text-slate-200">Crear Cuenta</Link>
            <span className="text-slate-600">|</span>
            <span className="text-[#D4AF37] font-medium">Plataforma Digital Integral</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
