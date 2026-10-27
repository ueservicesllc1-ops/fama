'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Calendar,
  Phone,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  Radio,
  LogIn,
  KeyRound,
  Users,
  HeartHandshake,
  Ticket,
  Clock,
  Camera,
  LogOut,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Bell,
  Package,
  Building2,
  ShoppingBag,
} from 'lucide-react';
import { NotificationsCenter } from '@/components/notifications/NotificationsCenter';
import { MemberPastoralPortal } from '@/components/pastoral/MemberPastoralPortal';
import { MemberServicePortal } from '@/components/volunteers/MemberServicePortal';
import { MemberInventoryPortal } from '@/components/inventory/MemberInventoryPortal';
import { MemberFacilityPortal } from '@/components/facilities/MemberFacilityPortal';
import { MemberOrdersPortal } from '@/components/store/MemberOrdersPortal';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';
import { useAuth } from '@/lib/firebase/authContext';
import { auth } from '@/lib/firebase/config';
import {
  UserProfile,
  GroupApplication,
  MinistryApplication,
  EventRegistration,
} from '@/types/models';
import { RealPrayerRequest } from '@/lib/firebase/services/prayerService';

const ROLE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  admin: {
    label: 'Administrador Pastoral',
    badgeClass: 'bg-[#C69A4B]/20 text-[#E5C378] border-[#C69A4B]/40',
  },
  pastor: {
    label: 'Pastor de la Congregación',
    badgeClass: 'bg-purple-950/40 text-purple-300 border-purple-500/40',
  },
  leader: {
    label: 'Líder de Ministerio',
    badgeClass: 'bg-blue-950/40 text-blue-300 border-blue-500/40',
  },
  member: {
    label: 'Miembro Activo FAMA',
    badgeClass: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
  },
  guest: {
    label: 'Visitante Registrado',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
};

const STATUS_BADGES: Record<string, { label: string; badgeClass: string }> = {
  pending: {
    label: 'En Revisión Pastoral',
    badgeClass: 'bg-amber-950/50 text-amber-300 border-amber-500/40',
  },
  approved: {
    label: 'Aprobada / Confirmada',
    badgeClass: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40',
  },
  rejected: {
    label: 'No Admitida',
    badgeClass: 'bg-rose-950/50 text-rose-300 border-rose-500/40',
  },
  confirmed: {
    label: 'Inscripción Confirmada',
    badgeClass: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40',
  },
  cancelled: {
    label: 'Cancelada',
    badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export default function PerfilPage() {
  const { user, profile, signOut, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'perfil' | 'actividad' | 'pastoral' | 'servicio' | 'recursos' | 'mantenimiento' | 'pedidos' | 'seguridad' | 'notificaciones'>('perfil');
  const [activitySubTab, setActivitySubTab] = useState<'grupos' | 'ministerios' | 'eventos' | 'oraciones'>('grupos');

  // Detectar ?tab=notificaciones, ?tab=pastoral, ?tab=servicio, ?tab=recursos, ?tab=mantenimiento o ?tab=pedidos desde URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (
        tab === 'notificaciones' ||
        tab === 'seguridad' ||
        tab === 'actividad' ||
        tab === 'perfil' ||
        tab === 'pastoral' ||
        tab === 'servicio' ||
        tab === 'recursos' ||
        tab === 'prestamos' ||
        tab === 'mantenimiento' ||
        tab === 'instalaciones' ||
        tab === 'pedidos' ||
        tab === 'tienda'
      ) {
        if (tab === 'prestamos') {
          setActiveTab('recursos');
        } else if (tab === 'instalaciones') {
          setActiveTab('mantenimiento');
        } else if (tab === 'tienda') {
          setActiveTab('pedidos');
        } else {
          setActiveTab(tab as any);
        }
      }
    }
  }, []);

  // Formulario de Datos Personales
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [campus, setCampus] = useState('virtual');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Cambio de Contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Actividad del Miembro
  const [groups, setGroups] = useState<GroupApplication[]>([]);
  const [ministries, setMinistries] = useState<MinistryApplication[]>([]);
  const [events, setEvents] = useState<EventRegistration[]>([]);
  const [prayers, setPrayers] = useState<RealPrayerRequest[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar estado inicial con el perfil
  useEffect(() => {
    if (profile || user) {
      setFirstName(profile?.firstName || '');
      setLastName(profile?.lastName || '');
      setDisplayName(profile?.displayName || user?.displayName || '');
      setPhone(profile?.phone || '');
      setBirthDate(profile?.birthDate || '');
      setCampus(profile?.campus || 'virtual');
      setBio(profile?.bio || '');
      setPhotoURL(profile?.photoURL || user?.photoURL || '');
    }
  }, [profile, user]);

  // Cargar actividad del miembro desde endpoint seguro
  const loadMemberActivity = useCallback(async () => {
    if (!user) return;
    setLoadingActivity(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/activity', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGroups(data.groups || []);
          setMinistries(data.ministries || []);
          setEvents(data.events || []);
          setPrayers(data.prayers || []);
        }
      }
    } catch (err) {
      console.warn('[Perfil] Error al cargar actividad:', err);
    } finally {
      setLoadingActivity(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && activeTab === 'actividad') {
      loadMemberActivity();
    }
  }, [user, activeTab, loadMemberActivity]);

  // Manejo de subida / selección de foto
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileFeedback({ msg: 'Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).', type: 'error' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileFeedback({ msg: 'La imagen excede el límite de 2 MB.', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoURL(result);
      setProfileFeedback({ msg: 'Foto cargada localmente. Haz clic en "Guardar Cambios" para confirmarla.', type: 'success' });
    };
    reader.readAsDataURL(file);
  };

  // Guardar datos del perfil mediante API segura de servidor
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setProfileFeedback(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/member/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName,
          lastName,
          displayName: displayName.trim() || `${firstName} ${lastName}`.trim() || undefined,
          phone,
          birthDate: birthDate || undefined,
          campus,
          bio,
          photoURL: photoURL || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo actualizar el perfil.');
      }

      // Sincronizar contexto local
      await updateUserProfile({
        firstName,
        lastName,
        displayName: data.profile.displayName,
        phone,
        birthDate,
        campus,
        bio,
        photoURL: data.profile.photoURL,
      });

      setProfileFeedback({ msg: data.message || '¡Tu perfil ha sido actualizado con éxito!', type: 'success' });
      setTimeout(() => setProfileFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar los datos del perfil.';
      setProfileFeedback({ msg, type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Cambiar contraseña en Firebase Authentication
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    if (!currentPassword) {
      setPasswordFeedback({ msg: 'Por favor ingresa tu contraseña actual.', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordFeedback({ msg: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ msg: 'Las contraseñas no coinciden.', type: 'error' });
      return;
    }

    setChangingPassword(true);
    setPasswordFeedback(null);

    try {
      // Reautenticar primero
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      // Actualizar contraseña
      await updatePassword(user, newPassword);

      setPasswordFeedback({
        msg: '¡Tu contraseña ha sido actualizada exitosamente! Úsala en tu próximo inicio de sesión.',
        type: 'success',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordFeedback(null), 5000);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      let msg = 'No se pudo actualizar la contraseña.';

      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = 'La contraseña actual ingresada es incorrecta.';
      } else if (code === 'auth/weak-password') {
        msg = 'La nueva contraseña es demasiado débil. Usa al menos 6 caracteres combinando letras y números.';
      } else if (code === 'auth/requires-recent-login') {
        msg = 'Por seguridad, debes volver a iniciar sesión para realizar este cambio.';
      } else if (err instanceof Error) {
        msg = err.message;
      }

      setPasswordFeedback({ msg, type: 'error' });
    } finally {
      setChangingPassword(false);
    }
  };

  // Si no está autenticado, mostrar estado para visitantes
  if (!user) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-[#17191C] text-[#FAF8F4]">
        <div className="max-w-md w-full rounded-3xl border border-[#25282E] bg-[#121417] p-8 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#C69A4B]/15 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] mx-auto shadow-inner">
            <User className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[#C69A4B] block">
              Área Exclusiva para Miembros
            </span>
            <h1 className="font-editorial text-3xl font-bold text-white">
              Perfil de Miembro FAMA
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
              Inicia sesión con tu cuenta de RENACER CHURCH para consultar tu membresía, gestionar tus datos personales y revisar el estado de tus solicitudes congregacionales.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              href="/acceso"
              className="flex-1 py-3 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </Link>
            <Link
              href="/registro"
              className="flex-1 py-3 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-200 border border-[#2E323B] font-medium text-xs transition-all text-center"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleInfo = ROLE_LABELS[profile?.role || 'member'] || ROLE_LABELS.member;
  const currentDisplayName = profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Miembro FAMA';
  const isPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
  const creationDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : profile?.joinedAt
      ? new Date(profile.joinedAt).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Miembro FAMA';

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden min-h-screen">
      
      {/* ========================================================
          1. CABECERA EDITORIAL DE PERFIL
         ======================================================== */}
      <section className="pt-12 sm:pt-16 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="rounded-3xl border border-[#25282E] bg-gradient-to-r from-[#1A1D23] via-[#121417] to-[#121417] p-6 sm:p-10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
            {/* Avatar con botón de carga */}
            <div className="relative group shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#C69A4B]/20 border-2 border-[#C69A4B]/40 flex items-center justify-center text-[#C69A4B] text-2xl sm:text-3xl font-bold font-editorial overflow-hidden shadow-xl">
                {photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoURL}
                    alt={currentDisplayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{currentDisplayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-[#C69A4B] text-[#17191C] hover:bg-[#D4A359] shadow-lg transition-transform hover:scale-110 focus:outline-none"
                title="Cambiar foto de perfil"
                aria-label="Cambiar foto de perfil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Datos Principales */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${roleInfo.badgeClass}`}>
                  {roleInfo.label}
                </span>
                <span className="text-xs text-slate-500 font-mono">Folio: {user.uid.slice(0, 8)}</span>
              </div>

              <h1 className="font-editorial text-2xl sm:text-4xl font-bold text-white tracking-wide">
                {currentDisplayName}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.email}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Miembro desde: {creationDate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Accesos Directos de la Cabecera */}
          <div className="flex items-center gap-3 w-full sm:w-auto z-10 flex-wrap">
            <Link
              href="/iglesia-virtual"
              className="px-4 py-2.5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-2"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Auditorio Virtual</span>
            </Link>

            {profile?.role === 'admin' && (
              <Link
                href="/admin"
                className="px-4 py-2.5 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-200 border border-[#2E323B] font-medium text-xs transition-all flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-[#C69A4B]" />
                <span>Panel Pastoral</span>
              </Link>
            )}

            <button
              onClick={() => signOut()}
              className="px-4 py-2.5 rounded-full bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all flex items-center gap-1.5"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Navegación del Perfil */}
        <div className="flex items-center gap-2 sm:gap-4 mt-6 border-b border-[#25282E] pb-3 overflow-x-auto text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'perfil' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Datos Personales
            {activeTab === 'perfil' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('actividad')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'actividad' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Actividad & Solicitudes
            {activeTab === 'actividad' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('pastoral')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pastoral' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Mi Atención Pastoral</span>
            {activeTab === 'pastoral' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('servicio')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'servicio' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Mi Servicio</span>
            {activeTab === 'servicio' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('recursos')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'recursos' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Préstamos de Recursos</span>
            {activeTab === 'recursos' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('mantenimiento')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mantenimiento' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Instalaciones & Mantenimiento</span>
            {activeTab === 'mantenimiento' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('pedidos')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'pedidos' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mis Pedidos</span>
            {activeTab === 'pedidos' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('seguridad')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'seguridad' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            Seguridad & Contraseña
            {activeTab === 'seguridad' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('notificaciones')}
            className={`pb-2 px-3 font-semibold transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'notificaciones' ? 'text-[#C69A4B]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notificaciones & Avisos</span>
            {activeTab === 'notificaciones' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-0.5 bg-[#C69A4B]" />
            )}
          </button>
        </div>
      </section>

      {/* ========================================================
          2. CONTENIDO PRINCIPAL POR PESTAÑAS
         ======================================================== */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        
        {/* PESTAÑA 1: DATOS PERSONALES */}
        {activeTab === 'perfil' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
            <div className="lg:col-span-8 rounded-3xl border border-[#25282E] bg-[#121417] p-6 sm:p-8 space-y-6 shadow-xl">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-white">
                  Información Personal & Membresía
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Actualiza tus datos para contacto pastoral, grupos de conexión y confirmación de eventos.
                </p>
              </div>

              {profileFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                    profileFeedback.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {profileFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{profileFeedback.msg}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                {/* Nombre y Apellido */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Nombre(s) *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Ej. Juan"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Apellido(s) *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Ej. Pérez"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>
                </div>

                {/* Nombre para Mostrar */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Nombre para Mostrar en el Auditorio & Chat
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                  <p className="text-[11px] text-slate-500">
                    Este es el nombre visible para los demás asistentes en las transmisiones en vivo.
                  </p>
                </div>

                {/* Correo y Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Correo Electrónico (Solo Lectura)</label>
                    <div className="relative">
                      <input
                        type="email"
                        disabled
                        value={user.email || ''}
                        className="w-full bg-[#1A1D23] border border-[#2E323B] rounded-xl px-4 py-2.5 text-slate-400 cursor-not-allowed select-none"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] text-emerald-400 font-semibold">
                        Verificado
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Teléfono / WhatsApp</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                      />
                    </div>
                  </div>
                </div>

                {/* Fecha de Nacimiento y Campus */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Campus Principal</label>
                    <select
                      value={campus}
                      onChange={(e) => setCampus(e.target.value)}
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#C69A4B]"
                    >
                      <option value="virtual">Campus Digital FAMA (Online)</option>
                      <option value="central">Sede Central RENACER (Presencial)</option>
                      <option value="ambos">Híbrido (Presencial & Virtual)</option>
                    </select>
                  </div>
                </div>

                {/* Biografía / Testimonio Breve */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">
                    Breve Testimonio o Biografía (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Comparte brevemente sobre tu caminar en la fe o tu vocación ministerial..."
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="py-3 px-6 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando en el Servidor...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Columna Lateral Informativa */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-6 space-y-4 shadow-xl text-xs">
                <span className="text-[10px] uppercase font-bold text-[#C69A4B] tracking-wider block">
                  Estado de la Membresía
                </span>
                
                <div className="p-4 rounded-2xl bg-[#17191C] border border-[#25282E] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Rol:</span>
                    <strong className="text-white">{roleInfo.label}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Acceso a Cultos:</span>
                    <strong className="text-emerald-400">Habilitado</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Participación en Chat:</span>
                    <strong className="text-emerald-400">Activa</strong>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  Tu cuenta está sincronizada con los servicios litúrgicos de RENACER CHURCH. Los cambios en roles o privilegios son administrados exclusivamente por el equipo pastoral.
                </p>
              </div>

              <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-6 space-y-3 shadow-xl text-xs">
                <span className="text-[10px] uppercase font-bold text-[#C69A4B] tracking-wider block">
                  Accesos Directos
                </span>
                <div className="space-y-2">
                  <Link
                    href="/comunidad"
                    className="flex items-center justify-between p-3 rounded-xl bg-[#17191C] border border-[#2E323B] text-slate-300 hover:text-white hover:border-[#C69A4B] transition-colors"
                  >
                    <span>Grupos de Conexión & Ministerios</span>
                    <Users className="w-4 h-4 text-[#C69A4B]" />
                  </Link>
                  <Link
                    href="/eventos"
                    className="flex items-center justify-between p-3 rounded-xl bg-[#17191C] border border-[#2E323B] text-slate-300 hover:text-white hover:border-[#C69A4B] transition-colors"
                  >
                    <span>Cartelera de Próximos Eventos</span>
                    <Calendar className="w-4 h-4 text-[#C69A4B]" />
                  </Link>
                  <Link
                    href="/cultos"
                    className="flex items-center justify-between p-3 rounded-xl bg-[#17191C] border border-[#2E323B] text-slate-300 hover:text-white hover:border-[#C69A4B] transition-colors"
                  >
                    <span>Horarios Semanales & Predicaciones</span>
                    <ExternalLink className="w-4 h-4 text-[#C69A4B]" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ACTIVIDAD & SOLICITUDES */}
        {activeTab === 'actividad' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Sub-pestañas de Actividad */}
            <div className="flex items-center gap-2 border-b border-[#25282E] pb-3 overflow-x-auto text-xs">
              <button
                onClick={() => setActivitySubTab('grupos')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 ${
                  activitySubTab === 'grupos'
                    ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-md'
                    : 'bg-[#17191C] text-slate-300 hover:text-white border border-[#2E323B]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Grupos de Conexión ({groups.length})</span>
              </button>

              <button
                onClick={() => setActivitySubTab('ministerios')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 ${
                  activitySubTab === 'ministerios'
                    ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-md'
                    : 'bg-[#17191C] text-slate-300 hover:text-white border border-[#2E323B]'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Ministerios & Servicio ({ministries.length})</span>
              </button>

              <button
                onClick={() => setActivitySubTab('eventos')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 ${
                  activitySubTab === 'eventos'
                    ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-md'
                    : 'bg-[#17191C] text-slate-300 hover:text-white border border-[#2E323B]'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Inscripciones a Eventos ({events.length})</span>
              </button>

              <button
                onClick={() => setActivitySubTab('oraciones')}
                className={`py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 ${
                  activitySubTab === 'oraciones'
                    ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-md'
                    : 'bg-[#17191C] text-slate-300 hover:text-white border border-[#2E323B]'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Peticiones de Oración ({prayers.length})</span>
              </button>
            </div>

            {loadingActivity ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-[#C69A4B]" />
                <span>Cargando tu historial congregacional...</span>
              </div>
            ) : (
              <>
                {/* 1. Solicitudes a Grupos de Conexión */}
                {activitySubTab === 'grupos' && (
                  <div>
                    {groups.length === 0 ? (
                      <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 text-center space-y-4 shadow-xl">
                        <Users className="w-12 h-12 text-slate-600 mx-auto" />
                        <div className="space-y-1">
                          <h3 className="font-editorial text-xl font-bold text-white">
                            Sin solicitudes activas a Grupos de Conexión
                          </h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Los grupos de conexión son el corazón de la comunión fraternal en RENACER CHURCH. Explora los grupos disponibles por zona y horario.
                          </p>
                        </div>
                        <Link
                          href="/comunidad"
                          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide transition-all shadow-md"
                        >
                          <span>Explorar Grupos de Conexión</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groups.map((g) => {
                          const badge = STATUS_BADGES[g.status] || STATUS_BADGES.pending;
                          return (
                            <div
                              key={g.id}
                              className="rounded-2xl border border-[#25282E] bg-[#121417] p-5 space-y-3 shadow-lg text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white text-sm">
                                  {g.targetName || g.groupName}
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <p className="text-slate-400 text-[11px]">
                                Categoría: <strong className="text-slate-300">{g.category || 'General'}</strong>
                              </p>

                              {g.notes && (
                                <p className="text-slate-400 text-[11px] italic bg-[#17191C] p-2.5 rounded-xl border border-[#2E323B]">
                                  &quot;{g.notes}&quot;
                                </p>
                              )}

                              <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[10px] text-slate-500">
                                <span>Solicitado el: {new Date(g.createdAt).toLocaleDateString('es-ES')}</span>
                                {g.reviewedAt && (
                                  <span>Revisado: {new Date(g.reviewedAt).toLocaleDateString('es-ES')}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Postulaciones a Ministerios */}
                {activitySubTab === 'ministerios' && (
                  <div>
                    {ministries.length === 0 ? (
                      <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 text-center space-y-4 shadow-xl">
                        <HeartHandshake className="w-12 h-12 text-slate-600 mx-auto" />
                        <div className="space-y-1">
                          <h3 className="font-editorial text-xl font-bold text-white">
                            Aún no te has postulado a un ministerio
                          </h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Dios te ha dado dones preciosos para la edificación de su cuerpo. Consulta las áreas de alabanza, multimedia, bienvenida y servicio.
                          </p>
                        </div>
                        <Link
                          href="/comunidad"
                          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide transition-all shadow-md"
                        >
                          <span>Ver Ministerios & Requisitos</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ministries.map((m) => {
                          const badge = STATUS_BADGES[m.status] || STATUS_BADGES.pending;
                          return (
                            <div
                              key={m.id}
                              className="rounded-2xl border border-[#25282E] bg-[#121417] p-5 space-y-3 shadow-lg text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white text-sm">
                                  {m.targetName || m.ministryName}
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                                  {badge.label}
                                </span>
                              </div>

                              {m.experience && (
                                <p className="text-slate-400 text-[11px]">
                                  Experiencia: <span className="text-slate-300">{m.experience}</span>
                                </p>
                              )}

                              {m.availability && (
                                <p className="text-slate-400 text-[11px]">
                                  Disponibilidad: <span className="text-slate-300">{m.availability}</span>
                                </p>
                              )}

                              <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[10px] text-slate-500">
                                <span>Postulado el: {new Date(m.createdAt).toLocaleDateString('es-ES')}</span>
                                {m.reviewedAt && (
                                  <span>Revisado: {new Date(m.reviewedAt).toLocaleDateString('es-ES')}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Inscripciones a Eventos */}
                {activitySubTab === 'eventos' && (
                  <div>
                    {events.length === 0 ? (
                      <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 text-center space-y-4 shadow-xl">
                        <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
                        <div className="space-y-1">
                          <h3 className="font-editorial text-xl font-bold text-white">
                            No tienes inscripciones a eventos registradas
                          </h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Participa en conferencias, retiros, vigilias y conciertos especiales organizados por RENACER CHURCH.
                          </p>
                        </div>
                        <Link
                          href="/eventos"
                          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide transition-all shadow-md"
                        >
                          <span>Consultar Cartelera de Eventos</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {events.map((evt) => {
                          const badge = STATUS_BADGES[evt.status] || STATUS_BADGES.confirmed;
                          return (
                            <div
                              key={evt.id}
                              className="rounded-2xl border border-[#25282E] bg-[#121417] p-5 space-y-3 shadow-lg text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white text-sm">
                                  {evt.eventName || evt.eventTitle}
                                </span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.badgeClass}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-[#17191C] p-2.5 rounded-xl border border-[#2E323B]">
                                <span>Código de Confirmación:</span>
                                <strong className="font-mono text-[#C69A4B]">{evt.registrationCode || evt.id.slice(0, 8)}</strong>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-400">
                                <span>Cupos Registrados:</span>
                                <strong className="text-white">{evt.attendeesCount} persona(s)</strong>
                              </div>

                              <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[10px] text-slate-500">
                                <span>Inscrito el: {new Date(evt.registeredAt || evt.createdAt).toLocaleDateString('es-ES')}</span>
                                {(evt.emailDeliveryStatus === 'sent' || evt.confirmationEmailStatus === 'sent') && (
                                  <span className="text-emerald-400">Comprobante enviado al correo</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Peticiones de Oración Publicadas */}
                {activitySubTab === 'oraciones' && (
                  <div>
                    {prayers.length === 0 ? (
                      <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-12 text-center space-y-4 shadow-xl">
                        <Heart className="w-12 h-12 text-slate-600 mx-auto" />
                        <div className="space-y-1">
                          <h3 className="font-editorial text-xl font-bold text-white">
                            No has publicado motivos de oración aún
                          </h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto">
                            Comparte tus peticiones de salud, familia o gratitud para que la congregación se una contigo en clamor.
                          </p>
                        </div>
                        <Link
                          href="/comunidad"
                          className="inline-flex items-center gap-2 py-2.5 px-5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide transition-all shadow-md"
                        >
                          <span>Publicar Petición en el Muro</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {prayers.map((pr) => (
                          <div
                            key={pr.id}
                            className="rounded-2xl border border-[#25282E] bg-[#121417] p-5 space-y-3 shadow-lg text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1A1D23] text-[#C69A4B] border border-[#2E323B]">
                                {pr.category}
                              </span>
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 fill-emerald-400" />
                                {pr.prayersCount || 0} oraciones unidas
                              </span>
                            </div>

                            <p className="text-slate-200 text-xs leading-relaxed font-light">
                              &quot;{pr.requestText}&quot;
                            </p>

                            <div className="pt-2 border-t border-[#1E2D4A]/50 flex items-center justify-between text-[10px] text-slate-500">
                              <span>Modo: {pr.isAnonymous ? 'Anónimo' : 'Público'}</span>
                              <span className="text-[#C69A4B]">Intercesión FAMA</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PESTAÑA 3: SEGURIDAD & CONTRASEÑA */}
        {activeTab === 'seguridad' && (
          <div className="max-w-2xl rounded-3xl border border-[#25282E] bg-[#121417] p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
            <div>
              <h2 className="font-editorial text-2xl font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#C69A4B]" />
                <span>Seguridad de la Cuenta</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Gestiona tus credenciales de acceso para mantener protegida tu cuenta congregacional.
              </p>
            </div>

            {passwordFeedback && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
                }`}
              >
                {passwordFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{passwordFeedback.msg}</span>
              </div>
            )}

            {isPasswordProvider ? (
              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Contraseña Actual *</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Nueva Contraseña *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block">Confirmar Nueva Contraseña *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la nueva contraseña"
                      className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="py-3 px-6 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Actualizando Contraseña...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Actualizar Contraseña</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 rounded-2xl bg-[#17191C] border border-[#2E323B] space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#C69A4B] font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Inicio de Sesión Gestionado por Google</span>
                </div>
                <p className="text-slate-400 leading-relaxed font-light">
                  Tu cuenta inició sesión con Google Workspace ({user.email}). La autenticación multifactor y la contraseña son administradas de forma segura directamente por tu cuenta de Google.
                </p>
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA: MI ATENCIÓN PASTORAL (ETAPA 10) */}
        {activeTab === 'pastoral' && (
          <div className="animate-in fade-in">
            <MemberPastoralPortal onOpenNotifications={() => setActiveTab('notificaciones')} />
          </div>
        )}

        {/* PESTAÑA: MI SERVICIO Y VOLUNTARIADO (ETAPA 11) */}
        {activeTab === 'servicio' && (
          <div className="animate-in fade-in">
            <MemberServicePortal onOpenNotifications={() => setActiveTab('notificaciones')} />
          </div>
        )}

        {/* PESTAÑA: INVENTARIO Y PRÉSTAMOS DE RECURSOS (ETAPA 12) */}
        {activeTab === 'recursos' && (
          <div className="animate-in fade-in">
            <MemberInventoryPortal onOpenNotifications={() => setActiveTab('notificaciones')} />
          </div>
        )}

        {/* PESTAÑA: INSTALACIONES Y MANTENIMIENTO (ETAPA 13) */}
        {activeTab === 'mantenimiento' && (
          <div className="animate-in fade-in">
            <MemberFacilityPortal />
          </div>
        )}

        {/* PESTAÑA: MIS PEDIDOS FAMA STORE */}
        {activeTab === 'pedidos' && (
          <div className="animate-in fade-in">
            <MemberOrdersPortal />
          </div>
        )}

        {/* PESTAÑA 4: NOTIFICACIONES & COMUNICACIONES */}
        {activeTab === 'notificaciones' && (
          <div className="animate-in fade-in">
            <NotificationsCenter />
          </div>
        )}

      </section>

    </div>
  );
}
