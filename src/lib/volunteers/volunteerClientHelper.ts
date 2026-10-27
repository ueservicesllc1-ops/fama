/**
 * FAMA — Helper Cliente de Permisos para Voluntarios y Ministerios
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO EXCLUSIVO EN CLIENTE (React Components).
 * Libre de dependencias de servidor y Firebase Admin SDK.
 */

import { UserProfile, Ministry } from '@/types/models';

/**
 * Determina si el usuario tiene privilegios para coordinar un ministerio específico.
 * Regla: Solo administradores globales o coordinadores designados explícitamente
 * (leaderUid o lista coordinators). Los pastores no reciben permisos adicionales automáticamente.
 */
export function canManageMinistry(
  profile?: UserProfile | null,
  ministry?: Ministry | null
): boolean {
  if (!profile || !ministry) return false;
  if (profile.role === 'admin') return true;
  if (ministry.leaderUid && ministry.leaderUid === profile.uid) return true;
  if (ministry.coordinators && ministry.coordinators.includes(profile.uid)) return true;
  return false;
}

/**
 * Determina si el usuario tiene acceso general al panel de Voluntarios y Servicio
 * (administrador o coordinador de al menos un ministerio).
 */
export function canAccessVolunteersAdmin(
  profile?: UserProfile | null,
  userMinistries: Ministry[] = []
): boolean {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  return userMinistries.some((m) => canManageMinistry(profile, m));
}

/**
 * Comprueba si dos intervalos horarios se superponen.
 * Formato esperado: "HH:mm".
 * Retorna true si hay solapamiento estricto (startA < endB && endA > startB).
 */
export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

