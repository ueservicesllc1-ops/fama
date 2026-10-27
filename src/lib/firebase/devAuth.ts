/**
 * FAMA — Control del modo de autenticación de desarrollo
 *
 * USO EXCLUSIVO EN EL SERVIDOR (API Routes).
 *
 * El acceso simulado (headers x-dev-*) solo se habilita si se cumplen las dos condiciones:
 *  1. El entorno NO es producción (NODE_ENV !== 'production').
 *  2. La variable ALLOW_DEV_AUTH está definida explícitamente como 'true'.
 * En cualquier otro caso, si Firebase Admin no está configurado, se deniega el acceso.
 */

export function isDevAuthAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH === 'true';
}

export const ADMIN_SDK_UNAVAILABLE_ERROR =
  'Servicio de autenticación no disponible: Firebase Admin SDK no está configurado en el servidor.';
