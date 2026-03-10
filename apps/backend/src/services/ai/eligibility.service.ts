import { logger } from '../../lib/logger';

export type LoanType = 'home' | 'lap' | 'personal';

export interface EligibilityInput {
  cibil: number;
  income: number;
  existingEmi: number;
  loanType: LoanType;
  amount: number;
}

export interface EligibilityResult {
  eligible: boolean;
  riskBand: 'high' | 'medium' | 'low';
  reasons: string[];
  suggestedNextSteps: string[];
}

/**
 * Deterministic eligibility logic the LLM can call into.
 */
export class EligibilityService {
  /**
   * Assess loan eligibility based on CIBIL, income, FOIR and amount.
   */
  assess(input: EligibilityInput): EligibilityResult {
    try {
      const reasons: string[] = [];
      const suggestedNextSteps: string[] = [];

      const foir = input.income > 0 ? (input.existingEmi + this.estimateEmi(input)) / input.income : 1;

      if (input.cibil < 550) {
        reasons.push('CIBIL score below 550 is too risky for lending at this time.');
        suggestedNextSteps.push(
          'Pay existing EMIs on time for at least 6–12 months.',
          'Reduce unsecured credit usage and avoid new credit cards.',
          'Check CIBIL report for errors and dispute if needed.'
        );
        return {
          eligible: false,
          riskBand: 'high',
          reasons,
          suggestedNextSteps
        };
      }

      if (input.cibil < 650) {
        reasons.push('CIBIL score between 550 and 649 is considered high risk.');
      } else if (input.cibil < 750) {
        reasons.push('CIBIL score between 650 and 749 is moderate risk.');
      } else {
        reasons.push('Strong CIBIL score (750+).');
      }

      if (foir > 0.5) {
        reasons.push(`FOIR (fixed obligation to income ratio) is ${Math.round(foir * 100)}%, above the 50% guideline.`);
        suggestedNextSteps.push('Consider reducing existing EMIs or increasing declared income.');
      }

      let riskBand: EligibilityResult['riskBand'] = 'low';
      if (input.cibil < 650 || foir > 0.5) {
        riskBand = 'high';
      } else if (input.cibil < 750) {
        riskBand = 'medium';
      }

      const eligible = input.cibil >= 650 && foir <= 0.6;

      if (!eligible && suggestedNextSteps.length === 0) {
        suggestedNextSteps.push('Speak to a human advisor for tailored options.');
      }

      return {
        eligible,
        riskBand,
        reasons,
        suggestedNextSteps
      };
    } catch (err) {
      logger.error({ err, input }, 'Eligibility assessment failed');
      throw err;
    }
  }

  /**
   * Simple EMI estimation using a flat notional rate per loan type.
   */
  private estimateEmi(input: EligibilityInput): number {
    const defaultTenureMonths: Record<LoanType, number> = {
      home: 360,
      lap: 240,
      personal: 60
    };
    const defaultRate: Record<LoanType, number> = {
      home: 0.085,
      lap: 0.11,
      personal: 0.155
    };

    const tenureMonths = defaultTenureMonths[input.loanType];
    const annualRate = defaultRate[input.loanType];

    const r = annualRate / 12;
    const n = tenureMonths;
    const p = input.amount;

    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return emi || 0;
  }
}

