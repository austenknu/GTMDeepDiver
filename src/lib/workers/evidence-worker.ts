/**
 * src/lib/workers/evidence-worker.ts: Background worker for evidence fetching
 * 
 * Processes evidence fetching jobs to retrieve content from URLs,
 * extract metadata, and prepare content for NLP summarization.
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '../db';
import { generateContentHash } from '../utils';
import { addNlpSummarizeJob, EvidenceFetchJob } from '../queue';
import IORedis from 'ioredis';

// Redis connection for worker
const connection = new IORedis({
  host: process.env.UPSTASH_REDIS_HOST,
  port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
  password: process.env.UPSTASH_REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

/**
 * Fetch content from URL with proper headers and error handling
 * @param url - URL to fetch
 * @returns Fetched content and metadata
 */
async function fetchUrlContent(url: string) {
  console.log(`src/lib/workers/evidence-worker.ts: Fetching content from ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GTM-Deep-Diver/1.0 (+https://gtm-deep-diver.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const content = await response.text();
  const contentType = response.headers.get('content-type') || '';
  
  // Extract basic metadata from HTML
  let title = '';
  let author = '';
  let publishedAt: Date | null = null;

  if (contentType.includes('text/html')) {
    // Extract title
    const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    // Extract author (various meta tag formats)
    const authorMatch = content.match(/<meta[^>]*(?:name|property)=["'](?:author|article:author)["'][^>]*content=["']([^"']+)["']/i);
    author = authorMatch ? authorMatch[1].trim() : '';

    // Extract published date
    const dateMatch = content.match(/<meta[^>]*(?:name|property)=["'](?:article:published_time|date|pubdate)["'][^>]*content=["']([^"']+)["']/i);
    if (dateMatch) {
      const parsedDate = new Date(dateMatch[1]);
      if (!isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate;
      }
    }
  }

  // Generate snippet (first 500 chars of text content)
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const snippet = textContent.substring(0, 500);

  return {
    content,
    title: title || new URL(url).hostname,
    author,
    publishedAt,
    snippet,
    contentHash: generateContentHash(content),
  };
}

/**
 * Process evidence fetching job
 * @param job - BullMQ job containing evidence fetch data
 */
async function processEvidenceFetch(job: Job<EvidenceFetchJob>) {
  const { evidenceId, url, projectId } = job.data;
  
  console.log(`src/lib/workers/evidence-worker.ts: Processing evidence fetch job for ${evidenceId}`);

  try {
    // Fetch content from URL
    const fetchResult = await fetchUrlContent(url);

    // Update evidence record with fetched metadata
    await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        title: fetchResult.title,
        author: fetchResult.author || undefined,
        publishedAt: fetchResult.publishedAt,
        snippet: fetchResult.snippet,
        contentHash: fetchResult.contentHash,
        approved: true, // Auto-approve URL content (files need separate scanning)
        updatedAt: new Date(),
      },
    });

    console.log(`src/lib/workers/evidence-worker.ts: Updated evidence ${evidenceId} with fetched metadata`);

    // Queue NLP summarization if content is substantial
    if (fetchResult.content.length > 500) {
      await addNlpSummarizeJob({
        evidenceId,
        content: fetchResult.content,
        projectId,
      });
    }

    return { success: true, evidenceId, title: fetchResult.title };
  } catch (error) {
    console.error(`src/lib/workers/evidence-worker.ts: Evidence fetch failed for ${evidenceId}:`, error);
    
    // Update evidence with error status
    await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        snippet: `Failed to fetch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        updatedAt: new Date(),
      },
    });

    throw error; // Re-throw for BullMQ retry logic
  }
}

// Create and export the worker
export const evidenceWorker = new Worker('evidence-processing', processEvidenceFetch, {
  connection,
  concurrency: 5, // Process up to 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs per duration
    duration: 60000, // 1 minute
  },
});

// Worker event handlers
evidenceWorker.on('completed', (job: Job) => {
  console.log(`src/lib/workers/evidence-worker.ts: Job ${job.id} completed successfully`);
});

evidenceWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`src/lib/workers/evidence-worker.ts: Job ${job?.id} failed:`, err);
});

evidenceWorker.on('error', (err: Error) => {
  console.error('src/lib/workers/evidence-worker.ts: Worker error:', err);
});
