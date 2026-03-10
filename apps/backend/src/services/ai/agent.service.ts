import OpenAI from 'openai';
import { logger } from '../../lib/logger';
import { PromptService } from './prompt.service';
import { checkEligibility, type CheckEligibilityArgs } from '../../agents/tools/check_eligibility';
import { fetchCustomer, type FetchCustomerArgs } from '../../agents/tools/fetch_customer';
import { calculateEmi, type CalculateEmiArgs } from '../../agents/tools/calculate_emi';
import { scheduleCallback, type ScheduleCallbackArgs } from '../../agents/tools/schedule_callback';
import { escalateToHuman, type EscalateHumanArgs } from '../../agents/tools/escalate_human';
import type { CustomerContext } from '../../agents/system-prompt';

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface AgentConfig {
  model: string;
}

export class AgentService {
  private readonly client: OpenAI;
  private readonly promptService: PromptService;
  private readonly model: string;

  constructor(config?: AgentConfig) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.promptService = new PromptService();
    this.model = config?.model ?? 'gpt-4o';
  }

  /**
   * Run a single-turn agent response with tool support (non-streaming).
   * The voice layer can stream this text back via TTS.
   */
  async respond(params: {
    customer: CustomerContext;
    messages: AgentMessage[];
    phone: string;
    callId: string;
  }): Promise<AgentMessage> {
    const systemPrompt = this.promptService.buildSystemMessage({ customer: params.customer });

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'check_eligibility',
          description: 'Assess loan eligibility based on CIBIL, income, loan type, and obligations.',
          parameters: {
            type: 'object',
            properties: {
              cibil: { type: 'number' },
              income: { type: 'number' },
              loanType: { type: 'string', enum: ['home', 'lap', 'personal'] },
              amount: { type: 'number' },
              existingEMI: { type: 'number' }
            },
            required: ['cibil', 'income', 'loanType', 'amount', 'existingEMI']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_customer_profile',
          description: 'Fetch the customer profile by phone number.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' }
            },
            required: ['phone']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'calculate_emi',
          description: 'Calculate the EMI for a loan.',
          parameters: {
            type: 'object',
            properties: {
              principal: { type: 'number' },
              rate: { type: 'number' },
              tenureMonths: { type: 'number' }
            },
            required: ['principal', 'rate', 'tenureMonths']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'schedule_callback',
          description: 'Schedule a callback with a human advisor.',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              datetime: { type: 'string' }
            },
            required: ['phone', 'datetime']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'escalate_to_human',
          description: 'Escalate the current call to a human agent.',
          parameters: {
            type: 'object',
            properties: {
              callId: { type: 'string' },
              reason: { type: 'string' }
            },
            required: ['callId', 'reason']
          }
        }
      }
    ];

    const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...params.messages
    ];

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        tools,
        tool_choice: 'auto'
      });

      const message = completion.choices[0]?.message;
      if (!message) {
        throw new Error('No message from OpenAI');
      }

      if (message.tool_calls && message.tool_calls.length > 0) {
        // Handle only first tool call for simplicity.
        const toolCall = message.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments ?? '{}');

        let toolResult: unknown;

        switch (toolCall.function.name) {
          case 'check_eligibility':
            toolResult = checkEligibility(args as CheckEligibilityArgs);
            break;
          case 'fetch_customer_profile':
            toolResult = await fetchCustomer(args as FetchCustomerArgs);
            break;
          case 'calculate_emi':
            toolResult = calculateEmi(args as CalculateEmiArgs);
            break;
          case 'schedule_callback':
            toolResult = await scheduleCallback(args as ScheduleCallbackArgs);
            break;
          case 'escalate_to_human':
            toolResult = await escalateToHuman({
              ...(args as Omit<EscalateHumanArgs, 'callId'>),
              callId: params.callId
            });
            break;
          default:
            logger.warn({ toolName: toolCall.function.name }, 'Unknown tool called by model');
        }

        const followup = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            ...openaiMessages,
            {
              role: 'assistant',
              tool_calls: message.tool_calls
            } as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam,
            {
              role: 'tool',
              name: toolCall.function.name,
              content: JSON.stringify(toolResult ?? {})
            }
          ]
        });

        const finalMessage = followup.choices[0]?.message;
        if (!finalMessage || typeof finalMessage.content !== 'string') {
          throw new Error('No final message after tool call');
        }

        return {
          role: 'assistant',
          content: finalMessage.content
        };
      }

      return {
        role: 'assistant',
        content: typeof message.content === 'string' ? message.content : ''
      };
    } catch (err) {
      logger.error({ err }, 'Agent respond() failed');
      throw err;
    }
  }
}

