import Fastify from 'fastify';
import websocketPlugin from '@fastify/websocket';
import cors from '@fastify/cors';
import { logger } from './lib/logger';
import { registerCallRoutes } from './routes/calls';

const buildServer = () => {
  const app = Fastify({
    logger
  });

  app.register(cors, {
    origin: true
  });

  app.register(websocketPlugin);

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  app.register(async (instance) => {
    await registerCallRoutes(instance);
  });

  return app;
};

const start = async () => {
  const app = buildServer();

  try {
    const port = Number(process.env.PORT) || 4000;
    await app.listen({ port, host: '0.0.0.0' });
    logger.info({ port }, 'Backend server started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

void start();

export type AppServer = ReturnType<typeof buildServer>;
