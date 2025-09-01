/**
 * src/app/api/projects/route.ts: Projects CRUD API endpoints
 * 
 * Handles creating new research projects and listing user's projects
 * with proper authentication, validation, and audit logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { ProjectCreate, Project } from '@/lib/schemas';
import { handleApiError, createdResponse, successResponse } from '@/lib/errors';
import { auditLog, logApiAccess } from '@/lib/audit';


/**
 * GET /api/projects - List user's projects
 * Returns paginated list of projects owned by the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await logApiAccess(request, userId, '/api/projects', 'GET');

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Max 50 per page
    const skip = (page - 1) * limit;

    // Get projects with pagination
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          companyName: true,
          companyDomain: true,
          productCategory: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              evidence: true,
              pains: true,
              stakeholders: true,
              outreachAssets: true,
            },
          },
        },
      }),
      prisma.project.count({
        where: { ownerId: userId },
      }),
    ]);

    console.log(`src/app/api/projects/route.ts: Retrieved ${projects.length} projects for user ${userId}`);

    return successResponse({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, '/api/projects');
  }
}

/**
 * POST /api/projects - Create new project
 * Creates a new research project with initial INIT status
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await logApiAccess(request, userId, '/api/projects', 'POST');

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProjectCreate.parse(body);

    // Create project with owner
    const project = await prisma.project.create({
      data: {
        ...validatedData,
        ownerId: userId,
      },
    });

    // Log project creation for audit
    await auditLog(
      userId,
      'CREATE_PROJECT',
      `Created project: ${project.name} for company: ${project.companyName}`,
      project.id
    );

    console.log(`src/app/api/projects/route.ts: Created project ${project.id} for user ${userId}`);

    // Validate response against schema
    const validatedProject = Project.parse({
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    });

    return createdResponse(validatedProject, 'Project created successfully');
  } catch (error) {
    return handleApiError(error, '/api/projects');
  }
}
