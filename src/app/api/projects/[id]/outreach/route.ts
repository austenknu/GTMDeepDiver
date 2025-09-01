/**
 * src/app/api/projects/[id]/outreach/route.ts: Outreach generation API endpoints
 * 
 * Handles generating persona-specific outreach assets with ROI justification
 * and source attribution for sales teams.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

import { handleApiError, createdResponse, successResponse } from '@/lib/errors';
import { requireProjectAccess } from '@/lib/auth';
import { auditLog, logApiAccess } from '@/lib/audit';
import { generateOutreachAsset, validateOutreachRequirements } from '@/lib/outreach-generator';
import { rateLimiters } from '@/lib/redis';
import { z } from 'zod';

interface RouteParams {
  params: {
    id: string;
  };
}

const OutreachGenerateRequest = z.object({
  stakeholderId: z.string().uuid(),
  kind: z.enum(['email_economic', 'email_technical', 'email_user', 'linkedin_dm']),
  senderName: z.string().min(1).max(100).optional(),
});

/**
 * GET /api/projects/[id]/outreach - List project outreach assets
 * Returns generated outreach assets for the project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'read');
    await logApiAccess(request, userId, `/api/projects/${params.id}/outreach`, 'GET', params.id);

    // Get outreach assets for project
    const outreachAssets = await prisma.outreachAsset.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON fields
    const assetsWithParsedData = outreachAssets.map(asset => ({
      ...asset,
      assumptions: JSON.parse(asset.assumptions),
      sources: JSON.parse(asset.sources),
    }));

    console.log(`src/app/api/projects/[id]/outreach/route.ts: Retrieved ${outreachAssets.length} outreach assets for project ${params.id}`);

    return successResponse({ outreachAssets: assetsWithParsedData });
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/outreach`);
  }
}

/**
 * POST /api/projects/[id]/outreach - Generate new outreach asset
 * Generates persona-specific outreach content with ROI justification
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'write');
    await logApiAccess(request, userId, `/api/projects/${params.id}/outreach`, 'POST', params.id);

    // Apply rate limiting for outreach generation
    const { success } = await rateLimiters.outreachGeneration.limit(`outreach:${userId}`);
    if (!success) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Rate Limit Exceeded',
          status: 429,
          detail: 'Too many outreach generations. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { stakeholderId, kind, senderName = 'Sales Team' } = OutreachGenerateRequest.parse(body);

    // Get project data needed for outreach generation
    const [project, stakeholder, pains, roiCalculation, evidence] = await Promise.all([
      prisma.project.findUnique({
        where: { id: params.id },
        select: { companyName: true, productCategory: true },
      }),
      prisma.stakeholder.findUnique({
        where: { id: stakeholderId, projectId: params.id },
      }),
      prisma.pain.findMany({
        where: { projectId: params.id },
        orderBy: { confidence: 'desc' },
        take: 3, // Use top 3 pain points
      }),
      prisma.roiCalculation.findFirst({
        where: { projectId: params.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.evidence.findMany({
        where: { 
          projectId: params.id,
          approved: true,
        },
        select: { url: true },
      }),
    ]);

    if (!project || !stakeholder) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          detail: 'Project or stakeholder not found',
        },
        { status: 404 }
      );
    }

    // Parse stakeholder JSON fields
    const stakeholderData = {
      ...stakeholder,
      goals: JSON.parse(stakeholder.goals),
      objections: JSON.parse(stakeholder.objections),
      proofPoints: JSON.parse(stakeholder.proofPoints),
    };

    // Parse ROI output if available
    let roiOutput;
    if (roiCalculation) {
      roiOutput = {
        low: JSON.parse(roiCalculation.lowScenario),
        mostLikely: JSON.parse(roiCalculation.mostLikelyScenario),
        high: JSON.parse(roiCalculation.highScenario),
      };
    }

    // Validate requirements
    const validationErrors = validateOutreachRequirements({
      pains,
      stakeholders: [stakeholderData],
      roiOutput,
    });

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Validation Error',
          status: 400,
          detail: validationErrors.join('; '),
        },
        { status: 400 }
      );
    }

    // Generate outreach content
    const sources = evidence.map(e => e.url).filter(Boolean) as string[];
    const generatedContent = generateOutreachAsset(
      kind,
      stakeholderData,
      {
        companyName: project.companyName,
        productCategory: project.productCategory,
        pains,
        roiOutput,
        sources,
      },
      senderName
    );

    // Create outreach asset record
    const outreachAsset = await prisma.outreachAsset.create({
      data: {
        projectId: params.id,
        kind,
        subject: generatedContent.subject,
        body: generatedContent.body,
        assumptions: JSON.stringify(generatedContent.assumptions),
        sources: JSON.stringify(generatedContent.sources),
      },
    });

    // Update project status if this is first outreach asset
    const projectStatus = await prisma.project.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (projectStatus?.status === 'STAKE') {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'OUTREACH' },
      });
      console.log(`src/app/api/projects/[id]/outreach/route.ts: Advanced project ${params.id} to OUTREACH status`);
    }

    // Log outreach generation
    await auditLog(
      userId,
      'GENERATE_OUTREACH',
      `Generated ${kind} for ${stakeholder.name} (${stakeholder.persona})`,
      params.id
    );

    console.log(`src/app/api/projects/[id]/outreach/route.ts: Generated outreach asset ${outreachAsset.id} for project ${params.id}`);

    // Return with parsed JSON fields
    const assetWithParsedData = {
      ...outreachAsset,
      assumptions: JSON.parse(outreachAsset.assumptions),
      sources: JSON.parse(outreachAsset.sources),
    };

    return createdResponse(assetWithParsedData, 'Outreach asset generated successfully');
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/outreach`);
  }
}
