/**
 * src/lib/redis.ts: Redis client configuration for caching and rate limiting
 * 
 * Provides Redis connection for caching external API responses,
 * rate limiting, and background job queue management.
 */

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client from environment variables
export const redis = Redis.fromEnv();

/**
 * Rate limiter configurations for different API endpoints
 * Uses sliding window algorithm for smooth rate limiting
 */
export const rateLimiters = {
  // General API rate limit: 100 requests per 10 seconds per IP
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    analytics: true,
  }),
  
  // Evidence fetching: 20 requests per minute per user (external API calls)
  evidenceFetch: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    analytics: true,
  }),
  
  // ROI calculations: 50 per hour per user (computationally intensive)
  roiCalculation: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'),
    analytics: true,
  }),
  
  // Outreach generation: 30 per hour per user (AI API calls)
  outreachGeneration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'),
    analytics: true,
  }),
};

/**
 * Cache external API responses with TTL
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlSeconds - Time to live in seconds
 */
export async function cacheSet(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    console.log(`src/lib/redis.ts: Cached data for key: ${key}`);
  } catch (error) {
    console.error('src/lib/redis.ts: Cache set error:', error);
  }
}

/**
 * Retrieve cached data
 * @param key - Cache key
 * @returns Parsed data or null if not found/expired
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`src/lib/redis.ts: Cache hit for key: ${key}`);
      return JSON.parse(cached as string);
    }
    console.log(`src/lib/redis.ts: Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error('src/lib/redis.ts: Cache get error:', error);
    return null;
  }
}

/**
 * Delete cached data
 * @param key - Cache key to delete
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
    console.log(`src/lib/redis.ts: Deleted cache key: ${key}`);
  } catch (error) {
    console.error('src/lib/redis.ts: Cache delete error:', error);
  }
}

/**
 * Health check for Redis connectivity
 * @returns true if Redis is accessible, false otherwise
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('src/lib/redis.ts: Redis health check failed:', error);
    return false;
  }
}
