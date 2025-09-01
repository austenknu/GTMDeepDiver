/**
 * src/app/layout.tsx: Root layout component with providers
 * 
 * Sets up global providers for authentication, React Query,
 * and styling for the entire application.
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GTM Deep Diver - Sales Research & ROI Analysis',
  description: 'SaaS tool that guides sales agents through company deep-dives, turning public evidence into pain-point maps and quantified ROI business cases.',
  keywords: ['sales', 'research', 'ROI', 'B2B', 'prospecting', 'analysis'],
  authors: [{ name: 'GTM Deep Diver Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow', // Prevent indexing during development
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
