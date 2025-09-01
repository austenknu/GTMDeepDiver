/**
 * src/app/api/projects/[id]/export/route.ts: Project export API endpoint
 * 
 * Generates comprehensive Markdown and JSON exports of project analysis
 * with complete source traceability and ROI calculations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { handleApiError, successResponse } from '@/lib/errors';
import { requireProjectAccess } from '@/lib/auth';
import { auditLog, logApiAccess } from '@/lib/audit';
import { generateMarkdownExport, generateJsonExport } from '@/lib/export-generator';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/projects/[id]/export - Generate project export
 * Creates comprehensive Markdown and JSON exports of project analysis
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'read');
    await logApiAccess(request, userId, `/api/projects/${params.id}/export`, 'POST', params.id);

    console.log(`src/app/api/projects/[id]/export/route.ts: Starting export generation for project ${params.id}`);

    // Fetch complete project data for export
    const [project, evidence, pains, stakeholders, outreachAssets, roiCalculation] = await Promise.all([
      prisma.project.findUnique({
        where: { id: params.id },
      }),
      prisma.evidence.findMany({
        where: { projectId: params.id },
        include: {
          signals: {
            orderBy: { confidence: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pain.findMany({
        where: { projectId: params.id },
        orderBy: { confidence: 'desc' },
      }),
      prisma.stakeholder.findMany({
        where: { projectId: params.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.outreachAsset.findMany({
        where: { projectId: params.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.roiCalculation.findFirst({
        where: { projectId: params.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!project) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Not Found',
          status: 404,
          detail: 'Project not found',
        },
        { status: 404 }
      );
    }

    // Parse ROI output if available
    let roiOutput;
    if (roiCalculation) {
      roiOutput = {
        low: JSON.parse(roiCalculation.lowScenario),
        mostLikely: JSON.parse(roiCalculation.mostLikelyScenario),
        high: JSON.parse(roiCalculation.highScenario),
      };
    }

    // Parse stakeholder JSON fields
    const stakeholdersWithParsedData = stakeholders.map(stakeholder => ({
      ...stakeholder,
      goals: JSON.parse(stakeholder.goals),
      objections: JSON.parse(stakeholder.objections),
      proofPoints: JSON.parse(stakeholder.proofPoints),
    }));

    // Parse outreach asset JSON fields
    const outreachWithParsedData = outreachAssets.map(asset => ({
      ...asset,
      assumptions: JSON.parse(asset.assumptions),
      sources: JSON.parse(asset.sources),
    }));

    // Prepare export data
    const exportData = {
      project: {
        ...project,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
      },
      evidence: evidence.map(item => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        publishedAt: item.publishedAt?.toISOString(),
      })),
      pains: pains.map(pain => ({
        ...pain,
        createdAt: pain.createdAt.toISOString(),
        updatedAt: pain.updatedAt.toISOString(),
      })),
      stakeholders: stakeholdersWithParsedData.map(stakeholder => ({
        ...stakeholder,
        createdAt: stakeholder.createdAt.toISOString(),
        updatedAt: stakeholder.updatedAt.toISOString(),
      })),
      outreachAssets: outreachWithParsedData.map(asset => ({
        ...asset,
        createdAt: asset.createdAt.toISOString(),
        updatedAt: asset.updatedAt.toISOString(),
      })),
      roiOutput,
    };

    // Generate exports
    const markdownExport = generateMarkdownExport(exportData);
    const jsonExport = generateJsonExport(exportData);

    // Store export in database
    const projectExport = await prisma.projectExport.create({
      data: {
        projectId: params.id,
        markdownData: markdownExport,
        jsonData: JSON.stringify(jsonExport, null, 2),
      },
    });

    // Update project status to READY if not already
    if (project.status !== 'READY') {
      await prisma.project.update({
        where: { id: params.id },
        data: { status: 'READY' },
      });
      console.log(`src/app/api/projects/[id]/export/route.ts: Advanced project ${params.id} to READY status`);
    }

    // Log export generation
    await auditLog(
      userId,
      'GENERATE_EXPORT',
      `Generated complete project export (${markdownExport.length} chars markdown, ${JSON.stringify(jsonExport).length} chars JSON)`,
      params.id
    );

    console.log(`src/app/api/projects/[id]/export/route.ts: Export generation completed for project ${params.id}`);

    return successResponse({
      exportId: projectExport.id,
      markdown: markdownExport,
      json: jsonExport,
      stats: {
        evidenceCount: evidence.length,
        painPointCount: pains.length,
        stakeholderCount: stakeholders.length,
        outreachAssetCount: outreachAssets.length,
        completeness: jsonExport.summary.researchCompleteness,
      },
    }, 'Export generated successfully');
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/export`);
  }
}
