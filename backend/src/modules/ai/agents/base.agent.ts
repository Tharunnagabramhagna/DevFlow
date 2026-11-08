import { z } from 'zod';
import { AgentType } from '../ai.schema';
import { IAIProvider, AIProviderOptions } from '../providers/ai.provider.interface';
import { PromptSanitizer } from '../promptSanitizer';
import logger from '../../../utils/logger';

export interface AIAgentResult<TOutput> {
  agentType: AgentType;
  agentName: string;
  data: TOutput;
  modelName: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  rawResponse: string;
}

export abstract class BaseAIAgent<TInput, TOutput> {
  abstract readonly agentType: AgentType;
  abstract readonly name: string;
  abstract readonly description: string;

  protected abstract buildSystemInstruction(): string;
  protected abstract buildPrompt(input: TInput): string;
  protected abstract getOutputSchema(): z.ZodSchema<TOutput>;

  /**
   * Executes the agent against the provided AI Provider with guardrails and telemetry.
   */
  async run(
    input: TInput,
    provider: IAIProvider,
    options?: AIProviderOptions
  ): Promise<AIAgentResult<TOutput>> {
    const startTime = Date.now();
    logger.info(`Executing AI Agent [${this.agentType}] via provider [${provider.name}]`);

    // Build system instruction and append security directives
    const baseSystem = this.buildSystemInstruction();
    const securityPreamble = PromptSanitizer.getSystemSecurityInstructions();
    const completeSystemInstruction = `${baseSystem}\n\n${securityPreamble}`;

    // Build prompt and sanitize
    const prompt = this.buildPrompt(input);
    const schema = this.getOutputSchema();

    try {
      const response = await provider.generateStructured(
        prompt,
        completeSystemInstruction,
        schema,
        options
      );

      const latencyMs = Date.now() - startTime;
      logger.info(`Agent [${this.agentType}] completed in ${latencyMs}ms`);

      return {
        agentType: this.agentType,
        agentName: this.name,
        data: response.data,
        modelName: response.modelName,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        latencyMs,
        rawResponse: response.rawResponse,
      };
    } catch (err: any) {
      logger.error(`Agent [${this.agentType}] execution failed`, { error: err.message });
      throw err;
    }
  }
}

