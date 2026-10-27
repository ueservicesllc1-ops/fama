'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Radio,
  Clock,
  Search,
  Film,
  Loader2,
  ArrowRight,
  MapPin,
  Users,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { Recording, Culto } from '@/types/models';
import { RecordingCard } from '@/components/ui/RecordingCard';
import { VideoPlayerModal } from '@/components/ui/VideoPlayerModal';
import { fetchRecordingsFromFirestore } from '@/lib/firebase/services/contentService';
import { getLiveOrUpcomingCulto } from '@/lib/firebase/services/cultosService';

export default function CultosPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [culto, setCulto] = useState<Culto | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  const categories = ['Todas', 'Domingos', 'Estudio Bíblico', 'Jóvenes', 'Series Especiales'];

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const [recData, activeCulto] = await Promise.all([
          fetchRecordingsFromFirestore(),
          getLiveOrUpcomingCulto(),
        ]);
        if (mounted) {
          setRecordings(recData);
          setCulto(activeCulto);
        }
      } catch (err) {
        console.error('[CultosPage] Error cargando cultos:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const isLive = culto?.status === 'en_vivo';

  const weeklySchedule = [
    {
      day: 'Domingo',
      time: '10:00 AM',
      title: 'Culto General de Adoración & Palabra',
      audience: 'Para toda la familia',
      type: 'Presencial & Virtual',
      highlight: true,
    },
    {
      day: 'Domingo',
      time: '6:00 PM',
      title: 'Culto Vespertino de Avivamiento',
      audience: 'Congregación y visitantes',
      type: 'Presencial & Virtual',
    },
    {
      day: 'Miércoles',
      time: '7:30 PM',
      title: 'Estudio Bíblico Expositivo & Oración',
      audience: 'Discipulado y profundización bíblica',
      type: 'Presencial & Virtual',
    },
    {
      day: 'Sábado',
      time: '6:30 PM',
      title: 'Reunión de Jóvenes FAMA',
      audience: 'Jóvenes y universitarios',
      type: 'Presencial & Transmisión',
    },
  ];

  const filteredRecordings = useMemo(() => {
    return recordings.filter((rec) => {
      const matchesCategory =
        selectedCategory === 'Todas' || rec.category === selectedCategory;
      const matchesSearch =
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.preacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.seriesTitle && rec.seriesTitle.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [recordings, searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden">
      
      {/* ========================================================
          1. HERO & ESTADO DEL CULTO EN VIVO
         ======================================================== */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
            <span>CELEBRACIÓN & ADORACIÓN CONGREGACIONAL</span>
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Nuestros Cultos & Horarios
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
            En RENACER CHURCH nos reunimos semanalmente para exaltar a Dios, escuchar Su Palabra y fortalecernos en comunidad. Acompáñanos de forma presencial o ingresa a nuestro auditorio virtual con 275 butacas digitales.
          </p>
        </div>

        {/* Tarjeta Destacada de Transmisión */}
        <div className="relative rounded-3xl border border-[#25282E] bg-[#121417] p-8 sm:p-12 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#C69A4B]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2">
                {isLive ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-wider animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Transmisión en Vivo Ahora
                  </span>
                ) : culto?.status === 'programado' ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" />
                    Próximo Culto en Agenda
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#C69A4B]/15 border border-[#C69A4B]/40 text-[#C69A4B] text-xs font-semibold uppercase tracking-wider">
                    <Radio className="w-3.5 h-3.5" />
                    Horario Habitual FAMA
                  </span>
                )}
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
                {culto?.title || 'Culto General de Adoración & Palabra'}
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed font-light">
                {culto?.description ||
                  'Te invitamos a tomar tu lugar de forma presencial o ingresar a nuestro auditorio virtual con 275 butacas digitales dinámicas, chat pastoral e interacción comunitaria.'}
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
                    : 'Domingo 10:00 AM & 6:00 PM'}
                </span>
                <span>•</span>
                <span className="text-[#C69A4B] font-medium">Auditorio Virtual: 275 Butacas</span>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Link
                href="/iglesia-virtual"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-xl shadow-[#C69A4B]/20 transition-all group"
              >
                <Radio className="w-4 h-4 text-white" />
                <span>{isLive ? 'Unirse a la Transmisión' : 'Entrar al Auditorio Virtual'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. HORARIOS SEMANALES CONGREGACIONALES
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
            <span>CALENDARIO SEMANAL</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Nuestras Citas Congregacionales
          </h2>
          <p className="text-sm text-slate-400">
            Horarios diseñados para alimentar la fe de niños, jóvenes, adultos y familias.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {weeklySchedule.map((item) => (
            <div
              key={item.title}
              className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 transition-all shadow-lg ${
                item.highlight
                  ? 'border-[#C69A4B] bg-[#1A1D23] ring-1 ring-[#C69A4B]/30'
                  : 'border-[#25282E] bg-[#121417]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C69A4B]">
                    {item.day}
                  </span>
                  <span className="text-xs font-semibold text-white bg-[#17191C] px-2.5 py-1 rounded-md border border-[#2E323B]">
                    {item.time}
                  </span>
                </div>

                <h3 className="font-editorial text-lg font-bold text-white">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  {item.audience}
                </p>
              </div>

              <div className="pt-4 border-t border-[#25282E] flex items-center justify-between text-[11px] text-[#C69A4B]">
                <span className="font-semibold">{item.type}</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          3. ASISTENCIA PRESENCIAL & SEDE CONGREGACIONAL
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="rounded-3xl border border-[#25282E] bg-gradient-to-br from-[#121417] via-[#17191C] to-[#121417] p-8 sm:p-12 relative overflow-hidden shadow-2xl">
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#C69A4B]/5 rounded-full blur-[90px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
                <MapPin className="w-4 h-4 text-[#C69A4B]" />
                <span>SEDE CENTRAL RENACER CHURCH</span>
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Pautas para tu Asistencia Presencial
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed font-light">
                Si deseas acompañarnos físicamente, nuestro templo y equipo de anfitriones están listos para recibirte a ti y a tu familia con calidez y orden.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
                <div className="p-4 rounded-2xl bg-[#1A1D23] border border-[#2E323B] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#C69A4B] font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>Llegada Anticipada</span>
                  </div>
                  <p className="text-slate-400">
                    Recomendamos llegar 15 minutos antes de la hora para facilitar tu ingreso y ubicación en el templo.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1A1D23] border border-[#2E323B] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#C69A4B] font-semibold">
                    <Users className="w-4 h-4" />
                    <span>Familias & Niños</span>
                  </div>
                  <p className="text-slate-400">
                    Contamos con espacio para niños y cuna durante el culto general dominical de las 10:00 AM.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1A1D23] border border-[#2E323B] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#C69A4B] font-semibold">
                    <HeartHandshake className="w-4 h-4" />
                    <span>Equipo de Bienvenida</span>
                  </div>
                  <p className="text-slate-400">
                    Si nos visitas por primera vez, acércate a nuestros servidores para acompañarte y responder tus dudas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1A1D23] border border-[#2E323B] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#C69A4B] font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Acceso Gratuito</span>
                  </div>
                  <p className="text-slate-400">
                    Todas nuestras reuniones son abiertas a toda la comunidad sin necesidad de reserva previa.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#14171B] border border-[#2E323B] p-6 sm:p-8 rounded-3xl space-y-5 text-center flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#C69A4B] uppercase tracking-wider block">
                  Información Pastoral
                </span>
                <h3 className="font-editorial text-2xl font-bold text-white">¿Tienes alguna consulta?</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  Nuestro equipo pastoral está disponible para orientarte sobre ubicación, consejería u oración antes de tu visita.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/contacto"
                  className="w-full py-3 px-6 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs transition-colors shadow-md shadow-[#C69A4B]/20"
                >
                  Contactar al Equipo Pastoral
                </Link>
                <Link
                  href="/iglesia-virtual"
                  className="w-full py-3 px-6 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-200 border border-[#2E323B] font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Radio className="w-3.5 h-3.5 text-red-400" />
                  <span>Participar en el Auditorio Virtual</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          4. VIDEOTECA & CULTOS ANTERIORES (FIRESTORE)
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase mb-2">
              <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
              <span>VIDEOTECA CONGREGACIONAL</span>
            </div>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Cultos Anteriores & Grabaciones
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Revive los cultos transmitidos en directo a través de YouTube Live y Backblaze B2.
            </p>
          </div>

          <Link
            href="/predicaciones"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C69A4B] hover:text-[#D4A359] uppercase tracking-wider group self-start md:self-auto"
          >
            <span>Ver Catálogo por Series Bíblicas</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-10 bg-[#121417] border border-[#25282E] p-4 rounded-2xl">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, pastor o serie..."
              className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-md'
                    : 'bg-[#1A1D23] border border-[#2E323B] text-slate-300 hover:text-white hover:bg-[#25282E]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Listado de Grabaciones Reales */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#C69A4B]" />
            <p className="text-xs">Cargando grabaciones desde Firestore...</p>
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="rounded-2xl border border-[#25282E] bg-[#121417] p-12 text-center max-w-md mx-auto space-y-3">
            <Film className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-white">
              No hay grabaciones archivadas
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {recordings.length === 0
                ? 'Las transmisiones grabadas desde OBS y YouTube quedarán archivadas aquí automáticamente.'
                : 'No se encontraron grabaciones que coincidan con la búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((rec) => (
              <RecordingCard
                key={rec.id}
                recording={rec}
                onSelect={() => setSelectedRecording(rec)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal de Reproducción de Video */}
      <VideoPlayerModal
        onClose={() => setSelectedRecording(null)}
        recording={selectedRecording}
      />

    </div>
  );
}
