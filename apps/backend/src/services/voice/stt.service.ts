import { Deepgram } from '@deepgram/sdk';
import { logger } from '../../lib/logger';

export interface SttStreamOptions {
  /**
   * Language hint, e.g. "en-IN".
   */
  language?: string;
  /**
   * Enable interim results for barge-in detection.
   */
  interimResults?: boolean;
}

export interface SttTranscript {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export type SttCallback = (transcript: SttTranscript) => void;

/**
 * Streaming STT service using Deepgram Nova-2.
 * All methods are defensive with logging and error propagation.
 */
export class SttService {
  private readonly client: Deepgram;

  constructor(apiKey: string | undefined) {
    if (!apiKey) {
      logger.error('DEEPGRAM_API_KEY is not configured');
      throw new Error('DEEPGRAM_API_KEY is required');
    }
    this.client = new Deepgram(apiKey);
  }

  /**
   * Create a new streaming STT session.
   * The caller is responsible for piping binary audio into `sendAudio`
   * and closing the stream via `close`.
   */
  createStream(callback: SttCallback, options?: SttStreamOptions) {
    const dgOptions = {
      model: 'nova-2',
      language: options?.language ?? 'en-IN',
      interim_results: options?.interimResults ?? true,
      smart_format: true,
      vad_events: true
    } as const;

    const connection = this.client.listen.live(dgOptions);

    connection.on('open', () => {
      logger.info({ options: dgOptions }, 'Deepgram streaming connection opened');
    });

    connection.on('error', (err: unknown) => {
      logger.error({ err }, 'Deepgram streaming error');
    });

    connection.on('close', () => {
      logger.info('Deepgram streaming connection closed');
    });

    connection.on('transcriptReceived', (message: unknown) => {
      try {
        const dgMessage = message as {
          channel?: {
            alternatives?: Array<{ transcript?: string }>;
          };
          is_final?: boolean;
          metadata?: { created?: string };
        };

        const text = dgMessage.channel?.alternatives?.[0]?.transcript ?? '';
        if (!text) {
          return;
        }

        const isFinal = Boolean(dgMessage.is_final);
        const timestamp = dgMessage.metadata?.created
          ? Date.parse(dgMessage.metadata.created)
          : Date.now();

        callback({ text, isFinal, timestamp });
      } catch (err) {
        logger.error({ err, message }, 'Failed to process Deepgram transcript');
      }
    });

    return {
      /**
       * Send raw audio bytes (16-bit PCM, 16kHz mono recommended).
       */
      sendAudio: (chunk: Buffer) => {
        try {
          connection.send(chunk);
        } catch (err) {
          logger.error({ err }, 'Failed to send audio to Deepgram');
        }
      },
      /**
       * Close the underlying streaming connection.
       */
      close: () => {
        try {
          connection.close();
        } catch (err) {
          logger.error({ err }, 'Failed to close Deepgram connection');
        }
      }
    };
  }
}

