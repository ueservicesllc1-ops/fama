'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Shield,
  Phone,
  Mail,
  Calendar,
  Save,
  CheckCircle2,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { UserProfile, UserRole } from '@/types/models';

interface MembersManagerProps {
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ROLE_BADGES: Record<string, { label: string; badgeClass: string }> = {
  admin: {
    label: 'Administrador',
    badgeClass: 'bg-[#C69A4B]/20 text-[#E5C378] border-[#C69A4B]/40',
  },
  pastor: {
    label: 'Pastor',
    badgeClass: 'bg-purple-950/50 text-purple-300 border-purple-500/40',
  },
  leader: {
    label: 'Líder de Ministerio',
    badgeClass: 'bg-blue-950/50 text-blue-300 border-blue-500/40',
  },
  member: {
    label: 'Miembro FAMA',
    badgeClass: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40',
  },
  guest: {
    label: 'Visitante',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

export const MembersManager: React.FC<MembersManagerProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Modal de Ficha Administrativa
  const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberActivity, setMemberActivity] = useState<{
    groupsCount: number;
    ministriesCount: number;
    eventsCount: number;
  } | null>(null);

  // Campos de edición administrativa
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editCampus, setEditCampus] = useState('virtual');
  const [editPhone, setEditPhone] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPastoralAccess, setEditPastoralAccess] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }, [user]);

  const loadMembers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const headers = await getAuthHeader();
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/admin/members?${params.toString()}`, { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener lista de miembros.');
      }

      setMembers(data.members || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar miembros';
      onNotify?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, roleFilter, searchQuery, getAuthHeader, onNotify]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Abrir Ficha del Miembro
  const handleOpenMemberDetail = async (member: UserProfile) => {
    setSelectedMember(member);
    setEditRole(member.role || 'member');
    setEditCampus(member.campus || 'virtual');
    setEditPhone(member.phone || '');
    setEditDisplayName(member.displayName || '');
    setEditPastoralAccess(member.pastoralAccess === true);
    setMemberLoading(true);
    setMemberActivity(null);

    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/members/${member.uid}`, { headers });
      const data = await res.json();
      if (res.ok && data.success) {
        setMemberActivity(data.activitySummary);
      }
    } catch (err) {
      console.warn('[MembersManager] Error obteniendo historial del miembro:', err);
    } finally {
      setMemberLoading(false);
    }
  };

  // Guardar Cambios Administrativos
  const handleSaveMemberEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !user) return;

    setSavingEdit(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/members/${selectedMember.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          role: editRole,
          campus: editCampus,
          phone: editPhone,
          displayName: editDisplayName,
          pastoralAccess: editPastoralAccess,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo guardar la información.');
      }

      // Actualizar lista local
      setMembers((prev) =>
        prev.map((m) => (m.uid === selectedMember.uid ? { ...m, ...data.member } : m))
      );
      setSelectedMember(null);
      onNotify?.('Ficha de membresía actualizada correctamente.', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar miembro';
      onNotify?.(msg, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0E1626] border border-[#1E2D4A] p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="w-full bg-[#141E33] border border-[#1E2D4A] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="text-slate-400 font-medium shrink-0">Filtrar Rol:</span>
          {['all', 'admin', 'pastor', 'leader', 'member', 'guest'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-colors shrink-0 ${
                roleFilter === r
                  ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-sm'
                  : 'bg-[#141E33] text-slate-300 hover:text-white border border-[#1E2D4A]'
              }`}
            >
              {r === 'all' ? 'Todos' : r}
            </button>
          ))}

          <button
            onClick={() => loadMembers()}
            className="p-2 rounded-xl bg-[#141E33] hover:bg-[#1E2D4A] text-slate-300 hover:text-white border border-[#1E2D4A] transition-colors shrink-0 ml-1"
            title="Recargar directorio"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabla de Miembros */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-[#C69A4B]" />
          <span>Consultando miembros registrados en Firestore...</span>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-12 text-center space-y-2 text-xs text-slate-400">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="font-semibold text-white">No se encontraron miembros</p>
          <p>Prueba ajustando el término de búsqueda o el filtro de rol.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141E33] text-slate-400 uppercase tracking-wider font-semibold border-b border-[#1E2D4A] text-[10px]">
                <tr>
                  <th className="py-3 px-4">Miembro Congregacional</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Rol Pastoral</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Fecha de Ingreso</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2D4A]/60 text-slate-300">
                {members.map((m) => {
                  const badge = ROLE_BADGES[m.role || 'member'] || ROLE_BADGES.member;
                  const display = m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Sin nombre registrado';
                  const dateStr = m.joinedAt
                    ? new Date(m.joinedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Registrado';

                  return (
                    <tr key={m.uid} className="hover:bg-[#141E33]/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#C69A4B]/20 text-[#C69A4B] font-bold flex items-center justify-center shrink-0 border border-[#C69A4B]/30 font-editorial">
                            {display.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{display}</p>
                            <p className="text-[10px] text-slate-500 font-mono">UID: {m.uid.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-300">{m.email}</span>
                        {m.phone && (
                          <span className="text-[10px] text-slate-500 block">📞 {m.phone}</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-block text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                          {(m.role === 'pastor' || m.pastoralAccess) && (
                            <span className="inline-block text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/40">
                              Acceso Pastoral
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 capitalize text-slate-400">
                        {m.campus || 'virtual'}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {dateStr}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenMemberDetail(m)}
                          className="px-3 py-1.5 rounded-lg bg-[#141E33] hover:bg-[#1E2D4A] text-[#C69A4B] hover:text-white border border-[#1E2D4A] font-semibold transition-colors"
                        >
                          Ficha / Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ficha Administrativa del Miembro */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#0E1626] border border-[#1E2D4A] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 text-slate-200">
            <div className="flex items-start justify-between border-b border-[#1E2D4A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C69A4B]/20 text-[#C69A4B] font-bold flex items-center justify-center text-lg font-editorial">
                  {(selectedMember.displayName || 'M').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-white">
                    Ficha Administrativa del Miembro
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ID: {selectedMember.uid} · Correo: {selectedMember.email}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumen de Actividad */}
            <div className="grid grid-cols-3 gap-2 bg-[#141E33] p-3 rounded-2xl border border-[#1E2D4A] text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Grupos</span>
                <strong className="text-white text-base">
                  {memberLoading ? '...' : memberActivity?.groupsCount || 0}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Ministerios</span>
                <strong className="text-white text-base">
                  {memberLoading ? '...' : memberActivity?.ministriesCount || 0}
                </strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Eventos</span>
                <strong className="text-white text-base">
                  {memberLoading ? '...' : memberActivity?.eventsCount || 0}
                </strong>
              </div>
            </div>

            <form onSubmit={handleSaveMemberEdit} className="space-y-4 text-xs">
              {/* Nombre para Mostrar */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Nombre para Mostrar</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  className="w-full bg-[#141E33] border border-[#1E2D4A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              {/* Asignación de Rol Pastoral */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block flex items-center justify-between">
                  <span>Rol Institucional / Privilegios</span>
                  <span className="text-[10px] text-[#C69A4B] font-bold uppercase">Solo Administración</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full bg-[#141E33] border border-[#1E2D4A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                >
                  <option value="member">Miembro Activo FAMA</option>
                  <option value="leader">Líder de Ministerio</option>
                  <option value="pastor">Pastor de la Congregación</option>
                  <option value="admin">Administrador Pastoral</option>
                  <option value="guest">Visitante Registrado</option>
                </select>
                <p className="text-[10px] text-slate-400 italic">
                  Asignar rol &quot;admin&quot; o &quot;pastor&quot; otorga acceso completo al panel administrativo.
                </p>

                {/* Concesión Explícita de Acceso Pastoral (ETAPA 10) */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-[#0E1626] border border-[#1E2D4A]">
                    <input
                      type="checkbox"
                      checked={editPastoralAccess}
                      onChange={(e) => setEditPastoralAccess(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#C69A4B] focus:ring-[#C69A4B]"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-white block">
                        Conceder Acceso a Atención Pastoral Confidencial (pastoralAccess)
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Permite a este administrador o líder gestionar citas pastorales, leer notas internas y responder solicitudes de consejería.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Campus y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Campus Principal</label>
                  <select
                    value={editCampus}
                    onChange={(e) => setEditCampus(e.target.value)}
                    className="w-full bg-[#141E33] border border-[#1E2D4A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                  >
                    <option value="virtual">Campus Digital (Online)</option>
                    <option value="central">Sede Central (Presencial)</option>
                    <option value="ambos">Híbrido (Ambos)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#141E33] border border-[#1E2D4A] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#1E2D4A]">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Ficha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
