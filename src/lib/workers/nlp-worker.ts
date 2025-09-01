/**
 * src/lib/workers/nlp-worker.ts: Background worker for NLP processing
 * 
 * Processes content summarization and signal extraction using OpenAI API
 * with proper rate limiting and error handling.
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '../db';
import { NlpSummarizeJob } from '../queue';
import IORedis from 'ioredis';

// Redis connection for worker
const connection = new IORedis({
  host: process.env.UPSTASH_REDIS_HOST,
  port: parseInt(process.env.UPSTASH_REDIS_PORT || '6379'),
  password: process.env.UPSTASH_REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
});

/**
 * Summarize content using OpenAI API
 * @param content - Raw content to summarize
 * @returns Summary and extracted signals
 */
async function summarizeContent(content: string) {
  console.log('src/lib/workers/nlp-worker.ts: Starting content summarization');

  // Remove HTML tags and clean content
  const cleanContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000); // Limit to ~8k chars for API efficiency

  // Prepare prompt for OpenAI API
  // const prompt = `
Analyze this business content and extract key signals. Focus on:
1. Business challenges and pain points
2. Technology initiatives and priorities  
3. Financial metrics and growth indicators
4. Security, compliance, and risk factors
5. Hiring patterns and organizational changes

Content:
${cleanContent}

Provide a structured response with:
- Summary (2-3 sentences)
- Key signals (3-5 bullet points with confidence scores 0-1)
- Signal categories: industry, company, security, hiring, product, financial, compliance

Format as JSON:
{
  "summary": "...",
  "signals": [
    {
      "kind": "company",
      "text": "...",
      "confidence": 0.8,
      "weight": 0.7
    }
  ]
}
`;

  try {
    // Mock OpenAI API call for now (replace with actual implementation)
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-4',
    //     messages: [{ role: 'user', content: prompt }],
    //     max_tokens: 1000,
    //     temperature: 0.3,
    //   }),
    // });

    // For now, return mock data structure
    const mockResult = {
      summary: 'Content analysis completed. Key business signals extracted and categorized.',
      signals: [
        {
          kind: 'company' as const,
          text: 'Organization shows signs of digital transformation initiatives',
          confidence: 0.7,
          weight: 0.6,
        },
        {
          kind: 'security' as const,
          text: 'Security compliance requirements mentioned in content',
          confidence: 0.6,
          weight: 0.5,
        },
      ],
    };

    console.log(`src/lib/workers/nlp-worker.ts: Summarization completed with ${mockResult.signals.length} signals`);
    return mockResult;
  } catch (error) {
    console.error('src/lib/workers/nlp-worker.ts: OpenAI API call failed:', error);
    throw error;
  }
}

/**
 * Process NLP summarization job
 * @param job - BullMQ job containing NLP processing data
 */
async function processNlpSummarization(job: Job<NlpSummarizeJob>) {
  const { evidenceId, content } = job.data;
  
  console.log(`src/lib/workers/nlp-worker.ts: Processing NLP job for evidence ${evidenceId}`);

  try {
    // Summarize content and extract signals
    const result = await summarizeContent(content);

    // Create signals in database
    const signals = await Promise.all(
      result.signals.map(signal =>
        prisma.signal.create({
          data: {
            evidenceId,
            kind: signal.kind,
            text: signal.text,
            confidence: signal.confidence,
            weight: signal.weight,
          },
        })
      )
    );

    console.log(`src/lib/workers/nlp-worker.ts: Created ${signals.length} signals for evidence ${evidenceId}`);

    return { 
      success: true, 
      evidenceId, 
      signalsCreated: signals.length,
      summary: result.summary,
    };
  } catch (error) {
    console.error(`src/lib/workers/nlp-worker.ts: NLP processing failed for ${evidenceId}:`, error);
    throw error;
  }
}

// Create and export the worker
export const nlpWorker = new Worker('nlp-processing', processNlpSummarization, {
  connection,
  concurrency: 2, // Limit concurrent OpenAI API calls
  limiter: {
    max: 5, // Max 5 API calls per minute to respect rate limits
    duration: 60000,
  },
});

// Worker event handlers
nlpWorker.on('completed', (job: Job) => {
  console.log(`src/lib/workers/nlp-worker.ts: NLP job ${job.id} completed successfully`);
});

nlpWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`src/lib/workers/nlp-worker.ts: NLP job ${job?.id} failed:`, err);
});

nlpWorker.on('error', (err: Error) => {
  console.error('src/lib/workers/nlp-worker.ts: Worker error:', err);
});
