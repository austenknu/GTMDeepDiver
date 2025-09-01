/**
 * src/test/setup.ts: Test environment setup
 * 
 * Configures testing environment with necessary polyfills
 * and global test utilities.
 */

import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock';
process.env.CLERK_SECRET_KEY = 'sk_test_mock';

// Mock fetch for API calls in tests
global.fetch = jest.fn();

// Mock Clerk auth
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => ({ userId: 'test-user-id' })),
  currentUser: jest.fn(() => Promise.resolve({ 
    id: 'test-user-id', 
    firstName: 'Test', 
    lastName: 'User' 
  })),
  SignIn: ({ children }: { children: React.ReactNode }) => children,
  SignUp: ({ children }: { children: React.ReactNode }) => children,
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
  SignUpButton: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));
