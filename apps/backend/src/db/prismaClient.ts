import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';

let prisma: PrismaClient | null = null;

export const getPrismaClient = (): PrismaClient => {
  if (prisma) return prisma;

  prisma = new PrismaClient();

  prisma.$on('error', (e) => {
    logger.error({ e }, 'Prisma client error');
  });

  return prisma;
};

