/**
 * src/lib/audit.ts: Audit logging utilities for compliance and security
 * 
 * Provides functions to log user actions, API calls, and system events
 * for security monitoring, compliance, and debugging purposes.
 */

import { prisma } from './db';

/**
 * Log user action for audit trail
 * @param userId - Clerk user ID
 * @param action - Action performed (e.g., 'CREATE_PROJECT', 'DELETE_EVIDENCE')
 * @param detail - Detailed description of the action
 * @param projectId - Optional project ID if action is project-specific
 * @param ipAddress - Optional IP address
 * @param userAgent - Optional user agent string
 */
export async function auditLog(
  userId: string,
  action: string,
  detail: string,
  projectId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: action.toUpperCase(),
        detail,
        projectId,
        ipAddress,
        userAgent,
      },
    });
    
    console.log(`src/lib/audit.ts: Logged action ${action} for user ${userId}`);
  } catch (error) {
    // Audit logging should never break the main application flow
    console.error('src/lib/audit.ts: Failed to log audit event:', error);
  }
}

/**
 * Extract IP address from request headers
 * Handles various proxy configurations (Vercel, CloudFlare, etc.)
 */
export function getClientIP(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  
  return undefined;
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request: Request): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Convenience function to log API endpoint access
 * @param request - Request object
 * @param userId - Clerk user ID
 * @param endpoint - API endpoint accessed
 * @param method - HTTP method
 * @param projectId - Optional project ID
 */
export async function logApiAccess(
  request: Request,
  userId: string,
  endpoint: string,
  method: string,
  projectId?: string
): Promise<void> {
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);
  
  await auditLog(
    userId,
    `API_${method.toUpperCase()}`,
    `Accessed ${endpoint}`,
    projectId,
    ipAddress,
    userAgent
  );
}
