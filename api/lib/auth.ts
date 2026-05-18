/**
 * Authentication middleware and guards
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthenticationError, AuthorizationError } from './errors';
import { logger } from './logger';
import type { RequestContext } from '../types';

export interface DecodedToken {
  sub: string;
  email: string;
  aud: string;
  iss: string;
  exp: number;
}

/**
 * Extract JWT from Authorization header
 */
export function extractToken(authHeader?: string): string {
  if (!authHeader) {
    throw new AuthenticationError('Missing authorization header');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    throw new AuthenticationError('Invalid authorization header format');
  }

  return parts[1];
}

/**
 * Verify JWT token using Supabase
 */
export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }

    // Verify with Supabase Auth
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseKey,
      },
    });

    if (!response.ok) {
      throw new AuthenticationError('Invalid or expired token');
    }

    const user = (await response.json()) as { id: string; email: string };
    
    return {
      sub: user.id,
      email: user.email,
      aud: 'authenticated',
      iss: supabaseUrl,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };
  } catch (error) {
    logger.error('Token verification failed', error as Error);
    throw new AuthenticationError('Token verification failed');
  }
}

/**
 * Extract user context from request
 */
export async function extractContext(req: VercelRequest): Promise<RequestContext> {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);
  const decoded = await verifyToken(token);

  // Get user tier from database
  const tier = await getUserTier(decoded.sub);

  return {
    userId: decoded.sub,
    email: decoded.email,
    tier,
    requestId: generateRequestId(),
    timestamp: new Date(),
  };
}

/**
 * Get user subscription tier
 */
async function getUserTier(userId: string): Promise<'free' | 'pro' | 'enterprise'> {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return 'free';
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      },
    );

    if (!response.ok) return 'free';

    const data = (await response.json()) as Array<{ tier: string }>;
    return (data[0]?.tier as 'free' | 'pro' | 'enterprise') || 'free';
  } catch {
    return 'free';
  }
}

/**
 * Authorization guard - check if user has required tier
 */
export function requireTier(...tiers: Array<'free' | 'pro' | 'enterprise'>) {
  return (context: RequestContext) => {
    if (!tiers.includes(context.tier)) {
      throw new AuthorizationError('Insufficient permissions for this operation');
    }
  };
}

/**
 * Authorization guard - check if user owns resource
 */
export function requireOwnership(resourceUserId: string, requestUserId: string) {
  if (resourceUserId !== requestUserId) {
    throw new AuthorizationError('You do not own this resource');
  }
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware wrapper for authenticated endpoints
 */
export async function withAuth(
  handler: (req: VercelRequest, res: VercelResponse, context: RequestContext) => Promise<void>,
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const context = await extractContext(req);
      await handler(req, res, context);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: (error as Error).message,
            statusCode: 401,
          },
        });
      }

      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: (error as Error).message,
            statusCode: 403,
          },
        });
      }

      throw error;
    }
  };
}
