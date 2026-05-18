/**
 * Core type definitions for backend services
 */

export interface RequestContext {
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  requestId: string;
  timestamp: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    requestId: string;
    timestamp: string;
    duration: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  statusCode: number;
}

export interface UploadMetadata {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface DocumentMetadata extends UploadMetadata {
  title?: string;
  description?: string;
  pages?: number;
  classification?: DocumentClassification;
  extractedContent?: string;
  searchIndex?: string[];
}

export interface DocumentClassification {
  category: string;
  confidence: number;
  tags: string[];
  extractedFields?: Record<string, unknown>;
}

export interface ProcessingJob {
  id: string;
  userId: string;
  uploadId: string;
  type: 'extraction' | 'classification' | 'analysis' | 'search-indexing';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high';
  retries: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
}

export interface GemmaRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

export interface GemmaResponse {
  text: string;
  tokens: number;
  model: string;
}

export interface SearchQuery {
  q: string;
  filters?: {
    category?: string;
    userId?: string;
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

export interface SearchResult {
  id: string;
  fileName: string;
  category: string;
  excerpt: string;
  score: number;
  url: string;
}

export interface BatchProcessingJob {
  id: string;
  userId: string;
  uploadIds: string[];
  type: 'extraction' | 'classification' | 'analysis';
  status: 'queued' | 'processing' | 'completed' | 'partial-failed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  createdAt: Date;
  completedAt?: Date;
  results?: ProcessingJob[];
}

export interface RateLimitConfig {
  userId: string;
  tier: string;
  limit: number;
  window: number; // in seconds
  currentUsage: number;
  resetAt: Date;
}
