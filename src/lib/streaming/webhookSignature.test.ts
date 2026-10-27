import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  verifyStreamingWebhookSignature,
  isSafeDownloadUrl,
} from './webhookSignature';

const SECRET = 'test-secret';
const BODY = JSON.stringify({ id: 'evt_1', type: 'video.asset.ready' });

const sign = (data: string) => createHmac('sha256', SECRET).update(data).digest('hex');
const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('verifyStreamingWebhookSignature', () => {
  it('acepta una firma Mux válida', () => {
    const t = String(nowSeconds());
    const headers = new Headers({ 'mux-signature': `t=${t},v1=${sign(`${t}.${BODY}`)}` });
    expect(verifyStreamingWebhookSignature(SECRET, BODY, headers)).toBe(true);
  });

  it('rechaza una firma Mux inválida', () => {
    const t = String(nowSeconds());
    const headers = new Headers({ 'mux-signature': `t=${t},v1=${'0'.repeat(64)}` });
    expect(verifyStreamingWebhookSignature(SECRET, BODY, headers)).toBe(false);
  });

  it('rechaza una firma Mux con cuerpo alterado', () => {
    const t = String(nowSeconds());
    const headers = new Headers({ 'mux-signature': `t=${t},v1=${sign(`${t}.${BODY}`)}` });
    expect(verifyStreamingWebhookSignature(SECRET, BODY + ' ', headers)).toBe(false);
  });

  it('rechaza una firma con timestamp antiguo (replay)', () => {
    const t = String(nowSeconds() - 3600);
    const headers = new Headers({ 'mux-signature': `t=${t},v1=${sign(`${t}.${BODY}`)}` });
    expect(verifyStreamingWebhookSignature(SECRET, BODY, headers)).toBe(false);
  });

  it('acepta una firma Cloudflare válida', () => {
    const time = String(nowSeconds());
    const headers = new Headers({
      'webhook-signature': `time=${time},sig1=${sign(`${time}.${BODY}`)}`,
    });
    expect(verifyStreamingWebhookSignature(SECRET, BODY, headers)).toBe(true);
  });

  it('acepta una firma genérica con y sin prefijo sha256=', () => {
    expect(
      verifyStreamingWebhookSignature(SECRET, BODY, new Headers({ 'x-webhook-signature': sign(BODY) }))
    ).toBe(true);
    expect(
      verifyStreamingWebhookSignature(
        SECRET,
        BODY,
        new Headers({ 'x-webhook-signature': `sha256=${sign(BODY)}` })
      )
    ).toBe(true);
  });

  it('rechaza si no hay ningún header de firma', () => {
    expect(verifyStreamingWebhookSignature(SECRET, BODY, new Headers())).toBe(false);
  });

  it('rechaza firmas con secreto equivocado', () => {
    const headers = new Headers({ 'x-webhook-signature': sign(BODY) });
    expect(verifyStreamingWebhookSignature('otro-secreto', BODY, headers)).toBe(false);
  });
});

describe('isSafeDownloadUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('acepta URLs HTTPS públicas', () => {
    expect(isSafeDownloadUrl('https://stream.mux.com/video.mp4')).toBe(true);
  });

  it('rechaza HTTP, URLs inválidas y esquemas no web', () => {
    expect(isSafeDownloadUrl('http://stream.mux.com/video.mp4')).toBe(false);
    expect(isSafeDownloadUrl('no-es-url')).toBe(false);
    expect(isSafeDownloadUrl('file:///etc/passwd')).toBe(false);
  });

  it('rechaza hosts internos (SSRF)', () => {
    for (const url of [
      'https://localhost/x',
      'https://127.0.0.1/x',
      'https://10.0.0.5/x',
      'https://192.168.1.1/x',
      'https://172.16.0.1/x',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/x',
      'https://servicio.internal/x',
    ]) {
      expect(isSafeDownloadUrl(url), url).toBe(false);
    }
  });

  it('respeta la lista de dominios permitidos', () => {
    vi.stubEnv('STREAMING_ALLOWED_DOWNLOAD_HOSTS', 'mux.com, cloudflarestream.com');
    expect(isSafeDownloadUrl('https://stream.mux.com/v.mp4')).toBe(true);
    expect(isSafeDownloadUrl('https://mux.com/v.mp4')).toBe(true);
    expect(isSafeDownloadUrl('https://evil.com/v.mp4')).toBe(false);
    expect(isSafeDownloadUrl('https://notmux.com/v.mp4')).toBe(false);
  });
});
