/**
 * FAMA - Fábrica de Adaptadores de Streaming
 *
 * Selecciona e inicializa el adaptador correspondiente según las variables de entorno.
 * Si no hay proveedor configurado, devuelve UnconfiguredStreamingAdapter sin fallar ni inventar datos.
 */

import { IStreamingProviderAdapter, StreamingProviderType } from './types';
import { UnconfiguredStreamingAdapter } from './unconfiguredAdapter';
import { CloudflareStreamAdapter } from './cloudflareStreamAdapter';
import { MuxStreamingAdapter } from './muxAdapter';
import { GenericRtmpHlsAdapter } from './genericAdapter';

export * from './types';
export * from './unconfiguredAdapter';
export * from './cloudflareStreamAdapter';
export * from './muxAdapter';
export * from './genericAdapter';

let cachedAdapter: IStreamingProviderAdapter | null = null;

export function getStreamingAdapter(): IStreamingProviderAdapter {
  if (cachedAdapter) return cachedAdapter;

  const providerType = (process.env.STREAMING_PROVIDER || '').toLowerCase().trim();

  switch (providerType) {
    case 'cloudflare_stream':
    case 'cloudflare':
      cachedAdapter = new CloudflareStreamAdapter();
      break;

    case 'mux':
      cachedAdapter = new MuxStreamingAdapter();
      break;

    case 'generic_rtmp_hls':
    case 'generic':
    case 'rtmp':
      cachedAdapter = new GenericRtmpHlsAdapter();
      break;

    default:
      cachedAdapter = new UnconfiguredStreamingAdapter();
      break;
  }

  return cachedAdapter;
}

/**
 * Consulta rápida para componentes cliente / vistas de administración
 */
export function getStreamingSystemStatus(): {
  isConfigured: boolean;
  provider: StreamingProviderType;
  providerName: string;
  missingKeys: string[];
  instructions: string;
} {
  const adapter = getStreamingAdapter();
  const help = adapter.getConfigurationHelp();

  return {
    isConfigured: adapter.isConfigured(),
    provider: adapter.providerId,
    providerName: adapter.name,
    missingKeys: help.missingKeys,
    instructions: help.instructions,
  };
}
