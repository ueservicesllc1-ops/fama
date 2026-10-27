/**
 * FAMA - Arquitectura y Tipos de Integración de Streaming
 *
 * Define las interfaces para proveedores reales de transmisión en directo
 * (Cloudflare Stream, Mux, AWS IVS, RTMP/HLS propio).
 *
 * PROHIBIDO: inventar URLs de transmisión o simular señales de video.
 */

export type StreamingProviderType =
  | 'cloudflare_stream'
  | 'mux'
  | 'generic_rtmp_hls'
  | 'none';

export type TransmissionStatus =
  | 'no_configurado'
  | 'inactivo'
  | 'conectando'
  | 'transmitiendo'
  | 'desconectado'
  | 'error';

export type StreamPlaybackType = 'hls' | 'dash' | 'webrtc' | 'iframe' | 'none';

/**
 * Información de emisión (SOLO SERVIDOR - NUNCA ENVIAR AL CLIENTE GENERAL)
 */
export interface StreamIngestInfo {
  ingestUrl?: string;
  streamKey?: string;
  rtmpUrl?: string;
  srtUrl?: string;
  expiresAt?: string;
}

/**
 * Información de reproducción autorizada para los congregantes
 */
export interface StreamPlaybackInfo {
  playbackUrl?: string;
  playbackType: StreamPlaybackType;
  embedUrl?: string;
  isAuthorized: boolean;
  requiresAuth?: boolean;
}

/**
 * Estado real consultado directamente del proveedor
 */
export interface StreamRealStatus {
  status: TransmissionStatus;
  isLive: boolean;
  viewerCount?: number;
  startedAt?: string;
  health?: 'good' | 'poor' | 'offline';
  rawProviderStatus?: string;
  message?: string;
}

/**
 * Información de grabaciones generadas por el proveedor
 */
export interface ProviderRecordingInfo {
  recordingId: string;
  providerStreamId: string;
  status: 'pendiente' | 'grabando' | 'procesando' | 'transfiriendo' | 'disponible' | 'error';
  downloadUrl?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  format?: string;
}

/**
 * Capacidades soportadas por el proveedor configurado
 */
export interface StreamingProviderCapabilities {
  supportsLiveInputCreation: boolean;
  supportsAutoRecording: boolean;
  supportsWebhooks: boolean;
  supportsStatusPolling: boolean;
  supportsSignedPlayback: boolean;
}

/**
 * Contrato oficial del Adaptador de Streaming
 */
export interface IStreamingProviderAdapter {
  readonly providerId: StreamingProviderType;
  readonly name: string;
  readonly capabilities: StreamingProviderCapabilities;

  /**
   * Indica si las credenciales y configuración del proveedor están completas en el entorno.
   */
  isConfigured(): boolean;

  /**
   * Explica qué credenciales o parámetros faltan si no está configurado.
   */
  getConfigurationHelp(): {
    isReady: boolean;
    missingKeys: string[];
    instructions: string;
  };

  /**
   * Crea o configura un punto de entrada de transmisión para el culto.
   */
  createLiveStream?(
    cultoId: string,
    title: string
  ): Promise<{
    providerStreamId: string;
    ingest: StreamIngestInfo;
    playback: StreamPlaybackInfo;
  }>;

  /**
   * Obtiene la dirección de reproducción autorizada para los usuarios.
   */
  getPlaybackInfo(
    providerStreamId: string,
    options?: { secure?: boolean }
  ): Promise<StreamPlaybackInfo>;

  /**
   * Consulta el estado real de la transmisión desde el proveedor.
   */
  queryLiveStatus(providerStreamId: string): Promise<StreamRealStatus>;

  /**
   * Obtiene los metadatos de grabación automática al finalizar el directo.
   */
  getRecordingInfo?(
    providerStreamId: string
  ): Promise<ProviderRecordingInfo | null>;

  /**
   * Procesa un webhook recibido del proveedor de streaming.
   */
  handleWebhookEvent?(
    payload: unknown,
    headers: Record<string, string>
  ): Promise<{
    eventType: string;
    cultoId?: string;
    statusUpdate?: TransmissionStatus;
    recordingUpdate?: ProviderRecordingInfo;
  }>;
}
