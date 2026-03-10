import type { FastifyInstance } from 'fastify';
import { logger } from '../lib/logger';
import { LiveKitVoiceSession } from '../services/voice/livekit.service';
import { SttService } from '../services/voice/stt.service';
import { TtsService } from '../services/voice/tts.service';

export async function registerCallRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/calls/inbound', async (request, reply) => {
    try {
      const body = request.body as { phone: string; callId?: string } | undefined;
      const phone = body?.phone ?? 'unknown';

      const livekitUrl = process.env.LIVEKIT_URL;
      const livekitApiKey = process.env.LIVEKIT_API_KEY;
      const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

      if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
        logger.error('LiveKit env vars are not configured');
        return reply.status(500).send({ error: 'LiveKit not configured' });
      }

      const stt = new SttService(process.env.DEEPGRAМ_API_KEY || process.env.DEEPGRAM_API_KEY);
      const tts = new TtsService(process.env.ELEVENLABS_API_KEY);

      const session = new LiveKitVoiceSession(
        {
          url: livekitUrl,
          apiKey: livekitApiKey,
          apiSecret: livekitApiSecret
        },
        stt,
        tts
      );

      const roomName = `call-${Date.now()}`;
      const identity = phone;

      const token = session.generateAccessToken(roomName, identity);

      // Fire-and-forget echo session for now
      void session.startEchoSession({ customerPhone: phone });

      return reply.send({
        roomName,
        identity,
        accessToken: token
      });
    } catch (err) {
      logger.error({ err }, 'Failed to handle inbound call');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

