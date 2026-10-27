/**
 * FAMA - Arquitectura y Contratos de Almacenamiento Backblaze B2
 *
 * Backblaze B2 almacena los archivos pesados (videos de cultos, grabaciones,
 * fotografías de alta resolución y miniaturas).
 *
 * Los metadatos de los archivos (nombre, duración, pastor, fecha) se gestionan en Firestore.
 *
 * BUCKET OFICIAL: famaweb
 * ENDPOINT S3: s3.us-east-005.backblazeb2.com
 *
 * REGLAS DE SEGURIDAD Y ARQUITECTURA:
 * 1. Las credenciales de Backblaze (keyID, applicationKey, bucketId) NUNCA se exponen en el cliente.
 * 2. Las operaciones de subida masiva, generación de URLs prefirmadas y borrado se ejecutan
 *    a través de endpoints de servidor de Next.js (Server Actions o API Routes seguras).
 */

export interface B2UploadRequest {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  entityType: 'culto_recording' | 'gallery_photo' | 'thumbnail' | 'avatar';
  entityId: string;
}

export interface B2UploadTicket {
  uploadUrl: string;
  authorizationToken: string;
  destinationPath: string;
  expiresAt: string;
}

export interface B2FileMetadata {
  fileId: string;
  fileName: string;
  contentLength: number;
  contentType: string;
  uploadTimestamp: number;
  publicCdnUrl?: string;
  authorizedDownloadUrl?: string;
}

export type MediaProcessingStatus =
  | 'idle'
  | 'preparing_upload'
  | 'uploading'
  | 'processing_transcode'
  | 'ready'
  | 'failed';

export interface B2StorageStatus {
  isConfigured: boolean;
  provider: 'Backblaze B2';
  bucketName: string;
  endpoint: string;
  message: string;
}

/**
 * Consulta el estado del servicio de almacenamiento B2.
 */
export const getBackblazeB2Status = (): B2StorageStatus => {
  const isConfigured = Boolean(
    process.env.B2_APPLICATION_KEY_ID && process.env.B2_APPLICATION_KEY
  );

  const bucketName = process.env.B2_BUCKET_NAME || 'famaweb';
  const endpoint = process.env.B2_ENDPOINT || 's3.us-east-005.backblazeb2.com';

  return {
    isConfigured,
    provider: 'Backblaze B2',
    bucketName,
    endpoint,
    message: isConfigured
      ? 'Servicio Backblaze B2 configurado en entorno de servidor.'
      : 'Estructura Backblaze B2 preparada. Requiere claves API de servidor B2_APPLICATION_KEY_ID y B2_APPLICATION_KEY.',
  };
};

/**
 * Función auxiliar para formatear rutas estructuradas en el bucket B2
 */
export const buildB2StoragePath = (
  folder: 'grabaciones' | 'galeria' | 'miniaturas' | 'avatares',
  year: number,
  filename: string
): string => {
  const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${folder}/${year}/${cleanFilename}`;
};
