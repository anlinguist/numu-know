// Simple in-memory rate limiter for API routes
import { NextRequest, NextResponse } from 'next/server';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from './constants';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (for production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Get client identifier from request
 * Uses IP address or authorization header
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get auth token uid for authenticated requests
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Use a hash of the auth token as identifier
    return `auth:${authHeader.substring(0, 50)}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

  return `ip:${ip}`;
}

/**
 * Clean up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check if request should be rate limited
 * @param request - The incoming request
 * @param options - Rate limit options (optional, uses defaults from constants)
 * @returns null if allowed, or NextResponse with 429 if rate limited
 */
export function rateLimit(
  request: NextRequest,
  options?: {
    windowMs?: number;
    maxRequests?: number;
  }
): NextResponse | null {
  const windowMs = options?.windowMs || RATE_LIMIT_WINDOW_MS;
  const maxRequests = options?.maxRequests || RATE_LIMIT_MAX_REQUESTS;

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up on each request
    cleanupExpiredEntries();
  }

  const identifier = getClientIdentifier(request);
  const now = Date.now();

  let entry = rateLimitStore.get(identifier);

  // Create new entry if doesn't exist or expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(identifier, entry);
    return null; // Allow request
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
        },
      }
    );
  }

  // Allow request
  return null;
}

/**
 * Rate limit specifically for search endpoints (more restrictive)
 */
export function rateLimitSearch(request: NextRequest): NextResponse | null {
  return rateLimit(request, {
    windowMs: 60000, // 1 minute
    maxRequests: 20, // 20 searches per minute
  });
}

/**
 * Rate limit for admin endpoints (moderate)
 */
export function rateLimitAdmin(request: NextRequest): NextResponse | null {
  return rateLimit(request, {
    windowMs: 60000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  });
}

/**
 * Rate limit for public read endpoints (generous)
 */
export function rateLimitPublic(request: NextRequest): NextResponse | null {
  return rateLimit(request, {
    windowMs: 60000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  });
}
