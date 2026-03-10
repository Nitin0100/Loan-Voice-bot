import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../lib/logger';

const prisma = getPrismaClient();

export interface EscalateHumanArgs {
  callId: string;
  reason: string;
}

export const escalateToHuman = async (args: EscalateHumanArgs) => {
  try {
    const updated = await prisma.call.update({
      where: { id: args.callId },
      data: {
        outcome: 'escalated'
      }
    });

    logger.info({ callId: args.callId, reason: args.reason }, 'Call escalated to human');

    return updated;
  } catch (err) {
    logger.error({ err, args }, 'Failed to escalate call to human');
    throw err;
  }
};

