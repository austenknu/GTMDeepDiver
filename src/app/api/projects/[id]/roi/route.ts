/**
 * src/app/api/projects/[id]/roi/route.ts: ROI calculation API endpoints
 * 
 * Handles ROI scenario calculations with sensitivity analysis
 * and stores results for project tracking and export generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { RoiInputs } from '@/lib/schemas';
import { handleApiError, successResponse } from '@/lib/errors';
import { requireProjectAccess } from '@/lib/auth';
import { auditLog, logApiAccess } from '@/lib/audit';
import { calculateRoiScenarios, validateRoiInputs } from '@/lib/roi-calculator';
import { rateLimiters } from '@/lib/redis';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/[id]/roi - Get latest ROI calculation
 * Returns the most recent ROI calculation for the project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'read');
    await logApiAccess(request, userId, `/api/projects/${params.id}/roi`, 'GET', params.id);

    // Get latest ROI calculation
    const roiCalculation = await prisma.roiCalculation.findFirst({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!roiCalculation) {
      return successResponse({ roiCalculation: null });
    }

    // Parse stored JSON scenarios
    const result = {
      ...roiCalculation,
      lowScenario: JSON.parse(roiCalculation.lowScenario),
      mostLikelyScenario: JSON.parse(roiCalculation.mostLikelyScenario),
      highScenario: JSON.parse(roiCalculation.highScenario),
    };

    console.log(`src/app/api/projects/[id]/roi/route.ts: Retrieved ROI calculation for project ${params.id}`);

    return successResponse({ roiCalculation: result });
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/roi`);
  }
}

/**
 * POST /api/projects/[id]/roi - Calculate ROI scenarios
 * Computes low/likely/high ROI scenarios and stores results
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'write');
    await logApiAccess(request, userId, `/api/projects/${params.id}/roi`, 'POST', params.id);

    // Apply rate limiting for ROI calculations
    const { success } = await rateLimiters.roiCalculation.limit(`roi:${userId}`);
    if (!success) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Rate Limit Exceeded',
          status: 429,
          detail: 'Too many ROI calculations. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const inputs = RoiInputs.parse(body);

    // Validate inputs for reasonableness
    const warnings = validateRoiInputs(inputs);
    if (warnings.length > 0) {
      console.log(`src/app/api/projects/[id]/roi/route.ts: ROI input warnings for project ${params.id}:`, warnings);
    }

    // Calculate ROI scenarios
    const roiOutput = calculateRoiScenarios(inputs);

    // Store calculation in database
    const roiCalculation = await prisma.roiCalculation.create({
      data: {
        projectId: params.id,
        // Input parameters
        nPeople: inputs.nPeople,
        costPerHour: inputs.costPerHour,
        hoursSavedPerPersonPerMonth: inputs.hoursSavedPerPersonPerMonth,
        errorCostAnnual: inputs.errorCostAnnual,
        errorReductionPct: inputs.errorReductionPct,
        cloudSpendAnnual: inputs.cloudSpendAnnual,
        cloudReductionPct: inputs.cloudReductionPct,
        riskCostAnnual: inputs.riskCostAnnual,
        riskReductionPct: inputs.riskReductionPct,
        licenseCostAnnual: inputs.licenseCostAnnual,
        implementationOneTime: inputs.implementationOneTime,
        // Calculated scenarios as JSON
        lowScenario: JSON.stringify(roiOutput.low),
        mostLikelyScenario: JSON.stringify(roiOutput.mostLikely),
        highScenario: JSON.stringify(roiOutput.high),
      },
    });

    // Update project status if this is first ROI calculation
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { status: true },
    });

    if (project?.status === 'PAIN') {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'ROI' },
      });
      console.log(`src/app/api/projects/[id]/roi/route.ts: Advanced project ${params.id} to ROI status`);
    }

    // Log ROI calculation
    await auditLog(
      userId,
      'CALCULATE_ROI',
      `Calculated ROI scenarios - Most likely: ${roiOutput.mostLikely.roiPct}% ROI, ${roiOutput.mostLikely.paybackMonths} month payback`,
      params.id
    );

    console.log(`src/app/api/projects/[id]/roi/route.ts: ROI calculation completed for project ${params.id}`);

    return successResponse({
      roiCalculation: {
        ...roiCalculation,
        lowScenario: roiOutput.low,
        mostLikelyScenario: roiOutput.mostLikely,
        highScenario: roiOutput.high,
      },
      warnings,
    }, 'ROI calculation completed successfully');
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/roi`);
  }
}
