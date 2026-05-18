/**
 * Supabase database service
 */

import type { DocumentMetadata, ProcessingJob, BatchProcessingJob } from '../types';
import { StorageError, NotFoundError } from './errors';
import { logger } from './logger';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface FetchOptions {
  headers?: Record<string, string>;
}

/**
 * Execute Supabase API call
 */
async function supabaseCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
  options: FetchOptions = {},
): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Supabase API error: ${endpoint}`, new Error(error));
      throw new StorageError(`Database operation failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Supabase call failed', error as Error, { endpoint, method });
    throw new StorageError('Database operation failed');
  }
}

/**
 * Document metadata operations
 */
export const documentService = {
  async create(metadata: Omit<DocumentMetadata, 'id' | 'uploadedAt'>): Promise<DocumentMetadata> {
    const doc = {
      ...metadata,
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uploadedAt: new Date().toISOString(),
    };

    await supabaseCall('documents', 'POST', doc);
    return doc;
  },

  async get(id: string): Promise<DocumentMetadata> {
    const results = await supabaseCall<DocumentMetadata[]>(
      `documents?id=eq.${id}`,
    );

    if (!results.length) {
      throw new NotFoundError('Document');
    }

    return results[0];
  },

  async list(userId: string, limit = 50, offset = 0): Promise<DocumentMetadata[]> {
    return supabaseCall<DocumentMetadata[]>(
      `documents?userId=eq.${userId}&order=uploadedAt.desc&limit=${limit}&offset=${offset}`,
    );
  },

  async update(
    id: string,
    updates: Partial<Omit<DocumentMetadata, 'id' | 'uploadedAt'>>,
  ): Promise<void> {
    await supabaseCall(
      `documents?id=eq.${id}`,
      'PATCH',
      updates,
    );
  },

  async delete(id: string): Promise<void> {
    await supabaseCall(
      `documents?id=eq.${id}`,
      'DELETE',
    );
  },

  async search(userId: string, query: string): Promise<DocumentMetadata[]> {
    // Full-text search using Supabase
    const searchQuery = `
      searchIndex.fts(english, '${query.replace(/'/g, "''")}')
      &userId=eq.${userId}
    `;
    return supabaseCall<DocumentMetadata[]>(
      `documents?${encodeURIComponent(searchQuery)}`,
    );
  },
};

/**
 * Processing job operations
 */
export const processingService = {
  async create(job: Omit<ProcessingJob, 'id' | 'createdAt'>): Promise<ProcessingJob> {
    const newJob = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    await supabaseCall('processing_jobs', 'POST', newJob);
    return newJob;
  },

  async get(id: string): Promise<ProcessingJob> {
    const results = await supabaseCall<ProcessingJob[]>(
      `processing_jobs?id=eq.${id}`,
    );

    if (!results.length) {
      throw new NotFoundError('Processing job');
    }

    return results[0];
  },

  async list(userId: string, status?: string): Promise<ProcessingJob[]> {
    const query = status
      ? `processing_jobs?userId=eq.${userId}&status=eq.${status}&order=createdAt.desc`
      : `processing_jobs?userId=eq.${userId}&order=createdAt.desc`;

    return supabaseCall<ProcessingJob[]>(query);
  },

  async update(
    id: string,
    updates: Partial<Omit<ProcessingJob, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await supabaseCall(
      `processing_jobs?id=eq.${id}`,
      'PATCH',
      updates,
    );
  },

  async updateStatus(
    id: string,
    status: ProcessingJob['status'],
    result?: unknown,
    error?: ProcessingJob['error'],
  ): Promise<void> {
    const updates: Partial<ProcessingJob> = {
      status,
      ...(status === 'completed' && { completedAt: new Date().toISOString(), result }),
      ...(status === 'failed' && { error }),
    };

    await this.update(id, updates);
  },

  async getByUploadId(uploadId: string): Promise<ProcessingJob[]> {
    return supabaseCall<ProcessingJob[]>(
      `processing_jobs?uploadId=eq.${uploadId}&order=createdAt.desc`,
    );
  },
};

/**
 * Batch processing operations
 */
export const batchService = {
  async create(batch: Omit<BatchProcessingJob, 'id' | 'createdAt'>): Promise<BatchProcessingJob> {
    const newBatch = {
      ...batch,
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    await supabaseCall('batch_jobs', 'POST', newBatch);
    return newBatch;
  },

  async get(id: string): Promise<BatchProcessingJob> {
    const results = await supabaseCall<BatchProcessingJob[]>(
      `batch_jobs?id=eq.${id}`,
    );

    if (!results.length) {
      throw new NotFoundError('Batch job');
    }

    return results[0];
  },

  async update(
    id: string,
    updates: Partial<Omit<BatchProcessingJob, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await supabaseCall(
      `batch_jobs?id=eq.${id}`,
      'PATCH',
      updates,
    );
  },

  async incrementProgress(
    id: string,
    completed: boolean,
    failed: boolean = false,
  ): Promise<void> {
    const batch = await this.get(id);
    const updates = {
      progress: {
        total: batch.progress.total,
        completed: batch.progress.completed + (completed ? 1 : 0),
        failed: batch.progress.failed + (failed ? 1 : 0),
      },
    };

    await this.update(id, updates);
  },
};
