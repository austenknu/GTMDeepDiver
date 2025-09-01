/**
 * src/app/projects/[id]/page.tsx: Project wizard main page
 * 
 * Main project page that displays the 7-phase wizard for conducting
 * systematic company research and ROI analysis.
 */

import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireProjectAccess } from '@/lib/auth';
import { ProjectWizard } from '@/features/projects/components/project-wizard';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  // Ensure user is authenticated
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  try {
    // Check project access authorization
    await requireProjectAccess(userId, params.id, 'read');

    // Fetch project with all related data
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        evidence: {
          orderBy: { createdAt: 'desc' },
          include: {
            signals: true,
          },
        },
        pains: {
          orderBy: { createdAt: 'desc' },
          include: {
            evidenceLinks: true,
          },
        },
        stakeholders: {
          orderBy: { createdAt: 'desc' },
        },
        outreachAssets: {
          orderBy: { createdAt: 'desc' },
        },
        roiCalculations: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get most recent calculation
        },
        exports: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get most recent export
        },
      },
    });

    if (!project) {
      notFound();
    }

    console.log(`src/app/projects/[id]/page.tsx: Loaded project ${project.id} with status ${project.status}`);

    return (
      <div className="min-h-screen bg-gray-50">
        <ProjectWizard project={project} />
      </div>
    );
  } catch (error) {
    console.error('src/app/projects/[id]/page.tsx: Error loading project:', error);
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      redirect('/dashboard');
    }
    
    notFound();
  }
}
