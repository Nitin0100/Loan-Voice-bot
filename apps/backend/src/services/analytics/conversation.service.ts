import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../lib/logger';

const prisma = getPrismaClient();

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
}

export class ConversationAnalyticsService {
  async saveCallTranscript(params: {
    callId: string;
    messages: ConversationMessage[];
    outcome?: string;
    durationSeconds?: number;
    usedForTraining?: boolean;
  }) {
    try {
      await prisma.call.update({
        where: { id: params.callId },
        data: {
          transcript: params.messages,
          outcome: params.outcome,
          duration: params.durationSeconds,
          usedForTraining: params.usedForTraining ?? false,
          endedAt: new Date()
        }
      });
    } catch (err) {
      logger.error({ err, params }, 'Failed to save call transcript');
      throw err;
    }
  }
}

