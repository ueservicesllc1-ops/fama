/**
 * FAMA - Adaptador de Streaming No Configurado
 *
 * Utilizado de manera segura cuando aún no se han suministrado credenciales
 * ni contratado un proveedor definitivo de transmisión.
 *
 * PROHIBIDO: simular transmisiones activas o inventar URLs de video.
 */

import {
  IStreamingProviderAdapter,
  StreamingProviderType,
  StreamingProviderCapabilities,
  StreamPlaybackInfo,
  StreamRealStatus,
  ProviderRecordingInfo,
} from './types';

export class UnconfiguredStreamingAdapter implements IStreamingProviderAdapter {
  readonly providerId: StreamingProviderType = 'none';
  readonly name = 'Proveedor de Streaming No Configurado';

  readonly capabilities: StreamingProviderCapabilities = {
    supportsLiveInputCreation: false,
    supportsAutoRecording: false,
    supportsWebhooks: false,
    supportsStatusPolling: false,
    supportsSignedPlayback: false,
  };

  isConfigured(): boolean {
    return false;
  }

  getConfigurationHelp() {
    return {
      isReady: false,
      missingKeys: [
        'STREAMING_PROVIDER (cloudflare_stream | mux | generic_rtmp_hls)',
        'Credenciales de API según el proveedor contratado',
      ],
      instructions:
        'Aún no se ha configurado un proveedor de streaming en el entorno. Para habilitar transmisiones en vivo, configure STREAMING_PROVIDER en .env.local junto con las claves API correspondientes del servicio seleccionado.',
    };
  }

  async getPlaybackInfo(_providerStreamId: string): Promise<StreamPlaybackInfo> {
    return {
      playbackType: 'none',
      isAuthorized: false,
    };
  }

  async queryLiveStatus(_providerStreamId: string): Promise<StreamRealStatus> {
    return {
      status: 'no_configurado',
      isLive: false,
      message:
        'Transmisión no configurada. Es necesario contratar e integrar un proveedor de streaming.',
    };
  }

  async getRecordingInfo(_providerStreamId: string): Promise<ProviderRecordingInfo | null> {
    return null;
  }
}
