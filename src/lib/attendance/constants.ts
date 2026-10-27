/**
 * FAMA — Catálogo Institucional y Constantes de Asistencia y Seguimiento Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 */

import {
  AttendanceSessionType,
  AttendanceSessionStatus,
  VisitorStatus,
  VisitorPreferredContact,
  FollowUpContactType,
  FollowUpResult,
  FollowUpStatus,
} from '@/types/models';

export const SESSION_TYPES: Record<
  AttendanceSessionType,
  { label: string; description: string; badgeColor: string }
> = {
  culto_dominical: {
    label: 'Culto Dominical',
    description: 'Celebración congregacional principal de adoración y predicación.',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  culto_miercoles: {
    label: 'Miércoles de Estudio y Poder',
    description: 'Enseñanza bíblica profunda y tiempo de clamor.',
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  jovenes: {
    label: 'Reunión de Jóvenes',
    description: 'Encuentro juvenil, alabanza contemporánea y dinámicas.',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  oracion: {
    label: 'Vigilia / Clamor de Oración',
    description: 'Tiempo consagrado de intercesión y guerra espiritual.',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  grupo_conexion: {
    label: 'Grupo de Conexión',
    description: 'Reunión celular en hogares para edificación comunitaria.',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  liderazgo: {
    label: 'Reunión Pastoral / Liderazgo',
    description: 'Capacitación y planificación con diáconos, ancianos y servidores.',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  especial: {
    label: 'Servicio Especial / Conferencia',
    description: 'Aniversario, congreso, noche de talentos o concierto.',
    badgeColor: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  },
};

export const SESSION_STATUS_LABELS: Record<
  AttendanceSessionStatus,
  { label: string; badgeColor: string }
> = {
  active: {
    label: 'En Curso / Abierta',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  closed: {
    label: 'Cerrada / Finalizada',
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
  cancelled: {
    label: 'Cancelada',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

export const VISITOR_STATUS_LABELS: Record<
  VisitorStatus,
  { label: string; badgeColor: string }
> = {
  nuevo: {
    label: 'Primera Vez',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  en_seguimiento: {
    label: 'En Seguimiento',
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  integrado: {
    label: 'Integrado / Miembro',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  no_contactar: {
    label: 'No Contactar',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

export const CONTACT_METHOD_LABELS: Record<
  VisitorPreferredContact,
  { label: string; icon: string }
> = {
  whatsapp: { label: 'WhatsApp', icon: 'MessageSquare' },
  call: { label: 'Llamada Telefónica', icon: 'Phone' },
  email: { label: 'Correo Electrónico', icon: 'Mail' },
  none: { label: 'Sin Preferencia / Ninguno', icon: 'XCircle' },
};

export const FOLLOWUP_CONTACT_TYPES: Record<
  FollowUpContactType,
  { label: string; description: string }
> = {
  whatsapp: { label: 'Mensaje WhatsApp', description: 'Saludo pastoral y versículo' },
  llamada: { label: 'Llamada Pastoral', description: 'Conversación directa para orar' },
  visita: { label: 'Visita Pastoral', description: 'Visita presencial acordada' },
  correo: { label: 'Correo Electrónico', description: 'Carta de bienvenida y recursos' },
  reunion_pastoral: { label: 'Reunión Pastoral', description: 'Cita en el templo u oficina' },
  otro: { label: 'Otro Contacto', description: 'Acercamiento en culto u otro medio' },
};

export const FOLLOWUP_RESULTS: Record<
  FollowUpResult,
  { label: string; badgeColor: string }
> = {
  contactado_positivo: {
    label: 'Contactado — Muy Receptivo',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  contactado_neutro: {
    label: 'Contactado — Neutro / Amable',
    badgeColor: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  no_respondio: {
    label: 'No Respondió / Buzón',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  numero_equivocado: {
    label: 'Número Equivocado / Inválido',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  solicito_oracion: {
    label: 'Solicitó Oración / Consejería',
    badgeColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  solicito_no_contactar: {
    label: 'Solicitó No Volver a Contactar',
    badgeColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  visita_agendada: {
    label: 'Visita o Reunión Agendada',
    badgeColor: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
};

export const FOLLOWUP_STATUS_LABELS: Record<
  FollowUpStatus,
  { label: string; badgeColor: string }
> = {
  pending: {
    label: 'Pendiente',
    badgeColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  completed: {
    label: 'Completado',
    badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelado',
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  },
};

export const HOW_DID_YOU_HEAR_OPTIONS: Record<string, string> = {
  amigo_familiar: 'Amigo o Familiar',
  redes_sociales: 'Redes Sociales (Instagram / Facebook / YouTube)',
  sitio_web: 'Sitio Web / Búsqueda en Google',
  evento_publico: 'Evento Público / Campaña Evangelística',
  otro: 'Otro Medio',
};

export function isFollowUpOverdue(dueDate?: string, status?: FollowUpStatus): boolean {
  if (!dueDate || status !== 'pending') return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
}
