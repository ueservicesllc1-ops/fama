/**
 * FAMA — Helper de Cliente para Inventario y Gestión de Recursos
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN CLIENTE (React Components).
 * Libre de dependencias de servidor y Firebase Admin SDK.
 */

import {
  UserProfile,
  ResourceLoan,
  ResourceStatus,
  LoanStatus,
  ResourceCategory,
  RESOURCE_CATEGORIES,
} from '@/types/models';

/**
 * Determina si el usuario tiene privilegios para gestionar el inventario,
 * aprobar préstamos, registrar devoluciones y gestionar reparaciones.
 * Regla: Solo administradores globales o encargados con inventoryAccess explícito.
 * Los pastores o coordinadores estándar NO reciben permisos adicionales automáticamente.
 */
export function canManageInventory(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (profile.inventoryAccess === true) return true;
  return false;
}

/**
 * Determina si el usuario tiene autorización para ver datos financieros
 * como costos de adquisición y costos de reparación.
 * Regla estricta: Solo 'admin'.
 */
export function canViewFinancials(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  return profile.role === 'admin';
}

/**
 * Comprueba si un préstamo se encuentra vencido.
 * Condiciones: estado 'entregado' y fecha prevista anterior a la fecha actual.
 */
export function isLoanOverdue(loan: ResourceLoan): boolean {
  if (loan.status !== 'entregado') return false;
  if (!loan.expectedReturnDate) return false;

  const expected = new Date(loan.expectedReturnDate);
  const now = new Date();
  return expected.getTime() < now.getTime();
}

/**
 * Obtiene la etiqueta legible de una categoría
 */
export function getCategoryLabel(category: ResourceCategory): string {
  return RESOURCE_CATEGORIES[category]?.label || 'Otro Recurso';
}

/**
 * Configuración visual de badges para el estado físico del recurso
 */
export const RESOURCE_STATUS_CONFIG: Record<
  ResourceStatus,
  { label: string; badgeClass: string; isLendable: boolean }
> = {
  nuevo: {
    label: 'Nuevo',
    badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
    isLendable: true,
  },
  bueno: {
    label: 'Buen Estado',
    badgeClass: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
    isLendable: true,
  },
  requiere_revision: {
    label: 'Requiere Revisión',
    badgeClass: 'bg-amber-950/50 text-amber-300 border-amber-500/40',
    isLendable: false,
  },
  danado: {
    label: 'Dañado',
    badgeClass: 'bg-rose-950/50 text-rose-300 border-rose-500/40',
    isLendable: false,
  },
  fuera_de_servicio: {
    label: 'Fuera de Servicio',
    badgeClass: 'bg-slate-900 text-slate-400 border-slate-700',
    isLendable: false,
  },
};

/**
 * Configuración visual de badges para los estados de préstamo
 */
export const LOAN_STATUS_CONFIG: Record<
  LoanStatus,
  { label: string; badgeClass: string }
> = {
  solicitado: {
    label: 'Solicitado (Pendiente)',
    badgeClass: 'bg-amber-950/50 text-amber-300 border-amber-500/40',
  },
  aprobado: {
    label: 'Aprobado (Por Entregar)',
    badgeClass: 'bg-blue-950/50 text-blue-300 border-blue-500/40',
  },
  entregado: {
    label: 'En Préstamo (Activo)',
    badgeClass: 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40',
  },
  devuelto: {
    label: 'Devuelto',
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  vencido: {
    label: 'Devolución Vencida',
    badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/50 font-bold',
  },
  cancelado: {
    label: 'Cancelado / Rechazado',
    badgeClass: 'bg-slate-900 text-slate-500 border-slate-800',
  },
};
