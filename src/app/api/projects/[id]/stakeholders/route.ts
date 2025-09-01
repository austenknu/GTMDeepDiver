/**
 * src/app/api/projects/[id]/stakeholders/route.ts: Stakeholder mapping API endpoints
 * 
 * Handles CRUD operations for stakeholder personas including
 * goals, objections, and proof points for targeted outreach.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { StakeholderCreate } from '@/lib/schemas';
import { handleApiError, createdResponse, successResponse } from '@/lib/errors';
import { requireProjectAccess } from '@/lib/auth';
import { auditLog, logApiAccess } from '@/lib/audit';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/[id]/stakeholders - List project stakeholders
 * Returns stakeholder personas with goals, objections, and proof points
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'read');
    await logApiAccess(request, userId, `/api/projects/${params.id}/stakeholders`, 'GET', params.id);

    // Get stakeholders for project
    const stakeholders = await prisma.stakeholder.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields for each stakeholder
    const stakeholdersWithParsedData = stakeholders.map(stakeholder => ({
      ...stakeholder,
      goals: JSON.parse(stakeholder.goals),
      objections: JSON.parse(stakeholder.objections),
      proofPoints: JSON.parse(stakeholder.proofPoints),
    }));

    console.log(`src/app/api/projects/[id]/stakeholders/route.ts: Retrieved ${stakeholders.length} stakeholders for project ${params.id}`);

    return successResponse({ stakeholders: stakeholdersWithParsedData });
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/stakeholders`);
  }
}

/**
 * POST /api/projects/[id]/stakeholders - Create new stakeholder
 * Creates stakeholder persona with goals, objections, and proof points
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'write');
    await logApiAccess(request, userId, `/api/projects/${params.id}/stakeholders`, 'POST', params.id);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = StakeholderCreate.parse({
      ...body,
      projectId: params.id,
    });

    // Create stakeholder with JSON-stringified arrays
    const stakeholder = await prisma.stakeholder.create({
      data: {
        ...validatedData,
        goals: JSON.stringify(validatedData.goals),
        objections: JSON.stringify(validatedData.objections),
        proofPoints: JSON.stringify(validatedData.proofPoints),
      },
    });

    // Update project status if this is first stakeholder
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (project?.status === 'ROI') {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'STAKE' },
      });
      console.log(`src/app/api/projects/[id]/stakeholders/route.ts: Advanced project ${params.id} to STAKE status`);
    }

    // Log stakeholder creation
    await auditLog(
      userId,
      'CREATE_STAKEHOLDER',
      `Added stakeholder: ${validatedData.name} (${validatedData.title}) - ${validatedData.persona}`,
      params.id
    );

    console.log(`src/app/api/projects/[id]/stakeholders/route.ts: Created stakeholder ${stakeholder.id} for project ${params.id}`);

    // Return stakeholder with parsed JSON fields
    const stakeholderWithParsedData = {
      ...stakeholder,
      goals: JSON.parse(stakeholder.goals),
      objections: JSON.parse(stakeholder.objections),
      proofPoints: JSON.parse(stakeholder.proofPoints),
    };

    return createdResponse(stakeholderWithParsedData, 'Stakeholder created successfully');
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/stakeholders`);
  }
}
