import { buildSystemPrompt, type CustomerContext } from '../../agents/system-prompt';

export interface PromptContext {
  customer: CustomerContext;
}

export class PromptService {
  buildSystemMessage(ctx: PromptContext): string {
    return buildSystemPrompt(ctx.customer);
  }
}

