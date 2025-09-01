/**
 * src/lib/queue.ts: Background job queue setup with BullMQ
 * 
 * Configures job queues for evidence fetching, NLP processing,
 * and external API enrichment with proper error handling and retries.
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.UPSTASH_REDIS_HOST,
  port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
  password: process.env.UPSTASH_REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
});

// Job queue definitions
export const evidenceQueue = new Queue('evidence-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100,    // Keep last 100 failed jobs for debugging
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const nlpQueue = new Queue('nlp-processing', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Longer delay for AI API calls
    },
  },
});

export const enrichmentQueue = new Queue('data-enrichment', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 2, // Fewer retries for external APIs
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

// Job type definitions
export interface EvidenceFetchJob {
  evidenceId: string;
  url: string;
  projectId: string;
}

export interface NlpSummarizeJob {
  evidenceId: string;
  content: string;
  projectId: string;
}

export interface EnrichmentJob {
  projectId: string;
  companyDomain: string;
  enrichmentType: 'news' | 'crunchbase' | 'techstack' | 'sec_filings';
}

/**
 * Add evidence fetching job to queue
 * @param data - Evidence fetch job data
 * @param jobId - Optional job ID for idempotency
 */
export async function addEvidenceFetchJob(data: EvidenceFetchJob, jobId?: string) {
  console.log(`src/lib/queue.ts: Adding evidence fetch job for evidence ${data.evidenceId}`);
  
  return await evidenceQueue.add('fetch-evidence', data, {
    jobId: jobId || `fetch-${data.evidenceId}`, // Idempotent job IDs
    delay: 1000, // Small delay to allow DB transaction to complete
  });
}

/**
 * Add NLP summarization job to queue
 * @param data - NLP processing job data
 * @param jobId - Optional job ID for idempotency
 */
export async function addNlpSummarizeJob(data: NlpSummarizeJob, jobId?: string) {
  console.log(`src/lib/queue.ts: Adding NLP summarization job for evidence ${data.evidenceId}`);
  
  return await nlpQueue.add('summarize-content', data, {
    jobId: jobId || `nlp-${data.evidenceId}`,
    delay: 2000,
  });
}

/**
 * Add data enrichment job to queue
 * @param data - Enrichment job data
 * @param jobId - Optional job ID for idempotency
 */
export async function addEnrichmentJob(data: EnrichmentJob, jobId?: string) {
  console.log(`src/lib/queue.ts: Adding enrichment job for project ${data.projectId}, type: ${data.enrichmentType}`);
  
  return await enrichmentQueue.add('enrich-data', data, {
    jobId: jobId || `enrich-${data.projectId}-${data.enrichmentType}`,
    delay: 5000,
  });
}

/**
 * Get queue statistics for monitoring
 */
export async function getQueueStats() {
  const [evidenceStats, nlpStats, enrichmentStats] = await Promise.all([
    evidenceQueue.getJobCounts(),
    nlpQueue.getJobCounts(),
    enrichmentQueue.getJobCounts(),
  ]);

  return {
    evidence: evidenceStats,
    nlp: nlpStats,
    enrichment: enrichmentStats,
  };
}

/**
 * Clean up completed and failed jobs (maintenance function)
 */
export async function cleanupQueues() {
  console.log('src/lib/queue.ts: Starting queue cleanup');
  
  await Promise.all([
    evidenceQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'), // Clean completed jobs older than 24h
    evidenceQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'), // Clean failed jobs older than 7 days
    nlpQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'),
    nlpQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'),
    enrichmentQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'),
    enrichmentQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'),
  ]);

  console.log('src/lib/queue.ts: Queue cleanup completed');
}
