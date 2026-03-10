import { getPrismaClient } from '../../db/prismaClient';
import { logger } from '../../lib/logger';

const prisma = getPrismaClient();

export class CustomerService {
  /**
   * Find or create a customer by phone number.
   */
  async getOrCreateByPhone(phone: string) {
    try {
      const existing = await prisma.customer.findUnique({ where: { phone } });
      if (existing) return existing;

      return await prisma.customer.create({
        data: { phone }
      });
    } catch (err) {
      logger.error({ err, phone }, 'Failed to get or create customer');
      throw err;
    }
  }

  async updateCustomer(
    id: string,
    data: {
      name?: string | null;
      cibilScore?: number | null;
      monthlyIncome?: number | null;
      employmentType?: string | null;
      existingLoans?: unknown;
    }
  ) {
    try {
      return await prisma.customer.update({
        where: { id },
        data
      });
    } catch (err) {
      logger.error({ err, id, data }, 'Failed to update customer');
      throw err;
    }
  }

  async getByPhone(phone: string) {
    try {
      return await prisma.customer.findUnique({ where: { phone } });
    } catch (err) {
      logger.error({ err, phone }, 'Failed to fetch customer by phone');
      throw err;
    }
  }
}

