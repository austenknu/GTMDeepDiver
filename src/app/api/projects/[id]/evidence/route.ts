/**
 * src/app/api/projects/[id]/evidence/route.ts: Evidence CRUD API endpoints
 * 
 * Handles creating, reading, updating evidence sources for projects
 * with proper validation, authorization, and background job queuing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { EvidenceCreate } from '@/lib/schemas';
import { handleApiError, createdResponse, successResponse } from '@/lib/errors';
import { requireProjectAccess } from '@/lib/auth';
import { auditLog, logApiAccess } from '@/lib/audit';
import { generateContentHash, isValidUrl } from '@/lib/utils';
import { addEvidenceFetchJob } from '@/lib/queue';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/projects/[id]/evidence - List project evidence
 * Returns paginated list of evidence sources for the project
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'read');
    await logApiAccess(request, userId, `/api/projects/${params.id}/evidence`, 'GET', params.id);

    // Parse pagination parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Get evidence with signals
    const [evidence, total] = await Promise.all([
      prisma.evidence.findMany({
        where: { projectId: params.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          signals: {
            orderBy: { confidence: 'desc' },
          },
          _count: {
            select: { signals: true },
          },
        },
      }),
      prisma.evidence.count({
        where: { projectId: params.id },
      }),
    ]);

    console.log(`src/app/api/projects/[id]/evidence/route.ts: Retrieved ${evidence.length} evidence items for project ${params.id}`);

    return successResponse({
      evidence,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/evidence`);
  }
}

/**
 * POST /api/projects/[id]/evidence - Create new evidence
 * Creates new evidence source and queues background processing if URL
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requireProjectAccess(userId, params.id, 'write');
    await logApiAccess(request, userId, `/api/projects/${params.id}/evidence`, 'POST', params.id);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = EvidenceCreate.parse({
      ...body,
      projectId: params.id,
    });

    // Generate content hash for deduplication
    const contentForHash = validatedData.url || validatedData.title;
    const contentHash = generateContentHash(contentForHash);

    // Check for duplicate evidence
    const existingEvidence = await prisma.evidence.findFirst({
      where: {
        projectId: params.id,
        contentHash,
      },
    });

    if (existingEvidence) {
      return NextResponse.json(
        {
          type: 'about:blank',
          title: 'Duplicate Evidence',
          status: 409,
          detail: 'Evidence with similar content already exists in this project',
        },
        { status: 409 }
      );
    }

    // Create evidence record
    const evidence = await prisma.evidence.create({
      data: {
        ...validatedData,
        contentHash,
        // Auto-approve notes, queue processing for URLs
        approved: validatedData.type === 'note',
      },
    });

    // Queue background processing for URL evidence
    if (validatedData.type === 'url' && validatedData.url && isValidUrl(validatedData.url)) {
      await addEvidenceFetchJob({
        evidenceId: evidence.id,
        url: validatedData.url,
        projectId: params.id,
      });
      
      console.log(`src/app/api/projects/[id]/evidence/route.ts: Queued fetch job for evidence ${evidence.id}`);
    }

    // Log evidence creation
    await auditLog(
      userId,
      'CREATE_EVIDENCE',
      `Added ${validatedData.type} evidence: ${validatedData.title}`,
      params.id
    );

    console.log(`src/app/api/projects/[id]/evidence/route.ts: Created evidence ${evidence.id} for project ${params.id}`);

    return createdResponse(evidence, 'Evidence created successfully');
  } catch (error) {
    return handleApiError(error, `/api/projects/${params.id}/evidence`);
  }
}
