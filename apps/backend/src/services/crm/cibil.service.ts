import { logger } from '../../lib/logger';

export interface CibilResult {
  score: number;
  raw?: unknown;
}

export class CibilService {
  private readonly apiKey: string | undefined;

  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch CIBIL score for a customer.
   * In development, this returns a mocked score when API key is missing.
   */
  async fetchScoreByPhone(phone: string): Promise<CibilResult> {
    try {
      if (!this.apiKey) {
        // Dev-mode mock
        const hash = Math.abs(
          Array.from(phone)
            .map((c) => c.charCodeAt(0))
            .reduce((a, b) => a + b, 0)
        );
        const score = 550 + (hash % 300); // 550–849

        logger.warn(
          { phone, score },
          'CIBIL_API_KEY missing; returning mocked CIBIL score (dev only)'
        );

        return { score };
      }

      // TODO: Implement real TransUnion CIBIL API integration using this.apiKey.
      logger.warn(
        { phone },
        'CIBIL API integration not yet implemented; returning placeholder score'
      );

      return { score: 700 };
    } catch (err) {
      logger.error({ err, phone }, 'Failed to fetch CIBIL score');
      throw err;
    }
  }
}

