/**
 * FAMA - Adaptador para Cloudflare Stream Live
 *
 * Soporta creación de entradas en vivo (SRT/RTMP), reproducción HLS/DASH segura
 * y grabación automática directamente en Cloudflare Stream.
 */

import {
  IStreamingProviderAdapter,
  StreamingProviderType,
  StreamingProviderCapabilities,
  StreamIngestInfo,
  StreamPlaybackInfo,
  StreamRealStatus,
  ProviderRecordingInfo,
  TransmissionStatus,
} from './types';

export class CloudflareStreamAdapter implements IStreamingProviderAdapter {
  readonly providerId: StreamingProviderType = 'cloudflare_stream';
  readonly name = 'Cloudflare Stream Live';

  readonly capabilities: StreamingProviderCapabilities = {
    supportsLiveInputCreation: true,
    supportsAutoRecording: true,
    supportsWebhooks: true,
    supportsStatusPolling: true,
    supportsSignedPlayback: true,
  };

  private get accountId(): string | undefined {
    return process.env.CLOUDFLARE_ACCOUNT_ID;
  }

  private get apiToken(): string | undefined {
    return process.env.CLOUDFLARE_STREAM_API_TOKEN;
  }

  isConfigured(): boolean {
    return Boolean(this.accountId && this.apiToken);
  }

  getConfigurationHelp() {
    const missing: string[] = [];
    if (!this.accountId) missing.push('CLOUDFLARE_ACCOUNT_ID');
    if (!this.apiToken) missing.push('CLOUDFLARE_STREAM_API_TOKEN');

    return {
      isReady: missing.length === 0,
      missingKeys: missing,
      instructions:
        'Obtenga un API Token con permisos de Stream desde el panel de Cloudflare (Dash > My Profile > API Tokens) y su Account ID.',
    };
  }

  async createLiveStream(cultoId: string, title: string) {
    if (!this.isConfigured()) {
      throw new Error(
        'Cloudflare Stream no está configurado. Faltan variables de entorno en el servidor.'
      );
    }

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/live_inputs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meta: { cultoId, title },
          recording: { mode: 'automatic', timeoutSeconds: 300 },
        }),
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        `Error creando live input en Cloudflare: ${res.statusText} ${JSON.stringify(errData)}`
      );
    }

    const data = await res.json();
    const result = data.result;

    const ingest: StreamIngestInfo = {
      rtmpUrl: result.rtmps?.url || `rtmps://live.cloudflare.com:443/live/`,
      streamKey: result.rtmps?.streamKey,
      srtUrl: result.srt?.url,
    };

    const playback: StreamPlaybackInfo = {
      playbackUrl: `https://customer-${this.accountId?.slice(0, 8)}.cloudflarestream.com/${result.uid}/manifest/video.m3u8`,
      playbackType: 'hls',
      embedUrl: `https://customer-${this.accountId?.slice(0, 8)}.cloudflarestream.com/${result.uid}/iframe`,
      isAuthorized: true,
    };

    return {
      providerStreamId: result.uid,
      ingest,
      playback,
    };
  }

  async getPlaybackInfo(providerStreamId: string): Promise<StreamPlaybackInfo> {
    if (!this.isConfigured()) {
      return { playbackType: 'none', isAuthorized: false };
    }

    return {
      playbackUrl: `https://videodelivery.net/${providerStreamId}/manifest/video.m3u8`,
      playbackType: 'hls',
      embedUrl: `https://iframe.videodelivery.net/${providerStreamId}`,
      isAuthorized: true,
    };
  }

  async queryLiveStatus(providerStreamId: string): Promise<StreamRealStatus> {
    if (!this.isConfigured()) {
      return {
        status: 'no_configurado',
        isLive: false,
        message: 'Cloudflare Stream no está configurado.',
      };
    }

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/live_inputs/${providerStreamId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!res.ok) {
        return {
          status: 'error',
          isLive: false,
          message: `Error consultando Cloudflare: ${res.statusText}`,
        };
      }

      const data = await res.json();
      const statusStr = data.result?.status?.current?.state;

      let status: TransmissionStatus = 'inactivo';
      let isLive = false;

      if (statusStr === 'connected') {
        status = 'transmitiendo';
        isLive = true;
      } else if (statusStr === 'reconnecting') {
        status = 'conectando';
      } else if (statusStr === 'disconnected') {
        status = 'desconectado';
      }

      return {
        status,
        isLive,
        rawProviderStatus: statusStr,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return {
        status: 'error',
        isLive: false,
        message: msg,
      };
    }
  }

  async getRecordingInfo(providerStreamId: string): Promise<ProviderRecordingInfo | null> {
    if (!this.isConfigured()) return null;

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/live_inputs/${providerStreamId}/videos`,
        {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
          },
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      const videos = data.result || [];
      if (videos.length === 0) return null;

      const latest = videos[0];
      return {
        recordingId: latest.uid,
        providerStreamId,
        status: latest.readyToStream ? 'disponible' : 'procesando',
        downloadUrl: latest.readyToStream
          ? `https://videodelivery.net/${latest.uid}/downloads/default.mp4`
          : undefined,
        durationSeconds: latest.duration,
        sizeBytes: latest.size,
      };
    } catch {
      return null;
    }
  }
}
