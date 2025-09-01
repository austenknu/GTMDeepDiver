/**
 * src/middleware.ts: Next.js middleware for authentication and security
 * 
 * Handles authentication checks, rate limiting, and security headers
 * for all incoming requests before they reach API routes or pages.
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters } from '@/lib/redis';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/healthz',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

// Configure Clerk authentication middleware
export default clerkMiddleware(async (auth, req: NextRequest) => {
  // Apply rate limiting to API routes
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
    
    try {
      const { success, limit, reset, remaining } = await rateLimiters.api.limit(`api:${ip}`);
      
      if (!success) {
        console.log(`src/middleware.ts: Rate limit exceeded for IP: ${ip}`);
        return NextResponse.json(
          {
            type: 'about:blank',
            title: 'Too Many Requests',
            status: 429,
            detail: 'Rate limit exceeded. Please try again later.',
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(reset).toISOString(),
              'Content-Type': 'application/problem+json',
            },
          }
        );
      }
    } catch (error) {
      // If rate limiting fails, log but don't block the request
      console.error('src/middleware.ts: Rate limiting error:', error);
    }
  }

  // Check if route is public
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // Protect private routes
  const { userId } = auth();
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Log API access for audit trail
  if (req.nextUrl.pathname.startsWith('/api/') && userId) {
    console.log(`src/middleware.ts: API access - User: ${userId}, Endpoint: ${req.nextUrl.pathname}`);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};