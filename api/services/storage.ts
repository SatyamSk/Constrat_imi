/**
 * File upload and storage service
 */

import type { UploadMetadata, DocumentMetadata } from '../types';
import { StorageError, ValidationError } from '../lib/errors';
import { logger } from '../lib/logger';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET_NAME = 'case-decks';

/**
 * Allowed file types for case uploads
 */
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
];

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate upload file
 */
export function validateUploadFile(
  file: Buffer | Uint8Array,
  mimeType: string,
  fileName: string,
): void {
  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
    throw new ValidationError('Invalid file type', {
      received: mimeType,
      allowed: ALLOWED_FILE_TYPES,
    });
  }

  // Check file size
  if (file.length > MAX_FILE_SIZE) {
    throw new ValidationError('File too large', {
      size: file.length,
      maxSize: MAX_FILE_SIZE,
      fileName,
    });
  }

  // Check file name
  if (!fileName || fileName.length === 0) {
    throw new ValidationError('File name is required');
  }

  if (fileName.length > 255) {
    throw new ValidationError('File name too long');
  }
}

/**
 * Generate storage path for file
 */
export function generateStoragePath(userId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const ext = fileName.split('.').pop() || 'bin';
  return `${userId}/${timestamp}-${random}.${ext}`;
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFileToStorage(
  file: Buffer | Uint8Array,
  storagePath: string,
  mimeType: string,
  requestId?: string,
): Promise<string> {
  try {
    logger.debug('Uploading file to storage', {
      requestId,
      path: storagePath,
      size: file.length,
    });

    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mimeType,
        },
        body: file,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('File upload failed', new Error(error), { requestId });
      throw new StorageError(`Upload failed: ${response.statusText}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storagePath}`;

    logger.info('File uploaded successfully', {
      requestId,
      path: storagePath,
      url: publicUrl,
    });

    return publicUrl;
  } catch (error) {
    logger.error('File upload error', error as Error, { requestId });
    throw new StorageError('Failed to upload file');
  }
}

/**
 * Delete file from storage
 */
export async function deleteFileFromStorage(
  storagePath: string,
  requestId?: string,
): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      throw new StorageError(`Delete failed: ${response.statusText}`);
    }

    logger.info('File deleted', { requestId, path: storagePath });
  } catch (error) {
    logger.error('File deletion error', error as Error, { requestId });
    throw new StorageError('Failed to delete file');
  }
}

/**
 * Download file from storage
 */
export async function downloadFileFromStorage(
  storagePath: string,
  requestId?: string,
): Promise<Buffer> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new StorageError(`Download failed: ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    logger.error('File download error', error as Error, { requestId });
    throw new StorageError('Failed to download file');
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
  storagePath: string,
  requestId?: string,
): Promise<{
  name: string;
  size: number;
  updated_at: string;
  created_at: string;
}> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/info/${BUCKET_NAME}/${storagePath}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      },
    );

    if (!response.ok) {
      throw new StorageError(`Metadata fetch failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Metadata fetch error', error as Error, { requestId });
    throw new StorageError('Failed to fetch file metadata');
  }
}
