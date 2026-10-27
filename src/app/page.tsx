'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radio,
  Play,
  PlayCircle,
  CalendarDays,
  Users,
  ArrowRight,
  BookOpen,
  Heart,
  Globe,
  Clock,
  MapPin,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Recording, ChurchEvent, Culto } from '@/types/models';
import { RecordingCard } from '@/components/ui/RecordingCard';
import {
  fetchRecordingsFromFirestore,
  fetchEventsFromFirestore,
} from '@/lib/firebase/services/contentService';
import { getLiveOrUpcomingCulto } from '@/lib/firebase/services/cultosService';

export default function HomePage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [culto, setCulto] = useState<Culto | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const [recData, evtData, cultoData] = await Promise.all([
          fetchRecordingsFromFirestore(),
          fetchEventsFromFirestore(),
          getLiveOrUpcomingCulto(),
        ]);
        if (mounted) {
          setRecordings(recData.slice(0, 3));
          setEvents(evtData.slice(0, 2));
          setCulto(cultoData);
        }
      } catch (err) {
        console.error('[HomePage] Error cargando contenidos:', err);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const isLive = culto?.status === 'en_vivo';

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden selection:bg-[#C69A4B]/30 selection:text-[#FAF8F4]">
      
      {/* ========================================================
          1. HERO PRINCIPAL: ADORACIÓN CINEMATOGRÁFICA & IDENTIDAD
         ======================================================== */}
      <section className="relative min-h-[72vh] sm:min-h-[78vh] lg:min-h-[82vh] flex items-center justify-start overflow-hidden">
        {/* Fotografía de Fondo: Adoración Congregacional Cálida y Nítida */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{
            backgroundImage: "url('/images/hero_worship.jpg')",
            backgroundPosition: "center 30%",
          }}
        />

        {/* Viñeta sutil en el lado izquierdo para máxima legibilidad del titular sin apagar la escena del escenario */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#17191C]/92 via-[#17191C]/65 to-transparent w-full lg:w-3/5 z-[1]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#17191C] via-[#17191C]/40 to-transparent z-[1]" />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#17191C]/60 to-transparent z-[1]" />

        {/* Contenido Principal del Hero */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-20 flex flex-col justify-between">
          
          <div className="max-w-2xl space-y-5">
            {/* Etiqueta Superior */}
            <div className="inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
              <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
              <span>BIENVENIDO A FAMA</span>
            </div>

            {/* Titular Editorial en Tipografía Serif */}
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[62px] font-bold text-white tracking-tight leading-[1.12]">
              Una iglesia en línea <br />
              <span className="text-[#C69A4B]">para una generación</span> <br />
              con propósito
            </h1>

            {/* Subtítulo Descriptivo */}
            <p className="text-base sm:text-lg text-[#FAF8F4]/90 font-normal leading-relaxed max-w-xl">
              Fe, Amor, Misión y Almas. Conéctate, crece, sirve y sé parte de lo que Dios está haciendo.
            </p>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/iglesia-virtual"
                className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs sm:text-sm tracking-wide shadow-xl shadow-[#C69A4B]/25 hover:shadow-2xl transition-all group"
              >
                <div className="w-6 h-6 rounded-full bg-[#17191C]/15 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 fill-[#17191C] text-[#17191C] ml-0.5 group-hover:scale-110 transition-transform" />
                </div>
                <span>Ver Culto en Vivo</span>
              </Link>

              <a
                href="#esencia"
                className="inline-flex items-center px-7 py-3.5 rounded-full bg-[#17191C]/60 hover:bg-[#17191C]/90 text-white font-medium text-xs sm:text-sm tracking-wide border border-white/20 hover:border-[#C69A4B] transition-all backdrop-blur-sm"
              >
                Conoce más
              </a>
            </div>
          </div>

          {/* Marca de Agua Editorial en Cursiva (Inferior Derecha) */}
          <div className="self-end pt-6 pb-2 text-right hidden sm:block">
            <span className="font-serif italic text-2xl sm:text-3xl text-white/85 select-none tracking-wider block">
              Fe · Amor · Misión · Almas
            </span>
            <div className="w-48 h-[1px] bg-[#C69A4B]/60 ml-auto mt-2" />
          </div>

        </div>
      </section>

      {/* ========================================================
          2. ACCESOS PRINCIPALES: 4 TARJETAS FLOTANTES
         ======================================================== */}
      <section className="relative z-20 -mt-10 sm:-mt-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Tarjeta 1: Cultos en Vivo */}
          <Link
            href="/iglesia-virtual"
            className="bg-[#FAF8F4] border border-[#E8E3DA] rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/5 hover:shadow-xl hover:border-[#C69A4B] transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 text-[#C69A4B] flex items-center justify-center group-hover:bg-[#C69A4B] group-hover:text-[#17191C] transition-all duration-300">
                <Radio className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-[#17191C] group-hover:text-[#C69A4B] transition-colors">
                  Cultos en Vivo
                </h3>
                <p className="text-xs sm:text-[13px] text-[#77736D] leading-relaxed">
                  Únete a nuestras transmisiones desde el auditorio virtual con 275 butacas interactivas.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-[#C69A4B] font-bold text-xs gap-1.5">
              <span>Ingresar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta 2: Predicaciones */}
          <Link
            href="/predicaciones"
            className="bg-[#FAF8F4] border border-[#E8E3DA] rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/5 hover:shadow-xl hover:border-[#C69A4B] transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 text-[#C69A4B] flex items-center justify-center group-hover:bg-[#C69A4B] group-hover:text-[#17191C] transition-all duration-300">
                <PlayCircle className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-[#17191C] group-hover:text-[#C69A4B] transition-colors">
                  Predicaciones
                </h3>
                <p className="text-xs sm:text-[13px] text-[#77736D] leading-relaxed">
                  Revive los mensajes y enseñanzas cristocéntricas de la Palabra de Dios.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-[#C69A4B] font-bold text-xs gap-1.5">
              <span>Explorar</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta 3: Próximos Eventos */}
          <Link
            href="/eventos"
            className="bg-[#FAF8F4] border border-[#E8E3DA] rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/5 hover:shadow-xl hover:border-[#C69A4B] transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 text-[#C69A4B] flex items-center justify-center group-hover:bg-[#C69A4B] group-hover:text-[#17191C] transition-all duration-300">
                <CalendarDays className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-[#17191C] group-hover:text-[#C69A4B] transition-colors">
                  Próximos Eventos
                </h3>
                <p className="text-xs sm:text-[13px] text-[#77736D] leading-relaxed">
                  Conferencias, talleres, retiros y actividades especiales de crecimiento.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-[#C69A4B] font-bold text-xs gap-1.5">
              <span>Ver agenda</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta 4: Sé Parte de FAMA */}
          <Link
            href="/registro"
            className="bg-[#FAF8F4] border border-[#E8E3DA] rounded-2xl p-6 sm:p-7 shadow-lg shadow-black/5 hover:shadow-xl hover:border-[#C69A4B] transition-all duration-300 hover:-translate-y-1 group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 text-[#C69A4B] flex items-center justify-center group-hover:bg-[#C69A4B] group-hover:text-[#17191C] transition-all duration-300">
                <Users className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-[#17191C] group-hover:text-[#C69A4B] transition-colors">
                  Sé Parte de FAMA
                </h3>
                <p className="text-xs sm:text-[13px] text-[#77736D] leading-relaxed">
                  Crea tu cuenta, participa en el chat en vivo y forma parte de nuestra familia.
                </p>
              </div>
            </div>
            <div className="pt-4 flex items-center text-[#C69A4B] font-bold text-xs gap-1.5">
              <span>Registrarme</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* ========================================================
          3. SECCIÓN INSTITUCIONAL: NUESTRA ESENCIA
         ======================================================== */}
      <section id="esencia" className="relative pt-24 sm:pt-28 pb-24 sm:pb-32 -mt-8 sm:-mt-12 overflow-hidden">
        {/* Fotografía de Fondo: Cruz en la Cumbre al Amanecer */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/esencia_cross_dawn.jpg')",
          }}
        />

        {/* Gradiente Cálido para Fusionar con Textos en Fondo Blanco Cálido */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F4]/98 via-[#FAF8F4]/94 to-[#FAF8F4]/40 z-[1]" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Columna Izquierda: Mensaje y Significado FAMA */}
            <div className="lg:col-span-6 space-y-6 text-[#17191C]">
              <div className="inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
                <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
                <span>NUESTRA ESENCIA</span>
              </div>

              <div className="space-y-2">
                <h2 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#17191C]">
                  FAMA
                </h2>
                <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#17191C]/90">
                  Fe, Amor, Misión y Almas
                </h3>
              </div>

              <p className="text-sm sm:text-base text-[#77736D] leading-relaxed max-w-lg">
                Somos una comunidad que cree en el poder del Evangelio para transformar vidas. A través de la fe, el amor, la misión y las almas, buscamos impactar a nuestra generación y al mundo para la gloria de Dios.
              </p>

              <div>
                <Link
                  href="/comunidad"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-md transition-all group"
                >
                  <span>Conoce nuestra historia</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Columna Derecha: Los 4 Pilares con Iconografía Fina */}
            <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
              
              {/* Pilar: Fe */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#E8E3DA] shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#C69A4B]/40 flex items-center justify-center text-[#C69A4B]">
                  <BookOpen className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-[#17191C]">Fe</h4>
                <p className="text-[11px] text-[#77736D] leading-snug">
                  Una fe viva que transforma.
                </p>
              </div>

              {/* Pilar: Amor */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#E8E3DA] shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#C69A4B]/40 flex items-center justify-center text-[#C69A4B]">
                  <Heart className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-[#17191C]">Amor</h4>
                <p className="text-[11px] text-[#77736D] leading-snug">
                  Un amor que sirve y restaura.
                </p>
              </div>

              {/* Pilar: Misión */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#E8E3DA] shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#C69A4B]/40 flex items-center justify-center text-[#C69A4B]">
                  <Globe className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-[#17191C]">Misión</h4>
                <p className="text-[11px] text-[#77736D] leading-snug">
                  Una misión que trasciende fronteras.
                </p>
              </div>

              {/* Pilar: Almas */}
              <div className="flex flex-col items-center text-center space-y-2.5 p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-[#E8E3DA] shadow-sm">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F4] border border-[#C69A4B]/40 flex items-center justify-center text-[#C69A4B]">
                  <Users className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-bold text-[#17191C]">Almas</h4>
                <p className="text-[11px] text-[#77736D] leading-snug">
                  Almas que importan a Dios y a nosotros.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================
          4. CULTO EN VIVO / TRANSMISIÓN (Datos reales de Firestore)
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="relative rounded-3xl border border-[#25282E] bg-[#121417] p-8 sm:p-12 overflow-hidden shadow-2xl">
          {/* Luz sutil de fondo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C69A4B]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2">
                {isLive ? (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Transmisión en Vivo Ahora
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/40 text-[#C69A4B] text-xs font-semibold uppercase tracking-wider">
                    <Radio className="w-3.5 h-3.5" />
                    Auditorio Virtual FAMA
                  </span>
                )}
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {culto?.title || 'Culto General FAMA — Fe, Adoración y Palabra'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                {culto?.description ||
                  'Te invitamos a tomar tu butaca en nuestro auditorio digital con 275 asientos, chat interactivo en tiempo real y transmisión de alta fidelidad vía YouTube Live.'}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
                <span className="flex items-center gap-1.5 text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C69A4B]"></span>
                  {culto?.preacher || 'Pastor Luis Uchubanda'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-[#C69A4B]" />
                  {culto?.scheduledStartTime
                    ? new Date(culto.scheduledStartTime).toLocaleString('es-ES', {
                        weekday: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Domingos 10:00 AM & 6:00 PM'}
                </span>
                <span>•</span>
                <span className="text-[#C69A4B] font-medium">Capacidad: 275 Butacas</span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Link
                href="/iglesia-virtual"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-xl shadow-[#C69A4B]/20 transition-all group"
              >
                <Radio className="w-4 h-4 text-white" />
                <span>Entrar al Auditorio</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/cultos"
                className="inline-flex items-center justify-center px-6 py-4 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-200 border border-[#2E323B] font-medium text-xs sm:text-sm transition-all"
              >
                Horarios & Información
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          5. PREDICACIONES RECIENTES (Datos reales de Firestore)
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
              <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
              <span>PALABRA Y ENSEÑANZA</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Predicaciones Recientes
            </h2>
            <p className="text-sm text-slate-400">
              Alimentando tu fe con mensajes bíblicos, cristocéntricos y transformadores.
            </p>
          </div>

          <Link
            href="/predicaciones"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C69A4B] hover:text-[#D4A359] uppercase tracking-wider group self-start md:self-auto"
          >
            <span>Ver Toda la Videoteca</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {recordings.length === 0 ? (
          <div className="rounded-2xl border border-[#25282E] bg-[#121417] p-12 text-center space-y-3">
            <PlayCircle className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-white">Videoteca Congregacional</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Las grabaciones de las transmisiones y predicaciones estarán disponibles en este catálogo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recordings.map((rec) => (
              <Link key={rec.id} href="/predicaciones" className="block">
                <RecordingCard recording={rec} />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          6. PRÓXIMOS ENCUENTROS & EVENTOS (Datos reales de Firestore)
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
              <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
              <span>CALENDARIO CONGREGACIONAL</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Próximos Encuentros & Eventos
            </h2>
            <p className="text-sm text-slate-400">
              Aparta las fechas para congresos, noches de adoración y retiros de crecimiento.
            </p>
          </div>

          <Link
            href="/eventos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C69A4B] hover:text-[#D4A359] uppercase tracking-wider group self-start md:self-auto"
          >
            <span>Ver Todos los Eventos</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-[#25282E] bg-[#121417] p-12 text-center space-y-3">
            <CalendarDays className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-base font-semibold text-white">Agenda Congregacional</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              No hay eventos programados en este momento. Consulta periódicamente nuestras próximas convocatorias.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 flex flex-col justify-between space-y-4 hover:border-[#C69A4B]/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#C69A4B]/15 text-[#C69A4B] border border-[#C69A4B]/30">
                      {evt.category}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-[#C69A4B]" />
                      {evt.date} • {evt.time}
                    </span>
                  </div>
                  <h3 className="font-editorial text-xl font-bold text-white">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {evt.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1F2228] flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {evt.location}
                  </span>
                  <Link
                    href="/eventos"
                    className="text-[#C69A4B] font-semibold hover:underline shrink-0"
                  >
                    Detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          7. LLAMADO FINAL: COMUNIDAD & PROPÓSITO
         ======================================================== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1C1F26] to-[#121417] border border-[#2E323B] p-10 sm:p-16 text-center space-y-6 overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/30 text-[#C69A4B] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>

          <div className="space-y-3 max-w-2xl mx-auto">
            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Una familia de fe esperando por ti
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              No importa en qué ciudad o país te encuentres: en FAMA tienes un hogar espiritual para adorar a Dios, escuchar Su Palabra y crecer en comunidad.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/registro"
              className="px-8 py-3.5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-xl shadow-[#C69A4B]/20 transition-all"
            >
              Crear Cuenta Gratuita
            </Link>

            <Link
              href="/comunidad"
              className="px-8 py-3.5 rounded-full bg-transparent hover:bg-white/5 text-slate-200 border border-slate-600 font-medium text-xs sm:text-sm transition-all"
            >
              Conocer Ministerios & Grupos
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
