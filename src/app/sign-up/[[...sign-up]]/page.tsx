/**
 * src/app/sign-up/[[...sign-up]]/page.tsx: Sign-up page
 * 
 * Clerk-powered sign-up page with custom styling
 * and onboarding flow for new users.
 */

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Join GTM Deep Diver
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Start building systematic research processes for your sales team
          </p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
              card: 'shadow-lg',
            },
          }}
        />
      </div>
    </div>
  );
}
