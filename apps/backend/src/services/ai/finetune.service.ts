import OpenAI from 'openai';
import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../lib/logger';

const prisma = getPrismaClient();

export interface JudgeResult {
  qualityScore: number;
  outcome: 'successful_conversion' | 'handled_objection' | 'poor_response' | 'other';
}

export class FineTuneService {
  private readonly client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Score a conversation with LLM-as-judge.
   */
  async scoreConversation(transcript: unknown[]): Promise<JudgeResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an evaluator that scores loan advisory phone conversations on a scale 0 to 1, and classify the outcome.'
          },
          {
            role: 'user',
            content: `Here is the transcript as JSON array of messages: ${JSON.stringify(
              transcript
            )}\n\nReturn a compact JSON with keys: qualityScore (0-1), outcome (successful_conversion | handled_objection | poor_response | other).`
          }
        ],
        response_format: { type: 'json_object' }
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new Error('Empty judge response');
      }

      const parsed = JSON.parse(raw) as JudgeResult;
      return parsed;
    } catch (err) {
      logger.error({ err }, 'Failed to score conversation with judge LLM');
      throw err;
    }
  }

  /**
   * Prepare fine-tune dataset from high-quality calls.
   */
  async prepareDataset(minQuality = 0.8, limit = 200) {
    const calls = await prisma.call.findMany({
      where: {
        qualityScore: { gte: minQuality },
        usedForTraining: false
      },
      take: limit
    });

    const data = calls.map((call) => ({
      messages: call.transcript
    }));

    return { calls, data };
  }

  /**
   * Submit a fine-tune job to OpenAI.
   * NOTE: This is a skeleton; in production, you would upload a file and pass the file ID.
   */
  async submitFineTuneJob(callCount: number) {
    const job = await prisma.fineTuneJob.create({
      data: {
        status: 'pending',
        callCount
      }
    });

    logger.info({ jobId: job.id }, 'Fine-tune job created (skeleton, no actual OpenAI job yet)');

    return job;
  }
}

