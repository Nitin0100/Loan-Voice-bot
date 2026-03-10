export interface CalculateEmiArgs {
  principal: number;
  /**
   * Annual interest rate as a percentage, e.g. 10.5 for 10.5%.
   */
  rate: number;
  /**
   * Tenure in months.
   */
  tenureMonths: number;
}

export interface CalculateEmiResult {
  emi: number;
  totalInterest: number;
  totalPayable: number;
}

export function calculateEmi(args: CalculateEmiArgs): CalculateEmiResult {
  const monthlyRate = args.rate / 12 / 100;
  const n = args.tenureMonths;
  const p = args.principal;

  if (monthlyRate <= 0 || n <= 0 || p <= 0) {
    return {
      emi: 0,
      totalInterest: 0,
      totalPayable: 0
    };
  }

  const factor = Math.pow(1 + monthlyRate, n);
  const emi = (p * monthlyRate * factor) / (factor - 1);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - p;

  return {
    emi,
    totalInterest,
    totalPayable
  };
}

