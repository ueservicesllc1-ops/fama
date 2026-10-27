/**
 * FAMA — Utilidad para extraer un mensaje legible de un error desconocido.
 * Permite usar `catch (err: unknown)` sin recurrir a `any`.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return '';
}
