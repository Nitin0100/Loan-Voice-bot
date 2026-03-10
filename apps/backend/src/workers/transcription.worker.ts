import { Worker, QueueEvents, type Job } from '@bullmq/core';
import { getRedisClient } from '../lib/redis';
import { getPrismaClient } from '../db/prismaClient';
import { logger } from '../lib/logger';
import { FineTuneService } from '../services/ai/finetune.service';

const prisma = getPrismaClient();
const connection = getRedisClient();

interface TranscriptionJobData {
  callId: string;
}

const queueName = 'transcription';

const fineTuneService = new FineTuneService();

const worker = new Worker<TranscriptionJobData>(
  queueName,
  async (job: Job<TranscriptionJobData>) => {
    const call = await prisma.call.findUnique({ where: { id: job.data.callId } });
    if (!call) {
      logger.warn({ callId: job.data.callId }, 'Call not found in transcription worker');
      return;
    }

    const judge = await fineTuneService.scoreConversation(call.transcript);

    await prisma.call.update({
      where: { id: call.id },
      data: {
        qualityScore: judge.qualityScore
      }
    });

    logger.info(
      { callId: call.id, score: judge.qualityScore, outcome: judge.outcome },
      'Call scored by LLM judge'
    );
  },
  {
    connection
  }
);

const events = new QueueEvents(queueName, { connection });

events.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Transcription worker job failed');
});

logger.info('Transcription worker started');

