/**
 * src/app/dashboard/page.tsx: Main dashboard page
 * 
 * Displays user's projects, recent activity, and quick actions
 * for creating new research projects and accessing existing ones.
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FolderOpen, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  // Ensure user is authenticated
  const { userId } = auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();
  
  // Fetch user's projects with summary statistics
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: 'desc' },
    take: 10, // Show recent 10 projects
    include: {
      _count: {
        select: {
          evidence: true,
          pains: true,
          stakeholders: true,
          outreachAssets: true,
        },
      },
    },
  });

  // Calculate dashboard statistics
  const totalProjects = await prisma.project.count({
    where: { ownerId: userId },
  });

  const completedProjects = await prisma.project.count({
    where: { 
      ownerId: userId,
      status: 'READY',
    },
  });

  const totalEvidence = await prisma.evidence.count({
    where: {
      project: { ownerId: userId },
    },
  });

  console.log(`src/app/dashboard/page.tsx: Dashboard loaded for user ${userId} with ${totalProjects} projects`);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.firstName || 'there'}!
              </h1>
              <p className="text-gray-600 mt-1">
                Continue your research projects or start a new deep-dive
              </p>
            </div>
            <Link href="/projects/new">
              <Button size="lg">
                <Plus className="mr-2 h-5 w-5" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {completedProjects} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evidence Collected</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvidence}</div>
              <p className="text-xs text-muted-foreground">
                Across all projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Projects fully completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Projects */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Recent Projects</h2>
            <Link href="/projects">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects yet</h3>
                <p className="text-gray-600 text-center mb-6">
                  Start your first research project to begin analyzing companies and building ROI cases.
                </p>
                <Link href="/projects/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription>
                          {project.companyName} • {project.productCategory}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          project.status === 'READY' 
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'INIT'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-4 text-sm text-gray-600">
                        <span>{project._count.evidence} evidence</span>
                        <span>{project._count.pains} pains</span>
                        <span>{project._count.stakeholders} stakeholders</span>
                        <span>{project._count.outreachAssets} assets</span>
                      </div>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          Continue Research
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
