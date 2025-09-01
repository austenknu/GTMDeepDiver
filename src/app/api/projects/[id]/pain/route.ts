/**
 * src/app/api/projects/[id]/pain/route.ts: Pain point mapping API endpoints
 * 
 * Handles creating and managing pain points linked to evidence sources
 * with confidence scoring and business impact categorization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { PainCreate } from '@/lib/schemas';
import { handleApiError, createdResponse, successResponse } from '@/lib/errors';
import { requireProjectAccess } from '@/lib/auth';
import { auditLog, logApiAccess } from '@/lib/audit';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/[id]/pain - List project pain points
 * Returns pain points with linked evidence and confidence scores
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'read');
    await logApiAccess(request, userId, `/api/projects/${params.id}/pain`, 'GET', params.id);

    // Get pain points with linked evidence
    const pains = await prisma.pain.findMany({
      where: { projectId: params.id },
      orderBy: { confidence: 'desc' },
      include: {
        evidenceLinks: {
          include: {
            pain: false, // Avoid circular reference
          },
        },
      },
    });

    // Get evidence details for each pain point
    const painsWithEvidence = await Promise.all(
      pains.map(async (pain) => {
        const evidenceDetails = await prisma.evidence.findMany({
          where: {
            id: { in: pain.evidenceIds },
          },
          select: {
            id: true,
            title: true,
            type: true,
            url: true,
            author: true,
            publishedAt: true,
          },
        });

        return {
          ...pain,
          evidence: evidenceDetails,
        };
      })
    );

    console.log(`src/app/api/projects/[id]/pain/route.ts: Retrieved ${pains.length} pain points for project ${params.id}`);

    return successResponse({ pains: painsWithEvidence });
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/pain`);
  }
}

/**
 * POST /api/projects/[id]/pain - Create new pain point
 * Creates pain point linked to evidence sources with business impact
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'write');
    await logApiAccess(request, userId, `/api/projects/${params.id}/pain`, 'POST', params.id);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = PainCreate.parse({
      ...body,
      projectId: params.id,
    });

    // Verify all evidence IDs exist and belong to this project
    const evidenceCount = await prisma.evidence.count({
      where: {
        id: { in: validatedData.evidenceIds },
        projectId: params.id,
      },
    });

    if (evidenceCount !== validatedData.evidenceIds.length) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Invalid Evidence',
          status: 400,
          detail: 'One or more evidence IDs are invalid or not part of this project',
        },
        { status: 400 }
      );
    }

    // Create pain point
    const pain = await prisma.pain.create({
      data: validatedData,
    });

    // Create evidence links
    await Promise.all(
      validatedData.evidenceIds.map(evidenceId =>
        prisma.painEvidence.create({
          data: {
            painId: pain.id,
            evidenceId,
          },
        })
      )
    );

    // Update project status if this is first pain point
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (project?.status === 'COMPANY') {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'PAIN' },
      });
      console.log(`src/app/api/projects/[id]/pain/route.ts: Advanced project ${params.id} to PAIN status`);
    }

    // Log pain point creation
    await auditLog(
      userId,
      'CREATE_PAIN',
      `Mapped pain point: ${validatedData.name} (${validatedData.userGroup}) with ${validatedData.evidenceIds.length} evidence sources`,
      params.id
    );

    console.log(`src/app/api/projects/[id]/pain/route.ts: Created pain point ${pain.id} for project ${params.id}`);

    return createdResponse(pain, 'Pain point created successfully');
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/pain`);
  }
}
