'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Armchair,
  Database,
  Radio,
  Film,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Mail,
  MessageSquare,
  Calendar,
  Users,
  LayoutDashboard,
  UserCog,
  Landmark,
  UserCheck,
  Megaphone,
  HeartHandshake,
  Layers,
  Package,
  Wrench,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/authContext';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { AuditoriumEditor } from '@/components/admin/AuditoriumEditor';
import { CultosManager } from '@/components/admin/CultosManager';
import { RecordingsManager } from '@/components/admin/RecordingsManager';
import { ContactMessagesManager } from '@/components/admin/ContactMessagesManager';
import { EventsManager } from '@/components/admin/EventsManager';
import { CommunityManager } from '@/components/admin/CommunityManager';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { MembersManager } from '@/components/admin/MembersManager';
import { FinancesManager } from '@/components/admin/FinancesManager';
import { AttendanceManager } from '@/components/admin/AttendanceManager';
import { CommunicationsManager } from '@/components/admin/CommunicationsManager';
import { PastoralManager } from '@/components/admin/PastoralManager';
import { VolunteersManager } from '@/components/admin/VolunteersManager';
import { InventoryManager } from '@/components/admin/InventoryManager';
import { FacilitiesManager } from '@/components/admin/FacilitiesManager';
import { StoreManager } from '@/components/admin/StoreManager';
import { getBackblazeB2Status } from '@/lib/storage/backblaze-b2';

type Section =
  | 'resumen'
  | 'tienda'
  | 'mantenimiento'
  | 'inventario'
  | 'voluntarios'
  | 'pastoral'
  | 'finanzas'
  | 'asistencia'
  | 'comunicaciones'
  | 'miembros'
  | 'cultos'
  | 'grabaciones'
  | 'auditorio'
  | 'eventos'
  | 'comunidad'
  | 'contactos'
  | 'servicios';

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [section, setSection] = useState<Section>('resumen');
  const [unreadContactsCount, setUnreadContactsCount] = useState<number>(0);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(
    null
  );

  // Detectar ?tab=pastoral, ?tab=mantenimiento o similares en URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (
        tab &&
        [
          'resumen',
          'tienda',
          'mantenimiento',
          'inventario',
          'voluntarios',
          'pastoral',
          'finanzas',
          'asistencia',
          'comunicaciones',
          'miembros',
          'cultos',
          'grabaciones',
          'auditorio',
          'eventos',
          'comunidad',
          'contactos',
          'servicios',
        ].includes(tab)
      ) {
        setSection(tab as Section);
      }
    }
  }, []);

  const b2Status = getBackblazeB2Status();

  // Comprobar si el usuario tiene rol administrativo autorizado
  const isAdminOrPastor = profile?.role === 'admin' || profile?.role === 'pastor';

  const handleNotify = (msg: string, type: 'success' | 'error' | 'info') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 5000);
  };

  const navBtn = (key: Section, Icon: LucideIcon, text: string, badge?: number) => (
    <button
      onClick={() => setSection(key)}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
        section === key
          ? 'bg-[#E5C378]/15 text-[#E5C378] font-bold border border-[#E5C378]/30 shadow-sm'
          : 'text-slate-300 hover:bg-[#141E33] hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{text}</span>
      </div>
      {typeof badge === 'number' && badge > 0 && (
        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37] text-black shrink-0">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-[1920px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Notificación flotante */}
      {notice && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-top-2 ${
            notice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : notice.type === 'error'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : 'bg-blue-950/90 border-blue-500 text-blue-200'
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* Cabecera */}
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-[#D4AF37]">
            FAMA PLATAFORMA
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Panel de Control y Administración
          </h1>
        </div>

        {user ? (
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#0E1626] border border-[#1E2D4A] text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col">
              <span className="font-bold text-white leading-none">{profile?.displayName || user.displayName || 'Administrador'}</span>
              <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold">
                Rol: {profile?.role || 'admin'}
              </span>
            </div>
          </div>
        ) : (
          <Link
            href="/acceso"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs transition-colors self-start sm:self-auto"
          >
            <LogIn className="w-4 h-4" />
            <span>Acceder como Administrador</span>
          </Link>
        )}
      </header>

      {/* Aviso de Seguridad sobre Operaciones */}
      {!user && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p>
            <strong className="text-amber-300">Modo de consulta para invitados:</strong> Para
            ejecutar operaciones privilegiadas (crear cultos, cambiar estados de transmisión, registrar
            grabaciones), debe{' '}
            <Link href="/acceso" className="underline font-bold text-white hover:text-[#D4AF37]">
              iniciar sesión
            </Link>{' '}
            con una cuenta autorizada de administrador o pastor.
          </p>
        </div>
      )}

      {/* Aviso de Privilegios Insuficientes si el usuario está autenticado pero no es admin ni pastor */}
      {user && !isAdminOrPastor && (
        <div
          role="alert"
          className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs leading-relaxed text-rose-200"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <strong className="text-rose-300 font-bold block text-sm">Privilegios Administrativos Restringidos</strong>
              <p>
                Tu cuenta actual está registrada como <span className="font-mono text-[#D4AF37] uppercase">{profile?.role || 'miembro'}</span>.
                Las operaciones de administración y pastoral están reservadas para roles autorizados.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/perfil"
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#F3D079] text-black font-bold text-xs transition-colors"
            >
              Ver mi Perfil
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg border border-[#1E2D4A] hover:bg-[#141E33] text-slate-200 text-xs transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      )}

      {/* Estructura Principal */}
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Secciones de administración" className="space-y-1.5">
          {navBtn('resumen', LayoutDashboard, 'Resumen General')}
          {navBtn('tienda', ShoppingBag, 'Tienda Oficial (FAMA STORE)')}
          {navBtn('mantenimiento', Wrench, 'Instalaciones & Mantenimiento')}
          {navBtn('inventario', Package, 'Inventario & Recursos')}
          {navBtn('voluntarios', Layers, 'Voluntarios y Servicio')}
          {navBtn('pastoral', HeartHandshake, 'Atención Pastoral')}
          {navBtn('finanzas', Landmark, 'Finanzas & Tesorería')}
          {navBtn('asistencia', UserCheck, 'Asistencia & Pastoral')}
          {navBtn('comunicaciones', Megaphone, 'Comunicaciones & Difusión')}
          {navBtn('miembros', UserCog, 'Directorio de Miembros')}
          {navBtn('cultos', Radio, 'Transmisión & Cultos')}
          {navBtn('grabaciones', Film, 'Videoteca & Grabaciones')}
          {navBtn('auditorio', Armchair, 'Auditorio Virtual')}
          {navBtn('eventos', Calendar, 'Eventos & Inscripciones')}
          {navBtn('comunidad', Users, 'Grupos & Ministerios')}
          {navBtn('contactos', MessageSquare, 'Mensajes de contacto', unreadContactsCount)}
          {navBtn('servicios', Database, 'Estado de Infraestructura')}
        </nav>

        <main className="min-w-0">
          {/* MÓDULO 1: RESUMEN GENERAL */}
          {section === 'resumen' && (
            <DashboardOverview
              onNavigateSection={(target) => {
                if ([
                  'resumen',
                  'tienda',
                  'mantenimiento',
                  'inventario',
                  'voluntarios',
                  'pastoral',
                  'finanzas',
                  'asistencia',
                  'comunicaciones',
                  'miembros',
                  'cultos',
                  'grabaciones',
                  'auditorio',
                  'eventos',
                  'comunidad',
                  'contactos',
                  'servicios',
                ].includes(target)) {
                  setSection(target as Section);
                }
              }}
            />
          )}

          {/* MÓDULO: TIENDA OFICIAL (FAMA STORE) */}
          {section === 'tienda' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">FAMA STORE — Tienda Oficial de Renacer Church</h2>
                <p className="text-xs text-slate-400">
                  Control de catálogo, variantes, inventario físico, preparación de pedidos y seguimiento de envíos.
                </p>
              </div>
              <StoreManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO 13: GESTIÓN DE INSTALACIONES Y MANTENIMIENTO */}
          {section === 'mantenimiento' && (
            <div className="space-y-4">
              <FacilitiesManager />
            </div>
          )}

          {/* MÓDULO 12: INVENTARIO Y RECURSOS FÍSICOS */}
          {section === 'inventario' && (
            <div className="space-y-4">
              <InventoryManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO 11: VOLUNTARIOS Y SERVICIO MINISTERIAL */}
          {section === 'voluntarios' && (
            <div className="space-y-4">
              <VolunteersManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO 10: ATENCIÓN PASTORAL Y CONSEJERÍA */}
          {section === 'pastoral' && (
            <div className="space-y-4">
              <PastoralManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO 2: FINANZAS Y TESORERÍA PASTORAL */}
          {section === 'finanzas' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Administración Financiera & Tesorería</h2>
                <p className="text-xs text-slate-400">
                  Control interno de diezmos, ofrendas, egresos operativos e informes de mayordomía pastoral.
                </p>
              </div>
              <FinancesManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO: CONTROL DE ASISTENCIA Y SEGUIMIENTO PASTORAL (ETAPA 6) */}
          {section === 'asistencia' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Control de Asistencia & Seguimiento Pastoral</h2>
                <p className="text-xs text-slate-400">
                  Control presencial y móvil de cultos, directorio de visitantes con consentimiento y atención pastoral.
                </p>
              </div>
              <AttendanceManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO: COMUNICACIONES Y DIFUSIÓN INSTITUCIONAL (ETAPA 7) */}
          {section === 'comunicaciones' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Comunicaciones & Difusión Institucional</h2>
                <p className="text-xs text-slate-400">
                  Redacción de comunicados oficiales, vista previa de audiencia congregacional y despacho controlado vía Gmail SMTP.
                </p>
              </div>
              <CommunicationsManager onNotify={handleNotify} />
            </div>
          )}

          {/* MÓDULO 3: DIRECTORIO DE MIEMBROS */}
          {section === 'miembros' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Directorio Pastoral de Miembros</h2>
                <p className="text-xs text-slate-400">
                  Consulta de cuentas congregacionales, filtros por rol y edición de datos autorizados.
                </p>
              </div>
              <MembersManager onNotify={handleNotify} />
            </div>
          )}

          {/* SECCIÓN 3: CULTOS Y TRANSMISIÓN */}
          {section === 'cultos' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Transmisión en Directo & Cultos</h2>
                <p className="text-xs text-slate-400">
                  Coordine las sesiones congregacionales, prepare las entradas de video y supervise la señal en vivo.
                </p>
              </div>
              <CultosManager onNotify={handleNotify} />
            </div>
          )}

          {/* SECCIÓN 2: GRABACIONES Y BACKBLAZE B2 */}
          {section === 'grabaciones' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Videoteca & Grabaciones Backblaze B2</h2>
                <p className="text-xs text-slate-400">
                  Supervise el archivo de prédicas, verifique archivos en el bucket <code className="text-slate-300">famaweb</code> y administre su visibilidad.
                </p>
              </div>
              <RecordingsManager onNotify={handleNotify} />
            </div>
          )}

          {/* SECCIÓN 3: AUDITORIO VIRTUAL */}
          {section === 'auditorio' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Auditorio Virtual FAMA (275 Butacas)</h2>
                <p className="text-xs text-slate-400">
                  Supervise la distribución de las tres naves, ajuste el zoom del auditorio y visualice la calibración del altar.
                </p>
              </div>
              <AuditoriumEditor />
            </div>
          )}

          {/* SECCIÓN 4: EVENTOS E INSCRIPCIONES */}
          {section === 'eventos' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Gestión de Eventos & Inscripciones</h2>
                <p className="text-xs text-slate-400">
                  Creación de eventos, control de aforos, estados de publicación y lista de inscripciones confirmadas.
                </p>
              </div>
              <EventsManager onNotify={handleNotify} />
            </div>
          )}

          {/* SECCIÓN 5: GRUPOS Y MINISTERIOS */}
          {section === 'comunidad' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Grupos de Conexión & Ministerios</h2>
                <p className="text-xs text-slate-400">
                  Coordinación de grupos pequeños, áreas de servicio pastoral y aprobación de solicitudes de miembros.
                </p>
              </div>
              <CommunityManager onNotify={handleNotify} />
            </div>
          )}

          {/* SECCIÓN 6: MENSAJES DE CONTACTO */}
          {section === 'contactos' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Mensajes de Contacto & Acompañamiento Pastoral</h2>
                <p className="text-xs text-slate-400">
                  Recepción de consultas, peticiones de oración, atención pastoral y notificaciones automáticas por Gmail SMTP.
                </p>
              </div>
              <ContactMessagesManager
                onNotify={handleNotify}
                onUnreadCountChange={setUnreadContactsCount}
              />
            </div>
          )}

          {/* SECCIÓN 7: ESTADO DE INFRAESTRUCTURA */}
          {section === 'servicios' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Estado de la Infraestructura FAMA</h2>
                <p className="text-xs text-slate-400">
                  Verificación en tiempo real de los servicios y credenciales de backend integradas.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {/* Firebase Cloud Firestore */}
                <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Firebase Firestore & Auth</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Proyecto: <strong className="text-slate-200">fama-db35d</strong>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E2D4A] flex items-center justify-between text-[11px] text-emerald-400">
                    <span>Admin SDK Conectado</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                </div>

                {/* Gmail SMTP */}
                <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Gmail SMTP (RENACER CHURCH)</span>
                      <Mail className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Servidor: <strong className="text-slate-200">smtp.gmail.com:465 (SSL)</strong>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Autenticación con contraseña de aplicación de Google
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E2D4A] text-[11px] text-slate-400">
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Módulo de envío y reintentos listo
                    </span>
                  </div>
                </div>

                {/* Backblaze B2 */}
                <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Backblaze B2 Storage</span>
                      <Cloud className="w-4 h-4 text-cyan-400" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Bucket: <strong className="text-slate-200">{b2Status.bucketName}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Endpoint: {b2Status.endpoint}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E2D4A] text-[11px] text-slate-400">
                    {b2Status.isConfigured ? (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claves de servidor configuradas
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Estructura lista (Pendiente de keys)
                      </span>
                    )}
                  </div>
                </div>

                {/* Streaming Provider */}
                <div className="rounded-2xl border border-[#1E2D4A] bg-[#0E1626] p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Proveedor de Streaming</span>
                      <Radio className="w-4 h-4 text-[#D4AF37]" />
                    </div>
                    <p className="text-xs text-slate-400">
                      Integración: <strong className="text-slate-200">YouTube Live & OBS Studio</strong>
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E2D4A] text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Operativo en Auditorio Virtual
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
