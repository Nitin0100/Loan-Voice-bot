import { logger } from '../../lib/logger';

export interface TtsStreamChunk {
  audio: Buffer;
}

export type TtsChunkCallback = (chunk: TtsStreamChunk) => void;

export interface TtsOptions {
  voiceId?: string;
  language?: string;
}

/**
 * Streaming TTS service abstraction.
 * Wire to ElevenLabs (or Cartesia) SDK in implementation.
 */
export class TtsService {
  private readonly apiKey: string;

  constructor(apiKey: string | undefined) {
    if (!apiKey) {
      logger.error('ELEVENLABS_API_KEY is not configured');
      throw new Error('ELEVENLABS_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Stream synthesized speech for the given text.
   * Current implementation is a placeholder that should be replaced
   * with ElevenLabs streaming once the SDK is wired in.
   */
  async streamText(
    _text: string,
    _onChunk: TtsChunkCallback,
    _options?: TtsOptions
  ): Promise<void> {
    try {
      // TODO: Integrate ElevenLabs streaming API here.
      logger.warn('TTS streaming is not yet implemented. Echo bot will be silent.');
    } catch (err) {
      logger.error({ err }, 'TTS stream failed');
      throw err;
    }
  }
}

