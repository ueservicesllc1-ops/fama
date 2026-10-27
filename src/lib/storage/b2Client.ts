/**
 * FAMA - Cliente Oficial de Backblaze B2 (API S3 Compatible)
 *
 * USO EXCLUSIVO EN EL SERVIDOR (Server Components, Server Actions, API Routes).
 * NUNCA importar en el cliente ni exponer credenciales privadas.
 *
 * Bucket oficial: famaweb
 * Endpoint S3: s3.us-east-005.backblazeb2.com
 */

import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export const B2_CONFIG = {
  endpoint: process.env.B2_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
  region: process.env.B2_REGION || 'us-east-005',
  bucketName: process.env.B2_BUCKET_NAME || 'famaweb',
  keyId: process.env.B2_APPLICATION_KEY_ID,
  appKey: process.env.B2_APPLICATION_KEY,
};

let cachedS3Client: S3Client | null = null;

export function isB2Configured(): boolean {
  return Boolean(B2_CONFIG.keyId && B2_CONFIG.appKey);
}

export function getB2S3Client(): S3Client | null {
  if (!isB2Configured()) {
    return null;
  }

  if (cachedS3Client) {
    return cachedS3Client;
  }

  cachedS3Client = new S3Client({
    endpoint: B2_CONFIG.endpoint.startsWith('http')
      ? B2_CONFIG.endpoint
      : `https://${B2_CONFIG.endpoint}`,
    region: B2_CONFIG.region,
    credentials: {
      accessKeyId: B2_CONFIG.keyId!,
      secretAccessKey: B2_CONFIG.appKey!,
    },
  });

  return cachedS3Client;
}

/**
 * Genera una URL prefirmada y temporal para descargar o reproducir un archivo privado en B2.
 */
export async function generateB2SignedDownloadUrl(
  fileKey: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  const client = getB2S3Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: fileKey,
    });

    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error('[B2Client] Error generando URL firmada:', err);
    return null;
  }
}

/**
 * Comprueba de forma segura si un archivo existe en el bucket de Backblaze B2.
 */
export async function checkB2FileExists(fileKey: string): Promise<{
  exists: boolean;
  contentLength?: number;
  contentType?: string;
}> {
  const client = getB2S3Client();
  if (!client) return { exists: false };

  try {
    const command = new HeadObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: fileKey,
    });

    const res = await client.send(command);
    return {
      exists: true,
      contentLength: res.ContentLength,
      contentType: res.ContentType,
    };
  } catch {
    return { exists: false };
  }
}

/**
 * Transfiere un flujo de datos (Readable stream) directamente a Backblaze B2
 * evitando sobrecargar la memoria RAM con archivos pesados.
 */
export async function transferStreamToB2(
  stream: Readable | ReadableStream,
  fileKey: string,
  contentType: string,
  contentLength?: number
): Promise<{ success: boolean; fileKey: string; error?: string }> {
  const client = getB2S3Client();
  if (!client) {
    return {
      success: false,
      fileKey,
      error: 'Backblaze B2 no está configurado en el servidor.',
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: B2_CONFIG.bucketName,
      Key: fileKey,
      Body: stream as unknown as Readable,
      ContentType: contentType,
      ContentLength: contentLength,
    });

    await client.send(command);
    return { success: true, fileKey };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al transferir a B2';
    console.error('[B2Client] Error en transferencia a B2:', msg);
    return { success: false, fileKey, error: msg };
  }
}
