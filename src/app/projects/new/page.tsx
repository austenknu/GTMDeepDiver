/**
 * src/app/projects/new/page.tsx: New project creation page
 * 
 * Form for creating new research projects with validation
 * and redirect to the project wizard upon successful creation.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ProjectCreateForm } from '@/features/projects/components/project-create-form';

export default async function NewProjectPage() {
  // Ensure user is authenticated
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Research Project</h1>
            <p className="text-gray-600 mt-2">
              Start a systematic deep-dive into your target company to build a compelling ROI case.
            </p>
          </div>
          
          <ProjectCreateForm />
        </div>
      </div>
    </div>
  );
}
