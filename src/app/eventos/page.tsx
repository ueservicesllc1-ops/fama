'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Loader2,
  CalendarDays,
  Clock,
  MapPin,
  Radio,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Users,
  ArrowRight,
} from 'lucide-react';
import { ChurchEvent } from '@/types/models';
import { fetchEventsFromFirestore } from '@/lib/firebase/services/contentService';
import { useAuth } from '@/lib/firebase/authContext';

export default function EventosPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Modal de inscripción
  const [registeringEvent, setRegisteringEvent] = useState<ChurchEvent | null>(null);
  const [attendeeName, setAttendeeName] = useState(profile?.displayName || user?.displayName || '');
  const [attendeeEmail, setAttendeeEmail] = useState(user?.email || '');
  const [attendeePhone, setAttendeePhone] = useState(profile?.phone || '');
  const [attendeesCount, setAttendeesCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const categories = ['Todos', 'Congreso', 'Noche de Adoración', 'Retiro', 'Taller', 'Comunidad'];

  useEffect(() => {
    const loadEvents = async () => {
      setLoading(true);
      const data = await fetchEventsFromFirestore();
      setEvents(data);
      setLoading(false);
    };
    loadEvents();
  }, []);

  // Sincronizar datos de usuario si inicia sesión
  useEffect(() => {
    if (user || profile) {
      if (!attendeeName) setAttendeeName(profile?.displayName || user?.displayName || '');
      if (!attendeeEmail) setAttendeeEmail(user?.email || '');
      if (!attendeePhone) setAttendeePhone(profile?.phone || '');
    }
  }, [user, profile, attendeeName, attendeeEmail, attendeePhone]);

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (selectedCategory === 'Todos') return true;
      return evt.category === selectedCategory;
    });
  }, [events, selectedCategory]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registeringEvent) return;
    if (!attendeeName.trim() || !attendeeEmail.trim()) {
      setFeedback({ msg: 'Por favor completa tu nombre y correo electrónico.', type: 'error' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: registeringEvent.id,
          name: attendeeName.trim(),
          email: attendeeEmail.trim(),
          phone: attendeePhone.trim() || undefined,
          attendeesCount,
          userId: user?.uid,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo procesar la inscripción.');
      }

      setFeedback({
        msg: `¡Inscripción confirmada! Folio: ${data.registrationId}. ${
          data.confirmationEmailStatus === 'sent'
            ? 'Te hemos enviado un correo con los detalles.'
            : 'Tu lugar ha quedado reservado.'
        }`,
        type: 'success',
      });

      // Actualizar contador en la lista local
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === registeringEvent.id
            ? { ...ev, registeredCount: (ev.registeredCount || 0) + attendeesCount }
            : ev
        )
      );

      setTimeout(() => {
        setRegisteringEvent(null);
        setFeedback(null);
      }, 3500);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al registrar asistencia';
      setFeedback({ msg: errorMsg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden min-h-screen">
      
      {/* ========================================================
          1. ENCABEZADO
         ======================================================== */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
          <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
          <span>AGENDA CONGREGACIONAL & CONVOCATORIAS</span>
          <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
        </div>

        <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-white">
          Próximos Eventos & Reuniones
        </h1>

        <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
          Tiempos especiales de convocación, congresos, vigilias de adoración y jornadas de formación para la congregación de RENACER CHURCH.
        </p>

        {/* Filtros de Categoría */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-[#C69A4B] text-[#17191C] shadow-md'
                  : 'bg-[#121417] text-slate-300 hover:text-white hover:bg-[#1A1D23] border border-[#25282E]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* ========================================================
          2. LISTADO DE EVENTOS REALES
         ======================================================== */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#C69A4B]" />
            <p className="text-xs">Cargando eventos desde el calendario oficial...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 sm:p-16 text-center max-w-2xl mx-auto space-y-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] mx-auto">
              <CalendarDays className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="font-editorial text-2xl font-bold text-white">
                No hay eventos programados en este momento
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto font-light">
                Nuestro cuerpo pastoral y comités están preparando las próximas convocatorias, retiros y congresos. Puedes acompañarnos en nuestros cultos semanales habituales.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/cultos"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>Ver Horarios de Cultos Semanales</span>
              </Link>
              <Link
                href="/contacto"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-300 border border-[#2E323B] font-semibold text-xs transition-all"
              >
                <span>Consultar con Pastoral</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((evt) => (
              <div
                key={evt.id}
                className="rounded-2xl border border-[#25282E] bg-[#121417] overflow-hidden hover:border-[#C69A4B]/50 transition-all duration-300 shadow-xl flex flex-col justify-between group"
              >
                {/* Imagen del Evento */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#17191C]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evt.imageUrl || '/images/hero_worship.jpg'}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#121417] via-transparent to-transparent opacity-90" />

                  <div className="absolute top-3 left-3 bg-[#121417]/90 text-[#C69A4B] border border-[#C69A4B]/40 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm">
                    {evt.category}
                  </div>

                  {evt.isOnline && (
                    <div className="absolute top-3 right-3 bg-red-950/80 text-red-300 border border-red-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                      <span>Transmisión en Vivo</span>
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#C69A4B]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{evt.date}</span>
                      {evt.time && (
                        <>
                          <span className="text-slate-600">•</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{evt.time}</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-editorial text-xl font-bold text-white group-hover:text-[#C69A4B] transition-colors leading-snug">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-slate-300 leading-relaxed font-light line-clamp-3">
                      {evt.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[#1F2228]">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{evt.location || 'Sede RENACER'}</span>
                      </div>
                      {typeof evt.capacity === 'number' && (
                        <span className="text-[11px] font-mono text-slate-400">
                          {evt.registeredCount || 0}/{evt.capacity} inscritos
                        </span>
                      )}
                    </div>

                    {evt.allowsRegistration !== false && (
                      <button
                        onClick={() => {
                          setRegisteringEvent(evt);
                          setFeedback(null);
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Inscribirme a este Evento</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          3. MODAL DE INSCRIPCIÓN A EVENTOS
         ======================================================== */}
      {registeringEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#121417] border border-[#25282E] p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#25282E]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#C69A4B] tracking-wider block">
                  Inscripción al Evento
                </span>
                <h3 className="font-editorial text-lg font-bold text-white truncate max-w-[260px]">
                  {registeringEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setRegisteringEvent(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{feedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Tu Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="Ej. Lucas Morales"
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={attendeePhone}
                    onChange={(e) => setAttendeePhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Lugares a Reservar</label>
                  <select
                    value={attendeesCount}
                    onChange={(e) => setAttendeesCount(Number(e.target.value))}
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                  >
                    <option value={1}>1 persona</option>
                    <option value={2}>2 personas</option>
                    <option value={3}>3 personas</option>
                    <option value={4}>4 personas</option>
                    <option value={5}>5 personas</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirmando inscripción...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirmar Inscripción y Recibir Correo</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
