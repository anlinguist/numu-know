import { NextRequest, NextResponse } from 'next/server';

/**
 * Generate a random nonce as base64-encoded string using crypto.randomUUID
 * This is the recommended approach per Next.js docs
 */
function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

/**
 * Proxy handler to add nonce and security headers to response
 * Generates a unique nonce for each request to enable inline styles/scripts
 * without using 'unsafe-inline'
 */
export function proxy(request: NextRequest) {
  // Generate a unique nonce for this request
  const nonce = generateNonce();

  // Clone the request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Create response with modified headers
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Set nonce in response headers so it's available to the app
  response.headers.set('x-nonce', nonce);

  const isDev = process.env.NODE_ENV !== 'production';

  // Build CSP header with nonce
  const cspHeader = isDev
    ? [
        "default-src 'self'",
        "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com`,
        `style-src 'self' 'unsafe-inline'`,
        "font-src 'self' data:",
        "img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.google.com https://*.gstatic.com https://i.ytimg.com",
        `connect-src 'self' https://firebasestorage.googleapis.com https://firestore.googleapis.com https://*.googleapis.com https://www.google-analytics.com https://analytics.google.com https://public-api.wordpress.com`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    : [
        "default-src 'self'",
        "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com`,
        `style-src 'self' 'unsafe-inline'`,
        "font-src 'self' data:",
        "img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://*.google.com https://*.gstatic.com https://i.ytimg.com",
        `connect-src 'self' https://firebasestorage.googleapis.com https://firestore.googleapis.com https://*.googleapis.com https://www.google-analytics.com https://analytics.google.com https://public-api.wordpress.com`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests",
      ].join('; ');

  // Set security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

/**
 * Configure which routes this proxy applies to
 * Apply to all routes except API routes and static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
