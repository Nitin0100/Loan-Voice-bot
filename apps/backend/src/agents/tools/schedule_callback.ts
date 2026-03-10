import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../lib/logger';

const prisma = getPrismaClient();

export interface ScheduleCallbackArgs {
  phone: string;
  datetime: string;
}

export const scheduleCallback = async (args: ScheduleCallbackArgs) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { phone: args.phone } });
    if (!customer) {
      throw new Error('Customer not found for callback scheduling');
    }

    const call = await prisma.call.create({
      data: {
        customerId: customer.id,
        outcome: 'callback'
      }
    });

    logger.info(
      { callId: call.id, customerId: customer.id, datetime: args.datetime },
      'Callback scheduled'
    );

    return { callId: call.id };
  } catch (err) {
    logger.error({ err, args }, 'Failed to schedule callback');
    throw err;
  }
};

