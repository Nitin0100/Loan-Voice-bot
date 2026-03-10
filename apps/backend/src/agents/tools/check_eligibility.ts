import { EligibilityService, type LoanType } from '../../services/ai/eligibility.service';

export interface CheckEligibilityArgs {
  cibil: number;
  income: number;
  loanType: LoanType;
  amount: number;
  existingEMI: number;
}

const eligibilityService = new EligibilityService();

export const checkEligibility = (args: CheckEligibilityArgs) => {
  return eligibilityService.assess({
    cibil: args.cibil,
    income: args.income,
    existingEmi: args.existingEMI,
    loanType: args.loanType,
    amount: args.amount
  });
};

