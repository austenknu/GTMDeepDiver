/**
 * src/app/providers.tsx: Client-side providers wrapper
 * 
 * Wraps the application with necessary providers including
 * React Query for server state management.
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient instance with optimized configuration
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          // Stale time: 5 minutes for most data
          staleTime: 5 * 60 * 1000,
          // Cache time: 10 minutes
          gcTime: 10 * 60 * 1000,
          // Retry failed requests 3 times with exponential backoff
          retry: 3,
          retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          // Refetch on window focus for real-time data
          refetchOnWindowFocus: true,
        },
        mutations: {
          // Retry mutations once on failure
          retry: 1,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
