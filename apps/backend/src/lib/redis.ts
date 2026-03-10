import { createClient, type RedisClientType } from 'redis';
import { logger } from './logger';

let client: RedisClientType | null = null;

export const getRedisClient = (): RedisClientType => {
  if (client) {
    return client;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    logger.error('REDIS_URL is not configured');
    throw new Error('REDIS_URL is required');
  }

  client = createClient({ url });

  client.on('error', (err) => {
    logger.error({ err }, 'Redis client error');
  });

  void client.connect();

  return client;
};

