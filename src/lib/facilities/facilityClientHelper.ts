/**
 * FAMA — Helper de Cliente para Gestión de Instalaciones y Mantenimiento
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN CLIENTE (React Components).
 * Libre de dependencias de servidor y Firebase Admin SDK.
 */

import {
  UserProfile,
  FacilityArea,
  FacilityOperationalStatus,
  MaintenanceTicketStatus,
  PreventiveTask,
  PreventiveFrequency,
} from '@/types/models';

/**
 * Determina si el usuario tiene privilegios para gestionar globalmente instalaciones,
 * asignar tareas técnicas, programar mantenimientos y autorizar verificaciones.
 * Regla: Solo administradores globales o encargados con facilityAccess explícito.
 * Los coordinadores o miembros estándar NO reciben permisos adicionales automáticamente.
 */
export function canManageFacilities(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return profile.facilityAccess === true;
}

/**
 * Verifica si el usuario puede ver costos financieros (repuestos, materiales, presupuestos).
 * Regla estricta: Únicamente administradores autorizados.
 */
export function canViewFacilityFinancials(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.role === 'admin';
}

/**
 * Verifica si el usuario es responsable asignado de un área específica.
 */
export function isAreaManager(profile: UserProfile | null, facility: FacilityArea): boolean {
  if (!profile) return false;
  if (canManageFacilities(profile)) return true;
  if (facility.managerUid && facility.managerUid === profile.uid) return true;
  if (profile.assignedFacilityIds && profile.assignedFacilityIds.includes(facility.id)) return true;
  return false;
}

/**
 * Determina si una tarea preventiva programada está vencida.
 */
export function isPreventiveTaskOverdue(task: PreventiveTask): boolean {
  if (task.status === 'completado' || task.status === 'cancelado') return false;
  const today = new Date().toISOString().split('T')[0];
  return task.scheduledDate < today;
}

/**
 * Mapeo de configuraciones visuales para estados operativos de instalaciones
 */
export const FACILITY_STATUS_CONFIG: Record<
  FacilityOperationalStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  operativo: {
    label: 'Operativo',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-400',
    border: 'border-emerald-600/40',
  },
  mantenimiento: {
    label: 'En Mantenimiento',
    bg: 'bg-amber-950/60',
    text: 'text-amber-400',
    border: 'border-amber-600/40',
  },
  restringido: {
    label: 'Acceso Restringido',
    bg: 'bg-orange-950/60',
    text: 'text-orange-400',
    border: 'border-orange-600/40',
  },
  fuera_de_servicio: {
    label: 'Fuera de Servicio',
    bg: 'bg-rose-950/70',
    text: 'text-rose-400',
    border: 'border-rose-600/50',
  },
};

/**
 * Mapeo de configuraciones visuales para estados de solicitudes/incidencias
 */
export const TICKET_STATUS_CONFIG: Record<
  MaintenanceTicketStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  reportado: {
    label: 'Reportado',
    bg: 'bg-slate-800/80',
    text: 'text-slate-300',
    border: 'border-slate-700',
  },
  en_revision: {
    label: 'En Revisión',
    bg: 'bg-sky-950/60',
    text: 'text-sky-300',
    border: 'border-sky-800/40',
  },
  asignado: {
    label: 'Asignado',
    bg: 'bg-indigo-950/60',
    text: 'text-indigo-300',
    border: 'border-indigo-800/40',
  },
  en_proceso: {
    label: 'En Proceso',
    bg: 'bg-amber-950/60',
    text: 'text-amber-300',
    border: 'border-amber-800/40',
  },
  pendiente_materiales: {
    label: 'Pend. Materiales',
    bg: 'bg-purple-950/60',
    text: 'text-purple-300',
    border: 'border-purple-800/40',
  },
  completado: {
    label: 'Completado & Verificado',
    bg: 'bg-emerald-950/60',
    text: 'text-emerald-300',
    border: 'border-emerald-800/40',
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-zinc-800/80',
    text: 'text-zinc-400',
    border: 'border-zinc-700',
  },
};

/**
 * Protocolos e instrucciones de seguridad ante riesgos de emergencia inmediata
 */
export const EMERGENCY_PROTOCOLS: Record<
  string,
  { title: string; instructions: string[]; contactNotice: string; alertColor: string }
> = {
  electrico: {
    title: 'PELIGRO ELÉCTRICO INMEDIATO',
    instructions: [
      'NO tocar cables expuestos, interruptores humedecidos o equipos chispeantes.',
      'Despejar y acordonar el área afectada para impedir el paso de personas y niños.',
      'Si es seguro hacerlo desde el tablero principal exterior, desconectar el disyuntor correspondiente.',
    ],
    contactNotice: 'Contactar de urgencia al electricista matriculado de la iglesia o a Bomberos / Servicios de Emergencia.',
    alertColor: 'border-rose-600 bg-rose-950/70 text-rose-200',
  },
  gas: {
    title: 'POSIBLE FUGA / OLOR A GAS',
    instructions: [
      'EVACUAR de inmediato el área y dependencias contiguas.',
      'NO encender luces, fósforos, teléfonos ni accionar timbres o interruptores.',
      'Abrir puertas y ventanas si es seguro durante la salida hacia el exterior.',
      'Cerrar la llave de paso general del cilindro o tubería exterior si no hay riesgo de inhalación.',
    ],
    contactNotice: 'Llamar de inmediato a Bomberos / Emergencias (911) desde una zona segura al aire libre.',
    alertColor: 'border-red-600 bg-red-950/80 text-red-200',
  },
  inundacion: {
    title: 'INUNDACIÓN O FILTRACIÓN MAYOR',
    instructions: [
      'Cortar la llave de paso de agua principal inmediatamente.',
      'Desconectar la energía eléctrica del sector si el agua se aproxima a tomas o cables.',
      'Evitar el ingreso al área para prevenir resbalones o shock eléctrico.',
    ],
    contactNotice: 'Notificar al equipo de mantenimiento y plomería de guardia.',
    alertColor: 'border-blue-600 bg-blue-950/70 text-blue-200',
  },
  estructural: {
    title: 'RIESGO ESTRUCTURAL O COLAPSO',
    instructions: [
      'Prohibir terminantemente el ingreso al salón, escenario o pasillo afectado.',
      'Instalar señalización de peligro y cintas de advertencia en todos los accesos.',
      'No manipular elementos suspendidos ni retirar escombros sin peritaje.',
    ],
    contactNotice: 'Contactar a la dirección pastoral y a personal técnico de ingeniería o defensa civil.',
    alertColor: 'border-amber-600 bg-amber-950/70 text-amber-200',
  },
  general: {
    title: 'INCIDENCIA CRÍTICA / URGENTE',
    instructions: [
      'Mantener la calma y evacuar al personal o congregación del perímetro comprometido.',
      'Avisar de inmediato al coordinador de seguridad o encargado de turno.',
    ],
    contactNotice: 'Atención prioritaria por el equipo de administración de instalaciones.',
    alertColor: 'border-rose-600 bg-rose-950/70 text-rose-200',
  },
};

/**
 * Frecuencias de mantenimiento preventivo legibles
 */
export const FREQUENCY_LABELS: Record<PreventiveFrequency, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};
