/**
 * FAMA — Helper Cliente para Verificación Pastoral
 * RENACER CHURCH — Fe · Amor · Misión · Almas
 *
 * USO SEGURO EN EL CLIENTE (React Components).
 * NO importa dependencias de servidor ni Firebase Admin SDK.
 */

import { UserProfile } from '@/types/models';

/**
 * Verificación en el cliente para mostrar / ocultar vistas o botones pastorales
 */
export function canAccessPastoral(profile?: UserProfile | null): boolean {
  if (!profile) return false;
  if (profile.role === 'pastor') return true;
  if (profile.role === 'admin' && profile.pastoralAccess === true) return true;
  return false;
}
