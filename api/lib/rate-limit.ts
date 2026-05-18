/**
 * Rate limiting service
 */

import type { RateLimitConfig, RequestContext } from '../types';
import { RateLimitError } from './errors';
import { logger } from './logger';

// In-memory store for rate limits (use Redis in production)
const rateLimitStore = new Map<string, RateLimitConfig>();

/**
 * Rate limit configuration by tier
 */
const TIER_LIMITS = {
  free: {
    uploadLimit: 5,
    uploadWindow: 3600, // 1 hour
    processingLimit: 1,
    processingWindow: 3600, // 1 hour
    searchLimit: 20,
    searchWindow: 3600, // 1 hour
  },
  pro: {
    uploadLimit: 50,
    uploadWindow: 3600,
    processingLimit: 10,
    processingWindow: 3600,
    searchLimit: 200,
    searchWindow: 3600,
  },
  enterprise: {
    uploadLimit: 999,
    uploadWindow: 3600,
    processingLimit: 999,
    processingWindow: 3600,
    searchLimit: 999,
    searchWindow: 3600,
  },
};

/**
 * Check rate limit for action
 */
export async function checkRateLimit(
  context: RequestContext,
  action: 'upload' | 'processing' | 'search',
): Promise<void> {
  const key = `${context.userId}:${action}`;
  const limits = TIER_LIMITS[context.tier];
  const limit = limits[`${action}Limit` as keyof typeof limits] as number;
  const window = limits[`${action}Window` as keyof typeof limits] as number;

  let config = rateLimitStore.get(key);
  const now = new Date();

  // Initialize or reset if window expired
  if (!config || config.resetAt < now) {
    config = {
      userId: context.userId,
      tier: context.tier,
      limit,
      window,
      currentUsage: 0,
      resetAt: new Date(now.getTime() + window * 1000),
    };
  }

  // Check if limit exceeded
  if (config.currentUsage >= limit) {
    logger.warn('Rate limit exceeded', {
      userId: context.userId,
      action,
      tier: context.tier,
      requestId: context.requestId,
    });

    throw new RateLimitError(
      `Rate limit exceeded. Max ${limit} ${action} requests per ${window} seconds`,
    );
  }

  // Increment usage
  config.currentUsage += 1;
  rateLimitStore.set(key, config);
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(
  context: RequestContext,
  action: 'upload' | 'processing' | 'search',
) {
  const key = `${context.userId}:${action}`;
  const limits = TIER_LIMITS[context.tier];
  const limit = limits[`${action}Limit` as keyof typeof limits] as number;
  const window = limits[`${action}Window` as keyof typeof limits] as number;

  const config = rateLimitStore.get(key);
  const now = new Date();

  if (!config || config.resetAt < now) {
    return {
      limit,
      used: 0,
      remaining: limit,
      resetAt: new Date(now.getTime() + window * 1000),
    };
  }

  return {
    limit,
    used: config.currentUsage,
    remaining: Math.max(0, limit - config.currentUsage),
    resetAt: config.resetAt,
  };
}

/**
 * Reset rate limit for user (admin use)
 */
export function resetRateLimit(userId: string, action?: 'upload' | 'processing' | 'search') {
  if (action) {
    rateLimitStore.delete(`${userId}:${action}`);
  } else {
    rateLimitStore.delete(`${userId}:upload`);
    rateLimitStore.delete(`${userId}:processing`);
    rateLimitStore.delete(`${userId}:search`);
  }
}

/**
 * Cleanup old rate limit entries (call periodically)
 */
export function cleanupRateLimits() {
  const now = new Date();
  let cleaned = 0;

  for (const [key, config] of rateLimitStore.entries()) {
    if (config.resetAt < now) {
      rateLimitStore.delete(key);
      cleaned += 1;
    }
  }

  logger.debug('Rate limit cleanup', { cleaned });
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
