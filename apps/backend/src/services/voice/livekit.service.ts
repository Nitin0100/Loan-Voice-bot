import { AccessToken } from 'livekit-server-sdk';
import WebSocket from 'ws';
import { SttService, SttTranscript } from './stt.service';
import { TtsService } from './tts.service';
import { logger } from '../../lib/logger';

export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

export interface VoiceSessionOptions {
  customerPhone?: string;
}

/**
 * Simple echo-bot session:
 * - Receives audio from LiveKit (via WebSocket SFU audio stream)
 * - Sends it to Deepgram STT
 * - Echoes recognized text back via TTS (placeholder for now)
 */
export class LiveKitVoiceSession {
  private readonly livekitConfig: LiveKitConfig;
  private readonly sttService: SttService;
  private readonly ttsService: TtsService;

  private ws?: WebSocket;

  constructor(livekitConfig: LiveKitConfig, sttService: SttService, ttsService: TtsService) {
    this.livekitConfig = livekitConfig;
    this.sttService = sttService;
    this.ttsService = ttsService;
  }

  /**
   * Generate an access token for a participant to join a room.
   * This token is typically provided to the telephony bridge or web client.
   */
  generateAccessToken(roomName: string, identity: string): string {
    try {
      const at = new AccessToken(this.livekitConfig.apiKey, this.livekitConfig.apiSecret, {
        identity
      });
      at.addGrant({ roomJoin: true, room: roomName });
      return at.toJwt();
    } catch (err) {
      logger.error({ err, roomName, identity }, 'Failed to generate LiveKit access token');
      throw err;
    }
  }

  /**
   * Start a server-side audio session with LiveKit.
   * In a full implementation, this would attach to an SFU audio track.
   */
  async startEchoSession(options?: VoiceSessionOptions): Promise<void> {
    const { url } = this.livekitConfig;

    logger.info({ url, options }, 'Starting LiveKit echo session');

    const sttStream = this.sttService.createStream(this.handleTranscript.bind(this), {
      interimResults: true,
      language: 'en-IN'
    });

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        logger.info('Connected to LiveKit WebSocket (placeholder echo session)');
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        // Audio received from LiveKit; forward to Deepgram
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        sttStream.sendAudio(buffer);
      });

      this.ws.on('error', (err) => {
        logger.error({ err }, 'LiveKit WebSocket error');
      });

      this.ws.on('close', (code, reason) => {
        logger.info({ code, reason: reason.toString() }, 'LiveKit WebSocket closed');
        sttStream.close();
      });
    } catch (err) {
      logger.error({ err }, 'Failed to start LiveKit echo session');
      sttStream.close();
      throw err;
    }
  }

  private async handleTranscript(transcript: SttTranscript): Promise<void> {
    // Basic barge-in friendly behavior: only respond on final transcripts.
    if (!transcript.isFinal || !transcript.text.trim()) {
      return;
    }

    const text = transcript.text.trim();
    logger.info({ text }, 'User said (echo bot)');

    const reply = `You said: ${text}`;

    try {
      await this.ttsService.streamText(reply, async (chunk) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }
        this.ws.send(chunk.audio);
      });
    } catch (err) {
      logger.error({ err }, 'Failed to stream TTS back to LiveKit');
    }
  }
}

