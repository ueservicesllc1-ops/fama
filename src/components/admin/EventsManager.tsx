'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  Users,
  Clock,
  MapPin,
  Radio,
  Eye,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Mail,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { ChurchEvent, EventRegistration } from '@/types/models';

interface EventsManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const EventsManager: React.FC<EventsManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para crear evento
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChurchEvent['category']>('Comunidad');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newLocation, setNewLocation] = useState('Auditorio Central RENACER');
  const [newModality, setNewModality] = useState<'presencial' | 'virtual' | 'hibrido'>('presencial');
  const [newDescription, setNewDescription] = useState('');
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newCapacity, setNewCapacity] = useState<string>('');
  const [newAllowsReg, setNewAllowsReg] = useState(true);
  const [newStatus, setNewStatus] = useState<'published' | 'draft'>('published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para ver inscripciones
  const [selectedEventForRegs, setSelectedEventForRegs] = useState<ChurchEvent | null>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/events', { headers });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron cargar los eventos.');
      }
      setEvents(data.events || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar eventos';
      onNotify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader, onNotify]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate.trim()) {
      onNotify?.('Por favor ingresa título y fecha del evento.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          date: newDate.trim(),
          time: newTime.trim(),
          location: newLocation.trim(),
          modality: newModality,
          description: newDescription.trim(),
          speaker: newSpeaker.trim(),
          capacity: newCapacity ? Number(newCapacity) : undefined,
          allowsRegistration: newAllowsReg,
          status: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear el evento.');
      }

      onNotify?.('Evento creado con éxito.', 'success');
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDate('');
      setNewTime('');
      setNewDescription('');
      setNewSpeaker('');
      setNewCapacity('');
      await loadEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear evento';
      onNotify?.(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (eventId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo actualizar el estado.');
      }

      setEvents((prev) =>
        prev.map((ev) => (ev.id === eventId ? { ...ev, status: nextStatus } : ev))
      );
      onNotify?.(`Evento ${nextStatus === 'published' ? 'publicado' : 'cambiado a borrador'}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar evento';
      onNotify?.(msg, 'error');
    }
  };

  const handleDeleteEvent = async (eventId: string, title: string) => {
    if (!confirm(`¿Eliminar definitivamente el evento "${title}"?`)) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo eliminar el evento.');
      }

      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      onNotify?.('Evento eliminado correctamente.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar evento';
      onNotify?.(msg, 'error');
    }
  };

  const handleOpenRegistrations = async (ev: ChurchEvent) => {
    setSelectedEventForRegs(ev);
    setLoadingRegs(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/events/${ev.id}/registrations`, { headers });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron cargar las inscripciones.');
      }
      setRegistrations(data.registrations || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar inscripciones';
      onNotify?.(msg, 'error');
    } finally {
      setLoadingRegs(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E1626] border border-[#1E2D4A] p-4 rounded-2xl">
        <div>
          <h3 className="font-bold text-white text-base">Agenda de Eventos Congregacionales</h3>
          <p className="text-xs text-slate-400">
            Administra congresos, vigilias y retiros, controla aforos y revisa participantes inscritos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadEvents}
            disabled={loading}
            className="p-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 text-xs transition-colors border border-[#2E3E5B]"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* Listado de Eventos */}
      <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Cargando eventos de la base de datos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No hay eventos registrados</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utiliza el botón &quot;Crear Nuevo Evento&quot; para agendar la próxima actividad congregacional.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E2D4A]">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-4 sm:p-5 hover:bg-[#141E33]/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        ev.status === 'published'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {ev.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#141E33] text-[#D4AF37] border border-[#2E3E5B]">
                      {ev.category}
                    </span>
                    <span className="font-bold text-white text-sm">{ev.title}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {ev.date} {ev.time && `· ${ev.time}`}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {ev.location || 'Sede RENACER'}
                    </span>
                    <span>•</span>
                    <span className="text-slate-300 capitalize font-medium">
                      Modalidad: {ev.modality || (ev.isOnline ? 'Virtual' : 'Presencial')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-1 font-light">{ev.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {/* Botón Ver Inscripciones */}
                  <button
                    onClick={() => handleOpenRegistrations(ev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 text-xs font-semibold border border-[#2E3E5B] transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>Inscritos ({ev.registeredCount || 0}{ev.capacity ? `/${ev.capacity}` : ''})</span>
                  </button>

                  {/* Publicar / Despublicar */}
                  <button
                    onClick={() => handleToggleStatus(ev.id, ev.status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                      ev.status === 'published'
                        ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {ev.status === 'published' ? 'Ocultar' : 'Publicar'}
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDeleteEvent(ev.id, ev.title)}
                    className="p-2 rounded-xl bg-[#141E33] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#2E3E5B] hover:border-rose-500/40 text-xs transition-colors"
                    title="Eliminar evento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CREAR EVENTO */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
              <h3 className="font-bold text-lg text-white">Registrar Nuevo Evento</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Congreso Anual RENACER 2026"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Categoría</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ChurchEvent['category'])}
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Congreso">Congreso</option>
                    <option value="Noche de Adoración">Noche de Adoración</option>
                    <option value="Retiro">Retiro Espiritual</option>
                    <option value="Taller">Taller / Formación</option>
                    <option value="Comunidad">Comunidad</option>
                    <option value="Especial">Especial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Modalidad</label>
                  <select
                    value={newModality}
                    onChange={(e) => setNewModality(e.target.value as 'presencial' | 'virtual' | 'hibrido')}
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="virtual">Virtual (Auditorio FAMA)</option>
                    <option value="hibrido">Híbrido (Presencial & FAMA)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Fecha *</label>
                  <input
                    type="text"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="Ej. 15 de Noviembre, 2026"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Hora</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="Ej. 7:00 PM"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Lugar / Plataforma</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Ej. Auditorio Central RENACER"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Límite Aforo (Opcional)</label>
                  <input
                    type="number"
                    min="1"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    placeholder="Ej. 250"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Expositor / Predicador Invitado</label>
                <input
                  type="text"
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  placeholder="Ej. Pastor Luis Uchubanda & Pastores Invitados"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Descripción del Evento</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detalles bíblicos, propósito de la reunión y recomendaciones para asistentes..."
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAllowsReg}
                    onChange={(e) => setNewAllowsReg(e.target.checked)}
                    className="rounded border-[#2E3E5B] bg-[#141E33] text-[#D4AF37] focus:ring-0"
                  />
                  <span>Permitir inscripciones</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newStatus === 'published'}
                    onChange={(e) => setNewStatus(e.target.checked ? 'published' : 'draft')}
                    className="rounded border-[#2E3E5B] bg-[#141E33] text-[#D4AF37] focus:ring-0"
                  />
                  <span>Publicar inmediatamente</span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#1E2D4A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Evento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INSCRIPCIONES DE EVENTO */}
      {selectedEventForRegs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2D4A]">
              <div>
                <span className="text-[11px] font-mono text-[#D4AF37]">Inscripciones Registradas</span>
                <h3 className="font-bold text-lg text-white">{selectedEventForRegs.title}</h3>
              </div>
              <button onClick={() => setSelectedEventForRegs(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingRegs ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Consultando participantes inscritos...</p>
              </div>
            ) : registrations.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">Aún no hay inscritos en este evento</p>
                <p className="text-xs text-slate-500">
                  Las personas que se registren a través de la página pública aparecerán aquí en tiempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Total de registros: <strong>{registrations.length}</strong></span>
                  <span>
                    Total de personas: <strong>{registrations.reduce((acc, r) => acc + (r.attendeesCount || 1), 0)}</strong>
                  </span>
                </div>

                <div className="divide-y divide-[#1E2D4A] rounded-xl border border-[#1E2D4A] overflow-hidden">
                  {registrations.map((reg) => (
                    <div key={reg.id} className="p-3.5 bg-[#141E33]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{reg.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold">
                            {reg.attendeesCount} {reg.attendeesCount === 1 ? 'lugar' : 'lugares'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-0.5">
                          <span>{reg.email}</span>
                          {reg.phone && <span>· {reg.phone}</span>}
                          <span>· Folio: {reg.id}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 self-start sm:self-auto flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-[#D4AF37]" />
                        <span>{reg.confirmationEmailStatus === 'sent' ? 'Correo Enviado' : 'Sin enviar'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
