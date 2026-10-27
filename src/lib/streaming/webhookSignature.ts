/**
 * FAMA — Verificación criptográfica de webhooks de streaming
 *
 * Soporta los formatos de firma HMAC-SHA256 de:
 *  - Mux:        header `mux-signature`            → "t=<ts>,v1=<hex>"   (firma de `${ts}.${body}`)
 *  - Cloudflare: header `webhook-signature`        → "time=<ts>,sig1=<hex>" (firma de `${ts}.${body}`)
 *  - Genérico:   header `x-webhook-signature`      → "<hex>" o "sha256=<hex>" (firma de `body`)
 *
 * USO EXCLUSIVO EN EL SERVIDOR.
 */

import { createHmac, timingSafeEqual } from 'crypto';

const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

function parseKeyValueHeader(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of value.split(',')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function hmacHex(secret: string, data: string): string {
  return createHmac('sha256', secret).update(data).digest('hex');
}

function timestampIsFresh(ts: string): boolean {
  const seconds = Number(ts);
  if (!Number.isFinite(seconds)) return false;
  return Math.abs(Date.now() / 1000 - seconds) <= MAX_TIMESTAMP_SKEW_SECONDS;
}

export function verifyStreamingWebhookSignature(
  secret: string,
  rawBody: string,
  headers: Headers
): boolean {
  const mux = headers.get('mux-signature') || headers.get('x-mux-signature');
  if (mux) {
    const { t, v1 } = parseKeyValueHeader(mux);
    if (!t || !v1 || !timestampIsFresh(t)) return false;
    return safeEqualHex(v1, hmacHex(secret, `${t}.${rawBody}`));
  }

  const cf = headers.get('webhook-signature') || headers.get('cf-webhook-signature');
  if (cf) {
    const { time, sig1 } = parseKeyValueHeader(cf);
    if (!time || !sig1 || !timestampIsFresh(time)) return false;
    return safeEqualHex(sig1, hmacHex(secret, `${time}.${rawBody}`));
  }

  const generic = headers.get('x-webhook-signature');
  if (generic) {
    const sig = generic.replace(/^sha256=/i, '').trim();
    return safeEqualHex(sig, hmacHex(secret, rawBody));
  }

  return false;
}

/**
 * Valida que la URL de descarga sea HTTPS y no apunte a hosts internos (mitigación SSRF).
 * Si STREAMING_ALLOWED_DOWNLOAD_HOSTS está definido (lista separada por comas),
 * el host debe coincidir con alguno de los sufijos indicados.
 */
export function isSafeDownloadUrl(rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^\[.*\]$/.test(host) ||
    /^(127|10|0)\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }

  const allowed = (process.env.STREAMING_ALLOWED_DOWNLOAD_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return true;
  return allowed.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
