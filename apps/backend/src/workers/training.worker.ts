import { Worker, QueueEvents, type Job } from 'bullmq';
import { getRedisClient } from '../lib/redis';
import { logger } from '../lib/logger';
import { FineTuneService } from '../services/ai/finetune.service';

const connection = getRedisClient();

interface TrainingJobData {
  minQuality?: number;
}

const queueName = 'training';

const fineTuneService = new FineTuneService();

const worker = new Worker<TrainingJobData>(
  queueName,
  async (job: Job<TrainingJobData>) => {
    const minQuality = job.data.minQuality ?? 0.8;
    const { calls } = await fineTuneService.prepareDataset(minQuality);

    if (!calls.length) {
      logger.info('No high-quality calls available for fine-tune dataset');
      return;
    }

    await fineTuneService.submitFineTuneJob(calls.length);
  },
  {
    connection
  }
);

const events = new QueueEvents(queueName, { connection });

events.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Training worker job failed');
});

logger.info('Training worker started');

