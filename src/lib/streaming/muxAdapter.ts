/**
 * FAMA - Adaptador para Mux Video Live Streams
 *
 * Soporta creación de directos RTMP, reproducción HLS con signed playback opcional,
 * estado en tiempo real y grabación automática en formato MP4 / HLS.
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

export class MuxStreamingAdapter implements IStreamingProviderAdapter {
  readonly providerId: StreamingProviderType = 'mux';
  readonly name = 'Mux Video Live';

  readonly capabilities: StreamingProviderCapabilities = {
    supportsLiveInputCreation: true,
    supportsAutoRecording: true,
    supportsWebhooks: true,
    supportsStatusPolling: true,
    supportsSignedPlayback: true,
  };

  private get tokenId(): string | undefined {
    return process.env.MUX_TOKEN_ID;
  }

  private get tokenSecret(): string | undefined {
    return process.env.MUX_TOKEN_SECRET;
  }

  isConfigured(): boolean {
    return Boolean(this.tokenId && this.tokenSecret);
  }

  getConfigurationHelp() {
    const missing: string[] = [];
    if (!this.tokenId) missing.push('MUX_TOKEN_ID');
    if (!this.tokenSecret) missing.push('MUX_TOKEN_SECRET');

    return {
      isReady: missing.length === 0,
      missingKeys: missing,
      instructions:
        'Obtenga un Access Token de Mux desde el dashboard (Settings > Access Tokens) con permisos de Mux Video (Full Access).',
    };
  }

  private get authHeader(): string {
    const credentials = Buffer.from(`${this.tokenId}:${this.tokenSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async createLiveStream(cultoId: string, _title: string) {
    if (!this.isConfigured()) {
      throw new Error('Mux no está configurado. Faltan credenciales en el servidor.');
    }

    const res = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public'],
          passthrough: cultoId,
        },
        reduced_latency: true,
      }),
    });

    if (!res.ok) {
      throw new Error(`Error creando live stream en Mux: ${res.statusText}`);
    }

    const json = await res.json();
    const stream = json.data;
    const playbackId = stream.playback_ids?.[0]?.id;

    const ingest: StreamIngestInfo = {
      rtmpUrl: 'rtmps://global-live.mux.com:443/app',
      streamKey: stream.stream_key,
    };

    const playback: StreamPlaybackInfo = {
      playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined,
      playbackType: 'hls',
      isAuthorized: true,
    };

    return {
      providerStreamId: stream.id,
      ingest,
      playback,
    };
  }

  async getPlaybackInfo(providerStreamId: string): Promise<StreamPlaybackInfo> {
    if (!this.isConfigured()) {
      return { playbackType: 'none', isAuthorized: false };
    }

    try {
      const res = await fetch(`https://api.mux.com/video/v1/live-streams/${providerStreamId}`, {
        headers: { Authorization: this.authHeader },
      });
      if (!res.ok) return { playbackType: 'none', isAuthorized: false };
      const json = await res.json();
      const playbackId = json.data?.playback_ids?.[0]?.id;

      return {
        playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : undefined,
        playbackType: 'hls',
        isAuthorized: true,
      };
    } catch {
      return { playbackType: 'none', isAuthorized: false };
    }
  }

  async queryLiveStatus(providerStreamId: string): Promise<StreamRealStatus> {
    if (!this.isConfigured()) {
      return { status: 'no_configurado', isLive: false, message: 'Mux no está configurado.' };
    }

    try {
      const res = await fetch(`https://api.mux.com/video/v1/live-streams/${providerStreamId}`, {
        headers: { Authorization: this.authHeader },
      });

      if (!res.ok) {
        return { status: 'error', isLive: false, message: `Error consultando Mux: ${res.statusText}` };
      }

      const json = await res.json();
      const muxStatus = json.data?.status; // 'idle' | 'active' | 'disabled'

      let status: TransmissionStatus = 'inactivo';
      let isLive = false;

      if (muxStatus === 'active') {
        status = 'transmitiendo';
        isLive = true;
      } else if (muxStatus === 'idle') {
        status = 'inactivo';
      } else if (muxStatus === 'disabled') {
        status = 'desconectado';
      }

      return {
        status,
        isLive,
        rawProviderStatus: muxStatus,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      return { status: 'error', isLive: false, message: msg };
    }
  }

  async getRecordingInfo(providerStreamId: string): Promise<ProviderRecordingInfo | null> {
    if (!this.isConfigured()) return null;

    try {
      const res = await fetch(
        `https://api.mux.com/video/v1/assets?live_stream_id=${providerStreamId}`,
        {
          headers: { Authorization: this.authHeader },
        }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const assets = json.data || [];
      if (assets.length === 0) return null;

      const latest = assets[0];
      const isReady = latest.status === 'ready';

      return {
        recordingId: latest.id,
        providerStreamId,
        status: isReady ? 'disponible' : 'procesando',
        durationSeconds: latest.duration,
      };
    } catch {
      return null;
    }
  }
}
