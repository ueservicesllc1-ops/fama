/**
 * FAMA - Adaptador para Servidores RTMP / HLS Genéricos
 *
 * Utilizado cuando la iglesia dispone de su propio servidor de streaming (ej: Nginx RTMP,
 * SRS, Wowza o Ant Media Server) con URLs estáticas preconfiguradas.
 */

import {
  IStreamingProviderAdapter,
  StreamingProviderType,
  StreamingProviderCapabilities,
  StreamPlaybackInfo,
  StreamRealStatus,
  ProviderRecordingInfo,
} from './types';

export class GenericRtmpHlsAdapter implements IStreamingProviderAdapter {
  readonly providerId: StreamingProviderType = 'generic_rtmp_hls';
  readonly name = 'Servidor RTMP / HLS Propio';

  readonly capabilities: StreamingProviderCapabilities = {
    supportsLiveInputCreation: false,
    supportsAutoRecording: false,
    supportsWebhooks: false,
    supportsStatusPolling: false,
    supportsSignedPlayback: false,
  };

  private get rtmpUrl(): string | undefined {
    return process.env.GENERIC_STREAM_RTMP_URL;
  }

  private get streamKey(): string | undefined {
    return process.env.GENERIC_STREAM_KEY;
  }

  private get hlsPlaybackUrl(): string | undefined {
    return process.env.GENERIC_STREAM_HLS_URL;
  }

  isConfigured(): boolean {
    return Boolean(this.rtmpUrl && this.hlsPlaybackUrl);
  }

  getConfigurationHelp() {
    const missing: string[] = [];
    if (!this.rtmpUrl) missing.push('GENERIC_STREAM_RTMP_URL');
    if (!this.hlsPlaybackUrl) missing.push('GENERIC_STREAM_HLS_URL');

    return {
      isReady: missing.length === 0,
      missingKeys: missing,
      instructions:
        'Configure GENERIC_STREAM_RTMP_URL y GENERIC_STREAM_HLS_URL con la dirección de emisión y la URL HLS (.m3u8) de su servidor.',
    };
  }

  async getPlaybackInfo(_providerStreamId: string): Promise<StreamPlaybackInfo> {
    if (!this.isConfigured() || !this.hlsPlaybackUrl) {
      return { playbackType: 'none', isAuthorized: false };
    }

    return {
      playbackUrl: this.hlsPlaybackUrl,
      playbackType: 'hls',
      isAuthorized: true,
    };
  }

  async queryLiveStatus(_providerStreamId: string): Promise<StreamRealStatus> {
    if (!this.isConfigured()) {
      return {
        status: 'no_configurado',
        isLive: false,
        message: 'Servidor RTMP/HLS genérico no configurado.',
      };
    }

    // Al ser un servidor genérico sin API de sondeo, el estado debe confirmarse manualmente o por probe
    return {
      status: 'inactivo',
      isLive: false,
      message: 'El servidor genérico no provee API automática de sondeo de estado.',
    };
  }

  async getRecordingInfo(_providerStreamId: string): Promise<ProviderRecordingInfo | null> {
    return null;
  }
}
