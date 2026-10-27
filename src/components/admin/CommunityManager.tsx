'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  HeartHandshake,
  Plus,
  Trash2,
  Clock,
  Shield,
  Loader2,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { CommunityGroup, Ministry, GroupApplication, MinistryApplication } from '@/types/models';

interface CommunityManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type SubTab = 'grupos' | 'ministerios' | 'solicitudes';

export const CommunityManager: React.FC<CommunityManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>('grupos');
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [applications, setApplications] = useState<
    ((GroupApplication | MinistryApplication) & { appType: 'group' | 'ministry' })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal Crear Grupo
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [grpName, setGrpName] = useState('');
  const [grpCategory, setGrpCategory] = useState<CommunityGroup['category']>('General');
  const [grpLeader, setGrpLeader] = useState('');
  const [grpDay, setGrpDay] = useState('Jueves');
  const [grpTime, setGrpTime] = useState('8:00 PM');
  const [grpLocation, setGrpLocation] = useState('Sede Central / Híbrido');
  const [grpDescription, setGrpDescription] = useState('');
  const [grpMaxMembers, setGrpMaxMembers] = useState('');

  // Modal Crear Ministerio
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [minName, setMinName] = useState('');
  const [minLeader, setMinLeader] = useState('');
  const [minDescription, setMinDescription] = useState('');
  const [minRequirements, setMinRequirements] = useState('');
  const [minSchedule, setMinSchedule] = useState('');

  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const [gRes, mRes, aRes] = await Promise.all([
        fetch('/api/admin/community/groups', { headers }),
        fetch('/api/admin/community/ministries', { headers }),
        fetch('/api/admin/community/applications', { headers }),
      ]);

      const gData = await gRes.json();
      const mData = await mRes.json();
      const aData = await aRes.json();

      setGroups(gData.groups || []);
      setMinistries(mData.ministries || []);
      setApplications(aData.applications || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar datos de comunidad';
      onNotify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeader, onNotify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Crear Grupo
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grpName.trim() || !grpLeader.trim()) {
      onNotify?.('Nombre y líder del grupo son obligatorios.', 'error');
      return;
    }

    setActionLoading('creating-group');
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/community/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          name: grpName.trim(),
          category: grpCategory,
          leader: grpLeader.trim(),
          meetingDay: grpDay.trim(),
          meetingTime: grpTime.trim(),
          location: grpLocation.trim(),
          description: grpDescription.trim(),
          maxMembers: grpMaxMembers ? Number(grpMaxMembers) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al crear grupo');

      onNotify?.('Grupo creado exitosamente.', 'success');
      setIsGroupModalOpen(false);
      setGrpName('');
      setGrpLeader('');
      setGrpDescription('');
      setGrpMaxMembers('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear grupo';
      onNotify?.(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Crear Ministerio
  const handleCreateMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minName.trim() || !minLeader.trim()) {
      onNotify?.('Nombre y líder del ministerio son obligatorios.', 'error');
      return;
    }

    setActionLoading('creating-ministry');
    try {
      const headers = await getAuthHeader();
      const reqArray = minRequirements
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/community/ministries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          name: minName.trim(),
          leader: minLeader.trim(),
          description: minDescription.trim(),
          requirements: reqArray,
          meetingSchedule: minSchedule.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al crear ministerio');

      onNotify?.('Ministerio creado exitosamente.', 'success');
      setIsMinistryModalOpen(false);
      setMinName('');
      setMinLeader('');
      setMinDescription('');
      setMinRequirements('');
      setMinSchedule('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear ministerio';
      onNotify?.(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Eliminar Grupo
  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el grupo "${name}"?`)) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/community/groups/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al eliminar grupo');
      setGroups((prev) => prev.filter((g) => g.id !== id));
      onNotify?.('Grupo eliminado.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar grupo';
      onNotify?.(msg, 'error');
    }
  };

  // Eliminar Ministerio
  const handleDeleteMinistry = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el ministerio "${name}"?`)) return;
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/community/ministries/${id}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al eliminar ministerio');
      setMinistries((prev) => prev.filter((m) => m.id !== id));
      onNotify?.('Ministerio eliminado.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar ministerio';
      onNotify?.(msg, 'error');
    }
  };

  // Aprobar / Rechazar Solicitud
  const handleUpdateAppStatus = async (
    id: string,
    type: 'group' | 'ministry',
    status: 'approved' | 'rejected'
  ) => {
    setActionLoading(`app-${id}-${status}`);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/community/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status, type }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al actualizar solicitud');

      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      onNotify?.(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'}.`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar solicitud';
      onNotify?.(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingAppsCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Selector de Sub-Pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E1626] border border-[#1E2D4A] p-4 rounded-2xl">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSubTab('grupos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'grupos'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-[#141E33] text-slate-300 hover:text-white border border-[#2E3E5B]'
            }`}
          >
            Grupos de Conexión ({groups.length})
          </button>
          <button
            onClick={() => setSubTab('ministerios')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              subTab === 'ministerios'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-[#141E33] text-slate-300 hover:text-white border border-[#2E3E5B]'
            }`}
          >
            Ministerios ({ministries.length})
          </button>
          <button
            onClick={() => setSubTab('solicitudes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'solicitudes'
                ? 'bg-[#D4AF37] text-black shadow-md'
                : 'bg-[#141E33] text-slate-300 hover:text-white border border-[#2E3E5B]'
            }`}
          >
            <span>Solicitudes</span>
            {pendingAppsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-black font-extrabold">
                {pendingAppsCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 text-xs border border-[#2E3E5B]"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {subTab === 'grupos' && (
            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Grupo</span>
            </button>
          )}

          {subTab === 'ministerios' && (
            <button
              onClick={() => setIsMinistryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Ministerio</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTENIDO SEGÚN SUB-PESTAÑA */}

      {/* 1. GRUPOS */}
      {subTab === 'grupos' && (
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando grupos...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No hay grupos de conexión registrados</p>
              <p className="text-xs text-slate-500">Crea el primer grupo con el botón &quot;Nuevo Grupo&quot;.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E2D4A]">
              {groups.map((g) => (
                <div key={g.id} className="p-4 sm:p-5 hover:bg-[#141E33]/60 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#141E33] text-[#D4AF37] border border-[#2E3E5B]">
                        {g.category}
                      </span>
                      <span className="font-bold text-white text-sm">{g.name}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Líder: <strong className="text-slate-200">{g.leader}</strong> · {g.meetingDay} {g.meetingTime} · {g.location}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-1 font-light">{g.description}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteGroup(g.id, g.name)}
                    className="p-2 rounded-xl bg-[#141E33] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#2E3E5B] text-xs transition-colors shrink-0"
                    title="Eliminar grupo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. MINISTERIOS */}
      {subTab === 'ministerios' && (
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando ministerios...</p>
            </div>
          ) : ministries.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <Shield className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No hay ministerios registrados</p>
              <p className="text-xs text-slate-500">Crea el primer ministerio con el botón &quot;Nuevo Ministerio&quot;.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E2D4A]">
              {ministries.map((m) => (
                <div key={m.id} className="p-4 sm:p-5 hover:bg-[#141E33]/60 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm">{m.name}</h4>
                    <p className="text-xs text-slate-400">
                      Coordinación: <strong className="text-slate-200">{m.leader}</strong>
                      {m.meetingSchedule && ` · Horario: ${m.meetingSchedule}`}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-1 font-light">{m.description}</p>
                    {m.requirements && m.requirements.length > 0 && (
                      <p className="text-[11px] text-slate-500">Requisitos: {m.requirements.join(', ')}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteMinistry(m.id, m.name)}
                    className="p-2 rounded-xl bg-[#141E33] hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-[#2E3E5B] text-xs transition-colors shrink-0"
                    title="Eliminar ministerio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SOLICITUDES DE PARTICIPACIÓN */}
      {subTab === 'solicitudes' && (
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Cargando solicitudes...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No hay solicitudes registradas</p>
              <p className="text-xs text-slate-500">
                Las solicitudes de miembros para unirse a grupos o ministerios aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E2D4A]">
              {applications.map((app) => {
                const targetTitle = 'groupName' in app ? app.groupName : app.ministryName;
                const isGroup = app.appType === 'group';

                return (
                  <div key={app.id} className="p-4 sm:p-5 hover:bg-[#141E33]/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isGroup ? 'bg-blue-950 text-blue-300 border border-blue-500/30' : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}>
                          {isGroup ? 'Grupo' : 'Ministerio'}: {targetTitle}
                        </span>
                        <span className="font-bold text-white text-sm">{app.userName}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          app.status === 'approved' ? 'bg-emerald-950 text-emerald-300' : app.status === 'rejected' ? 'bg-rose-950 text-rose-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {app.status === 'approved' ? 'Aprobada' : app.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="text-slate-400 text-[11px] flex flex-wrap gap-2 pt-0.5">
                        {app.userEmail && <span>Correo: {app.userEmail}</span>}
                        {app.userPhone && <span>· Tel: {app.userPhone}</span>}
                        <span>· Fecha: {new Date(app.createdAt).toLocaleDateString('es-ES')}</span>
                      </div>

                      {app.notes && (
                        <p className="text-slate-300 bg-[#141E33] p-2 rounded-lg text-[11px] mt-1 font-light">
                          &quot;{app.notes}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {app.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateAppStatus(app.id, app.appType, 'approved')}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </button>
                      )}

                      {app.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateAppStatus(app.id, app.appType, 'rejected')}
                          disabled={actionLoading !== null}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR GRUPO */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2D4A]">
              <h3 className="font-bold text-base text-white">Nuevo Grupo de Conexión</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Nombre del Grupo *</label>
                <input
                  type="text"
                  required
                  value={grpName}
                  onChange={(e) => setGrpName(e.target.value)}
                  placeholder="Ej. Grupo Familiar Betel"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Categoría</label>
                  <select
                    value={grpCategory}
                    onChange={(e) => setGrpCategory(e.target.value as CommunityGroup['category'])}
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="General">General</option>
                    <option value="Matrimonios">Matrimonios</option>
                    <option value="Jóvenes">Jóvenes</option>
                    <option value="Varones">Varones</option>
                    <option value="Mujeres">Mujeres</option>
                    <option value="Profesionales">Profesionales</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Líder Asignado *</label>
                  <input
                    type="text"
                    required
                    value={grpLeader}
                    onChange={(e) => setGrpLeader(e.target.value)}
                    placeholder="Ej. Diác. Carlos Silva"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Día de Reunión</label>
                  <input
                    type="text"
                    value={grpDay}
                    onChange={(e) => setGrpDay(e.target.value)}
                    placeholder="Ej. Jueves"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Hora</label>
                  <input
                    type="text"
                    value={grpTime}
                    onChange={(e) => setGrpTime(e.target.value)}
                    placeholder="Ej. 8:00 PM"
                    className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Lugar / Sector</label>
                <input
                  type="text"
                  value={grpLocation}
                  onChange={(e) => setGrpLocation(e.target.value)}
                  placeholder="Ej. Sector Central / Presencial & Zoom"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Descripción del Grupo</label>
                <textarea
                  rows={2}
                  value={grpDescription}
                  onChange={(e) => setGrpDescription(e.target.value)}
                  placeholder="Propósito del grupo, enfoque bíblico..."
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              <div className="pt-2 border-t border-[#1E2D4A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading === 'creating-group' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Grupo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR MINISTERIO */}
      {isMinistryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0E1626] border border-[#1E2D4A] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2D4A]">
              <h3 className="font-bold text-base text-white">Nuevo Ministerio Congregacional</h3>
              <button onClick={() => setIsMinistryModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMinistry} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Nombre del Ministerio *</label>
                <input
                  type="text"
                  required
                  value={minName}
                  onChange={(e) => setMinName(e.target.value)}
                  placeholder="Ej. Ministerio de Alabanza & Adoración"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Líder o Coordinador *</label>
                <input
                  type="text"
                  required
                  value={minLeader}
                  onChange={(e) => setMinLeader(e.target.value)}
                  placeholder="Ej. Pastor de Alabanza"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Descripción del Área de Servicio</label>
                <textarea
                  rows={2}
                  value={minDescription}
                  onChange={(e) => setMinDescription(e.target.value)}
                  placeholder="Función del ministerio en la congregación..."
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Requisitos (separados por coma)</label>
                <input
                  type="text"
                  value={minRequirements}
                  onChange={(e) => setMinRequirements(e.target.value)}
                  placeholder="Ej. Bautismo, Compromiso dominical, Capacitación previa"
                  className="w-full bg-[#141E33] border border-[#2E3E5B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 border-t border-[#1E2D4A] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMinistryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-5 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {actionLoading === 'creating-ministry' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Ministerio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
