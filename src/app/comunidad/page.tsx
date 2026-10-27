'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  HeartHandshake,
  Shield,
  Plus,
  Heart,
  Loader2,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Clock,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';
import { PrayerModal } from '@/components/auditorio/PrayerModal';
import { useAuth } from '@/lib/firebase/authContext';
import {
  RealPrayerRequest,
  subscribeToPrayerRequests,
  prayForRequest,
} from '@/lib/firebase/services/prayerService';
import {
  fetchGroupsFromFirestore,
  fetchMinistriesFromFirestore,
} from '@/lib/firebase/services/contentService';
import { CommunityGroup, Ministry, GroupApplication, MinistryApplication } from '@/types/models';

export default function ComunidadPage() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'grupos' | 'ministerios' | 'oracion'>('grupos');
  const [isPrayerModalOpen, setIsPrayerModalOpen] = useState(false);

  const [prayerRequests, setPrayerRequests] = useState<RealPrayerRequest[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [myGroupApps, setMyGroupApps] = useState<GroupApplication[]>([]);
  const [myMinistryApps, setMyMinistryApps] = useState<MinistryApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de solicitud de unión a grupo o ministerio
  const [selectedGroup, setSelectedGroup] = useState<CommunityGroup | null>(null);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [applicantName, setApplicantName] = useState(profile?.displayName || user?.displayName || '');
  const [applicantPhone, setApplicantPhone] = useState(profile?.phone || '');
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '');
  const [applicantNotes, setApplicantNotes] = useState('');
  const [applicantExperience, setApplicantExperience] = useState('');
  const [applicantAvailability, setApplicantAvailability] = useState('');
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appFeedback, setAppFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Cargar mis solicitudes activas si el usuario está autenticado
  const loadMyApplications = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/community/my-applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMyGroupApps(data.groupApplications || []);
          setMyMinistryApps(data.ministryApplications || []);
        }
      }
    } catch {
      // Silenciar errores de sincronización de usuario
    }
  }, [user]);

  // Suscripción al muro de oración en Firestore
  useEffect(() => {
    const unsub = subscribeToPrayerRequests((list) => {
      setPrayerRequests(list);
    });
    return () => unsub();
  }, []);

  // Cargar grupos y ministerios de Firestore
  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      const [gData, mData] = await Promise.all([
        fetchGroupsFromFirestore(),
        fetchMinistriesFromFirestore(),
      ]);
      setGroups(gData);
      setMinistries(mData);
      setLoading(false);
    };
    loadContent();
  }, []);

  useEffect(() => {
    loadMyApplications();
  }, [loadMyApplications]);

  // Sincronizar datos de usuario
  useEffect(() => {
    if (user || profile) {
      if (!applicantName) setApplicantName(profile?.displayName || user?.displayName || '');
      if (!applicantEmail) setApplicantEmail(user?.email || '');
      if (!applicantPhone) setApplicantPhone(profile?.phone || '');
    }
  }, [user, profile, applicantName, applicantEmail, applicantPhone]);

  const handlePray = async (requestId: string) => {
    if (!user) return;
    await prayForRequest(requestId, user.uid);
  };

  const handleGroupApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    if (!applicantName.trim() || (!applicantPhone.trim() && !applicantEmail.trim())) {
      setAppFeedback({ msg: 'Por favor indica tu nombre y al menos un método de contacto.', type: 'error' });
      return;
    }

    setSubmittingApp(true);
    setAppFeedback(null);

    try {
      const res = await fetch('/api/community/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          targetId: selectedGroup.id,
          targetName: selectedGroup.name,
          category: selectedGroup.category,
          applicantName: applicantName.trim(),
          applicantPhone: applicantPhone.trim() || undefined,
          applicantEmail: applicantEmail.trim() || undefined,
          notes: applicantNotes.trim() || undefined,
          userId: user?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo registrar la solicitud.');
      }

      setAppFeedback({
        msg: data.message || `¡Solicitud registrada para el grupo "${selectedGroup.name}"!`,
        type: 'success',
      });

      await loadMyApplications();

      setTimeout(() => {
        setSelectedGroup(null);
        setAppFeedback(null);
        setApplicantNotes('');
      }, 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al registrar solicitud';
      setAppFeedback({ msg: errorMsg, type: 'error' });
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleMinistryApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMinistry) return;
    if (!applicantName.trim() || (!applicantPhone.trim() && !applicantEmail.trim())) {
      setAppFeedback({ msg: 'Por favor indica tu nombre y al menos un método de contacto.', type: 'error' });
      return;
    }

    setSubmittingApp(true);
    setAppFeedback(null);

    try {
      const res = await fetch('/api/community/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ministry',
          targetId: selectedMinistry.id,
          targetName: selectedMinistry.name,
          applicantName: applicantName.trim(),
          applicantPhone: applicantPhone.trim() || undefined,
          applicantEmail: applicantEmail.trim() || undefined,
          experience: applicantExperience.trim() || undefined,
          availability: applicantAvailability.trim() || undefined,
          notes: applicantNotes.trim() || undefined,
          userId: user?.uid,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo registrar la postulación.');
      }

      setAppFeedback({
        msg: data.message || `¡Postulación registrada para el ministerio "${selectedMinistry.name}"!`,
        type: 'success',
      });

      await loadMyApplications();

      setTimeout(() => {
        setSelectedMinistry(null);
        setAppFeedback(null);
        setApplicantNotes('');
        setApplicantExperience('');
        setApplicantAvailability('');
      }, 3000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al registrar postulación';
      setAppFeedback({ msg: errorMsg, type: 'error' });
    } finally {
      setSubmittingApp(false);
    }
  };

  // Helper para consultar estado de solicitud de un grupo
  const getGroupAppStatus = (groupId: string): GroupApplication | undefined => {
    return myGroupApps.find((app) => app.groupId === groupId);
  };

  // Helper para consultar estado de solicitud de un ministerio
  const getMinistryAppStatus = (ministryId: string): MinistryApplication | undefined => {
    return myMinistryApps.find((app) => app.ministryId === ministryId);
  };

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden min-h-screen">
      
      {/* ========================================================
          1. ENCABEZADO
         ======================================================== */}
      <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
          <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
          <span>VIDA CONGREGACIONAL & DISCIPULADO</span>
          <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
        </div>

        <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-white">
          Nuestra Comunidad FAMA
        </h1>

        <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
          Crecer juntos en fe, servir con amor y orar unos por otros. Conéctate con un grupo pequeño, descubre tu ministerio o comparte tus peticiones de oración.
        </p>

        {/* Selector de Pestañas */}
        <div className="inline-flex p-1.5 rounded-2xl bg-[#121417] border border-[#25282E] shadow-xl mt-4">
          <button
            onClick={() => setActiveTab('grupos')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'grupos'
                ? 'bg-[#C69A4B] text-[#17191C] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Grupos de Conexión ({groups.length})
          </button>
          <button
            onClick={() => setActiveTab('ministerios')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ministerios'
                ? 'bg-[#C69A4B] text-[#17191C] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ministerios & Servicio ({ministries.length})
          </button>
          <button
            onClick={() => setActiveTab('oracion')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'oracion'
                ? 'bg-[#C69A4B] text-[#17191C] shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Muro de Oración ({prayerRequests.length})
          </button>
        </div>
      </section>

      {/* ========================================================
          2. PESTAÑA 1: GRUPOS DE CONEXIÓN REALES
         ======================================================== */}
      {activeTab === 'grupos' && (
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#C69A4B]" />
              <p className="text-xs">Cargando grupos congregacionales...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 sm:p-16 text-center max-w-2xl mx-auto space-y-6 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] mx-auto">
                <Users className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="font-editorial text-2xl font-bold text-white">
                  Grupos de Conexión en Organización
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto font-light">
                  Los grupos de discipulado, matrimonios y jóvenes se están coordinando por el cuerpo pastoral. Muy pronto se publicarán los horarios y zonas disponibles.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contacto"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all"
                >
                  <span>Solicitar Orientación Pastoral</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/cultos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-300 border border-[#2E323B] font-semibold text-xs transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Ver Cultos Semanales</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {groups.map((grp) => {
                const app = getGroupAppStatus(grp.id);
                return (
                  <div
                    key={grp.id}
                    className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 sm:p-7 space-y-5 hover:border-[#C69A4B]/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-[#C69A4B]/15 text-[#C69A4B] border border-[#C69A4B]/30">
                          {grp.category}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-[#C69A4B]" />
                          {grp.membersCount || 0} miembros activos
                        </span>
                      </div>

                      <h3 className="font-editorial text-2xl font-bold text-white">
                        {grp.name}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed font-light">
                        {grp.description}
                      </p>

                      <div className="pt-3 border-t border-[#1F2228] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{grp.meetingDay} {grp.meetingTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">Líder: {grp.leader}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      {app ? (
                        <div className="p-2.5 rounded-xl bg-[#1A1D23] border border-[#2E323B] flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Estado de tu solicitud:</span>
                          {app.status === 'approved' ? (
                            <span className="font-bold text-emerald-400 flex items-center gap-1">
                              <BadgeCheck className="w-4 h-4" /> Aprobado / Miembro
                            </span>
                          ) : app.status === 'rejected' ? (
                            <span className="font-bold text-rose-400">Rechazada</span>
                          ) : (
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-pulse" /> En Revisión Pastoral
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedGroup(grp);
                            setAppFeedback(null);
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Solicitar Unirme a este Grupo</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          3. PESTAÑA 2: MINISTERIOS REALES
         ======================================================== */}
      {activeTab === 'ministerios' && (
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#C69A4B]" />
              <p className="text-xs">Cargando ministerios...</p>
            </div>
          ) : ministries.length === 0 ? (
            <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 sm:p-16 text-center max-w-2xl mx-auto space-y-6 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] mx-auto">
                <HeartHandshake className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="font-editorial text-2xl font-bold text-white">
                  Ministerios & Áreas de Servicio FAMA
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-lg mx-auto font-light">
                  Las convocatorias para servir en alabanza, transmisión digital, protocolo, niños e intercesión se coordinan bajo la dirección pastoral de RENACER CHURCH.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/contacto"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all"
                >
                  <span>Postularme mediante el Formulario</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/quienes-somos"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-300 border border-[#2E323B] font-semibold text-xs transition-all"
                >
                  <Shield className="w-4 h-4" />
                  <span>Conocer Nuestra Visión</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {ministries.map((min) => {
                const app = getMinistryAppStatus(min.id);
                return (
                  <div
                    key={min.id}
                    className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 sm:p-7 space-y-5 hover:border-[#C69A4B]/50 transition-all duration-300 shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-[#C69A4B]/15 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B]">
                          <Shield className="w-5 h-5 stroke-[1.8]" />
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                          {min.membersCount || 0} servidores activos
                        </span>
                      </div>

                      <h3 className="font-editorial text-2xl font-bold text-white">
                        {min.name}
                      </h3>

                      <p className="text-xs text-slate-300 leading-relaxed font-light">
                        {min.description}
                      </p>

                      <div className="pt-3 border-t border-[#1F2228] text-xs text-slate-400 space-y-1">
                        <div>
                          <span>Coordinación: <strong className="text-slate-200">{min.leader}</strong></span>
                        </div>
                        {min.requirements && min.requirements.length > 0 && (
                          <div className="text-[11px] text-slate-400">
                            <span>Requisitos: </span>
                            <span className="text-slate-300">{min.requirements.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      {app ? (
                        <div className="p-2.5 rounded-xl bg-[#1A1D23] border border-[#2E323B] flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">Estado de tu postulación:</span>
                          {app.status === 'approved' ? (
                            <span className="font-bold text-emerald-400 flex items-center gap-1">
                              <BadgeCheck className="w-4 h-4" /> Aprobada / Servidor Activo
                            </span>
                          ) : app.status === 'rejected' ? (
                            <span className="font-bold text-rose-400">Rechazada</span>
                          ) : (
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 animate-pulse" /> En Revisión Pastoral
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedMinistry(min);
                            setAppFeedback(null);
                          }}
                          className="w-full py-2.5 rounded-xl bg-[#1A1D23] hover:bg-[#C69A4B] text-slate-200 hover:text-[#17191C] border border-[#2E323B] hover:border-[#C69A4B] font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Postularme para Servir en este Ministerio</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          4. PESTAÑA 3: MURO DE ORACIÓN REAL (FIRESTORE)
         ======================================================== */}
      {activeTab === 'oracion' && (
        <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#121417] border border-[#25282E] p-5 rounded-2xl shadow-xl">
            <div>
              <h3 className="font-editorial text-xl font-bold text-white">
                Muro de Intercesión Congregacional
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Peticiones reales compartidas por la congregación en Cloud Firestore. Clamemos unos por otros.
              </p>
            </div>

            <button
              onClick={() => setIsPrayerModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs transition-colors shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar Petición de Oración</span>
            </button>
          </div>

          {prayerRequests.length === 0 ? (
            <div className="rounded-2xl border border-[#25282E] bg-[#121417] p-12 text-center max-w-md mx-auto space-y-3">
              <HeartHandshake className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="font-editorial text-lg font-bold text-white">
                No hay peticiones públicas activas
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sé el primero en compartir un motivo de oración o agradecimiento con la iglesia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayerRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 flex flex-col justify-between space-y-4 shadow-lg hover:border-[#C69A4B]/40 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#1A1D23] text-[#C69A4B] border border-[#2E323B]">
                        {req.category || 'General'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {req.createdAt
                          ? typeof (req.createdAt as unknown as { toDate?: () => Date })?.toDate === 'function'
                            ? (req.createdAt as unknown as { toDate: () => Date }).toDate().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                            : typeof (req.createdAt as unknown as { _seconds?: number })?._seconds === 'number'
                              ? new Date((req.createdAt as unknown as { _seconds: number })._seconds * 1000).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                              : new Date(String(req.createdAt)).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                          : 'Reciente'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-light">
                      &quot;{req.requestText}&quot;
                    </p>

                    <div className="pt-2 text-[11px] text-slate-400">
                      Por: <strong className="text-slate-300">{req.isAnonymous ? 'Anónimo' : req.authorName}</strong>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1F2228] flex items-center justify-between">
                    <span className="text-[11px] text-[#C69A4B] font-semibold">
                      {req.prayersCount || 0} hermanos han orado
                    </span>

                    <button
                      onClick={() => handlePray(req.id)}
                      disabled={!user || (req.prayedByUsers && req.prayedByUsers.includes(user.uid))}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1D23] hover:bg-[#25282E] text-slate-300 hover:text-[#C69A4B] border border-[#2E323B] text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <Heart className={`w-3.5 h-3.5 ${user && req.prayedByUsers?.includes(user.uid) ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{user && req.prayedByUsers?.includes(user.uid) ? 'He orado' : 'Orar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal de Oración */}
      <PrayerModal
        isOpen={isPrayerModalOpen}
        onClose={() => setIsPrayerModalOpen(false)}
      />

      {/* Modal de Solicitud de Grupo */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#121417] border border-[#25282E] p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#25282E]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#C69A4B] tracking-wider block">
                  Solicitud de Integración
                </span>
                <h3 className="font-editorial text-lg font-bold text-white truncate max-w-[260px]">
                  {selectedGroup.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {appFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  appFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}
              >
                {appFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{appFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleGroupApplication} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Tu Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Ej. María Elena Silva"
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Correo Electrónico</label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Mensaje o Motivo de Unión (Opcional)</label>
                <textarea
                  rows={3}
                  value={applicantNotes}
                  onChange={(e) => setApplicantNotes(e.target.value)}
                  placeholder="Cuéntanos un poco sobre ti o tu deseo de unirte a este grupo..."
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingApp}
                className="w-full py-3 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingApp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando solicitud...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Solicitud al Líder de Grupo</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Postulación a Ministerio */}
      {selectedMinistry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-[#121417] border border-[#25282E] p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#25282E]">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#C69A4B] tracking-wider block">
                  Postulación Ministerial
                </span>
                <h3 className="font-editorial text-lg font-bold text-white truncate max-w-[260px]">
                  {selectedMinistry.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMinistry(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {appFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  appFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}
              >
                {appFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{appFeedback.msg}</span>
              </div>
            )}

            <form onSubmit={handleMinistryApplication} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Tu Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Ej. Samuel Morales"
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Teléfono / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={applicantPhone}
                    onChange={(e) => setApplicantPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Correo Electrónico</label>
                  <input
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Disponibilidad de Horario</label>
                <input
                  type="text"
                  value={applicantAvailability}
                  onChange={(e) => setApplicantAvailability(e.target.value)}
                  placeholder="Ej. Domingos por la mañana, miércoles noche"
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Experiencia o Motivación</label>
                <textarea
                  rows={2}
                  value={applicantNotes}
                  onChange={(e) => setApplicantNotes(e.target.value)}
                  placeholder="¿Por qué deseas servir en esta área? ¿Cuentas con experiencia previa?"
                  className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingApp}
                className="w-full py-3 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submittingApp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registrando postulación...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Postularme para este Ministerio</span>
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
