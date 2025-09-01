/**
 * src/lib/auth.ts: Authentication and authorization utilities
 * 
 * Provides helper functions for Clerk authentication, RBAC,
 * and user session management across the application.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from './db';
import { Role } from '@prisma/client';

/**
 * Get current authenticated user from Clerk
 * Throws error if user is not authenticated
 */
export async function requireAuth() {
  const { userId } = auth();
  if (!userId) {
    throw new Error('Unauthorized: User must be authenticated');
  }
  return userId;
}

/**
 * Get current user with full profile information
 * Returns null if user is not authenticated
 */
export async function getCurrentUser() {
  const user = await currentUser();
  return user;
}

/**
 * Get user's role from database
 * Creates USER role if user doesn't exist in user_roles table
 */
export async function getUserRole(userId: string): Promise<Role> {
  try {
    let userRole = await prisma.userRole.findUnique({
      where: { userId },
    });

    // Create default USER role if user doesn't exist
    if (!userRole) {
      userRole = await prisma.userRole.create({
        data: {
          userId,
          role: 'USER',
        },
      });
      console.log(`src/lib/auth.ts: Created USER role for user: ${userId}`);
    }

    return userRole.role;
  } catch (error) {
    console.error('src/lib/auth.ts: Error getting user role:', error);
    return 'GUEST'; // Default to most restrictive role
  }
}

/**
 * Check if user has required role
 * @param userId - Clerk user ID
 * @param requiredRoles - Array of roles that are allowed
 * @returns true if user has one of the required roles
 */
export async function hasRole(userId: string, requiredRoles: Role[]): Promise<boolean> {
  const userRole = await getUserRole(userId);
  return requiredRoles.includes(userRole);
}

/**
 * Require user to have specific role, throw error if not
 * @param userId - Clerk user ID  
 * @param requiredRoles - Array of roles that are allowed
 */
export async function requireRole(userId: string, requiredRoles: Role[]): Promise<void> {
  const hasRequiredRole = await hasRole(userId, requiredRoles);
  if (!hasRequiredRole) {
    const userRole = await getUserRole(userId);
    throw new Error(`Forbidden: User role '${userRole}' is not authorized. Required: ${requiredRoles.join(', ')}`);
  }
}

/**
 * Check if user owns or has access to a project
 * @param userId - Clerk user ID
 * @param projectId - Project UUID
 * @param accessType - Type of access needed ('read' | 'write' | 'admin')
 * @returns true if user has access
 */
export async function hasProjectAccess(
  userId: string, 
  projectId: string, 
  accessType: 'read' | 'write' | 'admin' = 'read'
): Promise<boolean> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) {
      return false;
    }

    // Owner has all access
    if (project.ownerId === userId) {
      return true;
    }

    // Check role-based access
    const userRole = await getUserRole(userId);
    
    switch (accessType) {
      case 'read':
        return ['ADMIN', 'USER'].includes(userRole);
      case 'write':
        return ['ADMIN', 'USER'].includes(userRole);
      case 'admin':
        return userRole === 'ADMIN';
      default:
        return false;
    }
  } catch (error) {
    console.error('src/lib/auth.ts: Error checking project access:', error);
    return false;
  }
}

/**
 * Require project access, throw error if not authorized
 * @param userId - Clerk user ID
 * @param projectId - Project UUID
 * @param accessType - Type of access needed
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string,
  accessType: 'read' | 'write' | 'admin' = 'read'
): Promise<void> {
  const hasAccess = await hasProjectAccess(userId, projectId, accessType);
  if (!hasAccess) {
    throw new Error(`Forbidden: User does not have ${accessType} access to project ${projectId}`);
  }
}
