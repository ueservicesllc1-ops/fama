/**
 * FAMA - Utilidades de Integración para YouTube Live y Grabaciones de YouTube
 *
 * Soporte oficial para transmisiones con OBS Studio hacia YouTube Live
 * y reproducción en el Auditorio Virtual y la sección de Predicaciones.
 *
 * NOTA DE SEGURIDAD Y PRIVACIDAD:
 * La autenticación de FAMA NO convierte un video de YouTube en estrictamente privado.
 * Los videos configurados en YouTube Studio como "Público" o "No listado" (Unlisted)
 * son reproducibles dentro de FAMA, pero cualquier persona con el identificador o enlace
 * directo de YouTube podría acceder a ellos fuera de la plataforma según la política de YouTube.
 */

/**
 * Expresión regular robusta para extraer el ID de 11 caracteres de YouTube
 * compatible con formatos:
 * - Identificador directo: "dQw4w9WgXcQ"
 * - Enlace estándar: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 * - Enlace corto: "https://youtu.be/dQw4w9WgXcQ"
 * - Enlace en vivo: "https://www.youtube.com/live/dQw4w9WgXcQ"
 * - Enlace incrustado: "https://www.youtube.com/embed/dQw4w9WgXcQ"
 * - Versión móvil: "https://m.youtube.com/watch?v=dQw4w9WgXcQ"
 */
const YOUTUBE_REGEX =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})|^([\w-]{11})$/;

/**
 * Extrae y valida el ID de video de YouTube a partir de una URL o un ID plano.
 */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(YOUTUBE_REGEX);
  if (match) {
    return match[1] || match[2] || null;
  }
  return null;
}

/**
 * Comprueba si una cadena de texto es un ID o enlace válido de YouTube.
 */
export function isValidYouTubeInput(input?: string | null): boolean {
  return extractYouTubeVideoId(input) !== null;
}

export interface YouTubeEmbedOptions {
  autoplay?: boolean;
  mute?: boolean;
  controls?: boolean;
  startSeconds?: number;
}

/**
 * Construye la URL oficial de incrustación (iframe) con dominio de privacidad mejorada
 * (youtube-nocookie.com) y parámetros oficiales de YouTube.
 */
export function buildYouTubeEmbedUrl(
  input: string,
  options: YouTubeEmbedOptions = { autoplay: true, mute: false, controls: true }
): string | null {
  const videoId = extractYouTubeVideoId(input);
  if (!videoId) return null;

  const params = new URLSearchParams();

  // Autoplay
  if (options.autoplay) {
    params.set('autoplay', '1');
  }

  // Mute (generalmente requerido para autoplay en navegadores modernos)
  if (options.mute) {
    params.set('mute', '1');
  }

  // Parámetros oficiales para reducir distracciones y no sugerir canales externos
  params.set('rel', '0'); // Solo videos del mismo canal al pausar
  params.set('modestbranding', '1'); // Ocultar logo grande de YouTube
  params.set('playsinline', '1'); // Reproducir inline en móviles iOS/Android

  if (options.controls === false) {
    params.set('controls', '0');
  }

  if (options.startSeconds && options.startSeconds > 0) {
    params.set('start', String(Math.floor(options.startSeconds)));
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
