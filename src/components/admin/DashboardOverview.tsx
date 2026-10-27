'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  HeartHandshake,
  MessageSquare,
  Radio,
  Heart,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Landmark,
  UserCheck,
  Megaphone,
  Layers,
  Package,
  Building2,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';

interface DashboardStats {
  members: {
    total: number;
    newLast30Days: number;
    roles: Record<string, number>;
  };
  applications: {
    pendingGroups: number;
    pendingMinistries: number;
    totalPending: number;
  };
  events: {
    upcomingCount: number;
    totalRegisteredInUpcoming: number;
    upcomingList: {
      id: string;
      title: string;
      date: string;
      registeredCount: number;
      capacity?: number;
      modality: string;
    }[];
  };
  contacts: {
    newCount: number;
    totalCount: number;
  };
  prayers: {
    totalCount: number;
  };
  culto: {
    id: string;
    title: string;
    status: string;
  } | null;
}

interface DashboardOverviewProps {
  onNavigateSection: (
    section:
      | 'resumen'
      | 'mantenimiento'
      | 'inventario'
      | 'voluntarios'
      | 'finanzas'
      | 'asistencia'
      | 'miembros'
      | 'cultos'
      | 'grabaciones'
      | 'auditorio'
      | 'eventos'
      | 'comunidad'
      | 'contactos'
      | 'comunicaciones'
      | 'pastoral'
      | 'tienda'
  ) => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateSection,
  onNotify,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isManual = false) => {
    if (!user) return;
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudieron cargar las estadísticas.');
      }

      setStats(data.stats);
      if (isManual) onNotify?.('Estadísticas actualizadas con datos en vivo.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar estadísticas';
      setError(msg);
      onNotify?.(msg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, onNotify]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
        <Loader2 className="w-8 h-8 animate-spin text-[#C69A4B]" />
        <span>Consultando métricas reales de Cloud Firestore...</span>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Error al cargar estadísticas</h3>
          <p className="text-xs text-rose-200">{error}</p>
        </div>
        <button
          onClick={() => fetchStats(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 border border-rose-500/40 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Barra Superior con Estado del Culto y Botón de Recarga */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0E1626] border border-[#1E2D4A]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C69A4B]/15 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B]">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Monitor Litúrgico:
              </span>
              {stats?.culto?.status === 'en_vivo' ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  EN VIVO AHORA
                </span>
              ) : stats?.culto?.status === 'programado' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                  Próximo Culto Programado
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">Sin transmisiones activas</span>
              )}
            </div>
            <p className="text-xs font-semibold text-white truncate max-w-md mt-0.5">
              {stats?.culto?.title || 'No hay culto en transmisión en este momento'}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchStats(true)}
          disabled={refreshing}
          className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 hover:text-white border border-[#1E2D4A] text-xs font-medium transition-colors disabled:opacity-50"
          title="Refrescar estadísticas en vivo"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#C69A4B]' : ''}`} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* Grid de Métricas Principales (KPIs Reales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Miembros */}
        <div
          onClick={() => onNavigateSection('miembros')}
          className="group cursor-pointer rounded-2xl border border-[#1E2D4A] bg-[#0E1626] hover:border-[#C69A4B]/50 p-5 space-y-3 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Miembros Registrados
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#C69A4B]/15 text-[#C69A4B] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white font-editorial tracking-wide">
              {stats?.members.total || 0}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{stats?.members.newLast30Days || 0} nuevos en los últimos 30 días</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-[#C69A4B]">
            <span>Gestionar miembros</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* KPI 2: Solicitudes Pendientes */}
        <div
          onClick={() => onNavigateSection('comunidad')}
          className="group cursor-pointer rounded-2xl border border-[#1E2D4A] bg-[#0E1626] hover:border-[#C69A4B]/50 p-5 space-y-3 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Solicitudes Pendientes
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/60 text-amber-300 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white font-editorial tracking-wide">
              {stats?.applications.totalPending || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>{stats?.applications.pendingGroups || 0} de grupos · {stats?.applications.pendingMinistries || 0} de ministerios</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-[#C69A4B]">
            <span>Revisar solicitudes</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* KPI 3: Eventos Próximos */}
        <div
          onClick={() => onNavigateSection('eventos')}
          className="group cursor-pointer rounded-2xl border border-[#1E2D4A] bg-[#0E1626] hover:border-[#C69A4B]/50 p-5 space-y-3 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Eventos en Cartelera
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/60 text-blue-300 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white font-editorial tracking-wide">
              {stats?.events.upcomingCount || 0}
            </div>
            <div className="text-[11px] text-cyan-400 mt-1">
              <span>{stats?.events.totalRegisteredInUpcoming || 0} participantes inscritos</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-[#C69A4B]">
            <span>Ver eventos e inscripciones</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* KPI 4: Mensajes de Contacto */}
        <div
          onClick={() => onNavigateSection('contactos')}
          className="group cursor-pointer rounded-2xl border border-[#1E2D4A] bg-[#0E1626] hover:border-[#C69A4B]/50 p-5 space-y-3 transition-all hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mensajes Pastorales
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-950/60 text-purple-300 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white font-editorial tracking-wide">
              {stats?.contacts.newCount || 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>{stats?.contacts.totalCount || 0} mensajes recibidos en total</span>
            </div>
          </div>
          <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[11px] text-slate-400 group-hover:text-[#C69A4B]">
            <span>Bandeja de contacto</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

      </div>

      {/* Dos Columnas: Próximos Eventos & Distribución Congregacional */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Cartelera Próxima */}
        <div className="lg:col-span-7 rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Próximos Eventos Congregacionales
              </h3>
              <p className="text-xs text-slate-400">Aforos y reservaciones confirmadas en Firestore.</p>
            </div>
            <button
              onClick={() => onNavigateSection('eventos')}
              className="text-xs font-semibold text-[#C69A4B] hover:underline"
            >
              Ver todos
            </button>
          </div>

          {!stats?.events.upcomingList || stats.events.upcomingList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-[#141E33]/30 rounded-xl border border-[#1E2D4A]">
              No hay eventos futuros publicados en este momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.events.upcomingList.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#141E33] border border-[#1E2D4A] text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white">{evt.title}</p>
                    <p className="text-[11px] text-slate-400">
                      📅 {evt.date} · Modalidad: <strong className="text-slate-300 capitalize">{evt.modality}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-[#C69A4B]">
                      {evt.registeredCount} {evt.capacity ? `/ ${evt.capacity}` : 'inscritos'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {evt.capacity && evt.registeredCount >= evt.capacity ? 'Aforo Completo' : 'Cupos disponibles'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna Derecha: Roles y Oración */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Estructura de Membresía
            </h3>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141E33]">
                <span className="text-slate-300">Administradores Pastorales:</span>
                <strong className="text-[#C69A4B] font-mono">{stats?.members.roles.admin || 0}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141E33]">
                <span className="text-slate-300">Pastores:</span>
                <strong className="text-purple-400 font-mono">{stats?.members.roles.pastor || 0}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141E33]">
                <span className="text-slate-300">Líderes de Ministerio:</span>
                <strong className="text-blue-400 font-mono">{stats?.members.roles.leader || 0}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141E33]">
                <span className="text-slate-300">Miembros Activos:</span>
                <strong className="text-emerald-400 font-mono">{stats?.members.roles.member || 0}</strong>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#141E33]">
                <span className="text-slate-300">Visitantes Registrados:</span>
                <strong className="text-slate-400 font-mono">{stats?.members.roles.guest || 0}</strong>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('miembros')}
              className="w-full py-2.5 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-200 border border-[#1E2D4A] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <span>Abrir Directorio de Miembros</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Muro de Intercesión Congregacional</p>
                <p className="text-[11px] text-slate-400">
                  {stats?.prayers.totalCount || 0} peticiones registradas por la comunidad
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('comunidad')}
              className="text-xs text-[#C69A4B] font-semibold hover:underline"
            >
              Ver Muro
            </button>
          </div>

          <div className="rounded-2xl border border-purple-500/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                <HeartHandshake className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Atención Pastoral & Consejería</p>
                <p className="text-[11px] text-slate-400">
                  Gestión confidencial de citas, peticiones privadas y orientación espiritual
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('pastoral')}
              className="text-xs text-purple-400 font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Inventario & Recursos Físicos</p>
                <p className="text-[11px] text-slate-400">
                  Control de equipos, préstamos activos, devoluciones y mantenimiento
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('inventario')}
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/40 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">FAMA STORE · Tienda Oficial</p>
                <p className="text-[11px] text-slate-400">
                  Catálogo de productos, existencias por variantes, preparación de pedidos y control de entregas
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('tienda')}
              className="text-xs text-[#D4AF37] font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Instalaciones & Mantenimiento</p>
                <p className="text-[11px] text-slate-400">
                  Inspecciones preventivas, control de áreas físicas, reparaciones seguras y listas de cultos
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('mantenimiento')}
              className="text-xs text-amber-400 font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Voluntarios & Equipos de Servicio</p>
                <p className="text-[11px] text-slate-400">
                  Planificación de jornadas, asignación de roles, detección de conflictos y asistencia real
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('voluntarios')}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                <Landmark className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Tesorería & Finanzas Pastorales</p>
                <p className="text-[11px] text-slate-400">
                  Control interno de ingresos, egresos e informes consolidados
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('finanzas')}
              className="text-xs text-[#D4AF37] font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Asistencia & Seguimiento Pastoral</p>
                <p className="text-[11px] text-slate-400">
                  Control de cultos, registro de visitantes y tareas de contacto
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('asistencia')}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-[#0E1626] p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Comunicaciones & Difusión Institucional</p>
                <p className="text-[11px] text-slate-400">
                  Redacción de comunicados, vista previa de audiencia y avisos oficiales
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateSection('comunicaciones')}
              className="text-xs text-blue-400 font-bold hover:underline"
            >
              Gestionar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
