import { z } from 'zod';

export interface AIProviderOptions {
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export interface AIProviderResponse<T> {
  data: T;
  modelName: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  rawResponse: string;
}

export interface IAIProvider {
  readonly name: string;
  generateStructured<T>(
    prompt: string,
    systemInstruction: string,
    schema: z.ZodSchema<T>,
    options?: AIProviderOptions
  ): Promise<AIProviderResponse<T>>;
}

