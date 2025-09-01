/**
 * src/app/api/healthz/route.ts: Health check endpoint
 * 
 * Provides system health status including database and Redis connectivity
 * for monitoring and load balancer health checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';
import { checkRedisHealth } from '@/lib/redis';

export async function GET(_request: NextRequest) {
  console.log('src/app/api/healthz/route.ts: Health check requested');
  
  try {
    // Check database connectivity
    const dbHealthy = await checkDbHealth();
    
    // Check Redis connectivity  
    const redisHealthy = await checkRedisHealth();
    
    // Overall system health
    const healthy = dbHealthy && redisHealthy;
    
    const healthStatus = {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy ? 'healthy' : 'unhealthy',
      },
      version: process.env.npm_package_version || '0.1.0',
    };

    console.log(`src/app/api/healthz/route.ts: Health check completed - Status: ${healthStatus.status}`);
    
    return NextResponse.json(healthStatus, {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('src/app/api/healthz/route.ts: Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
