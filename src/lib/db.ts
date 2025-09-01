/**
 * src/lib/db.ts: Database connection and Prisma client setup
 * 
 * Provides a singleton Prisma client instance with proper connection pooling
 * and error handling for the GTM Deep Diver application.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect from database
 * Used in cleanup processes and testing
 */
export async function disconnectDb() {
  await prisma.$disconnect();
}

/**
 * Health check for database connectivity
 * Returns true if database is accessible, false otherwise
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('src/lib/db.ts: Database health check failed:', error);
    return false;
  }
}
