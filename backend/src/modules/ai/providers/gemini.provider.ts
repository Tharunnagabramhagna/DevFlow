import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { IAIProvider, AIProviderOptions, AIProviderResponse } from './ai.provider.interface';
import { PromptSanitizer } from '../promptSanitizer';
import { env } from '../../../config/env';
import { InternalServerError, BadRequestError } from '../../../utils/errors';
import logger from '../../../utils/logger';

export class GeminiProvider implements IAIProvider {
  readonly name = 'gemini-provider';
  private client: GoogleGenAI | null = null;
  private modelName: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || env.GEMINI_API_KEY;
    this.modelName = modelName || env.AI_MODEL || 'gemini-2.0-flash';

    if (key) {
      this.client = new GoogleGenAI({ apiKey: key });
    }
  }

  async generateStructured<T>(
    prompt: string,
    systemInstruction: string,
    schema: z.ZodSchema<T>,
    options?: AIProviderOptions
  ): Promise<AIProviderResponse<T>> {
    if (!this.client) {
      throw new InternalServerError('Gemini provider is not configured with an API key');
    }

    const startTime = Date.now();
    const timeoutMs = options?.timeoutMs || env.AI_REQUEST_TIMEOUT_MS || 30000;

    // Secret scrub before sending to external API
    const sanitizedPrompt = PromptSanitizer.scrubSecrets(prompt);
    const sanitizedSystemInstruction = PromptSanitizer.scrubSecrets(systemInstruction);

    // Timeout protection via Promise.race
    const apiCallPromise = (async () => {
      const response = await this.client!.models.generateContent({
        model: this.modelName,
        contents: sanitizedPrompt,
        config: {
          systemInstruction: sanitizedSystemInstruction,
          responseMimeType: 'application/json',
          temperature: options?.temperature ?? 0.1,
          maxOutputTokens: options?.maxOutputTokens ?? 4096,
        },
      });

      return response;
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new InternalServerError(`Gemini AI request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      timer.unref?.();
    });

    try {
      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      const latencyMs = Date.now() - startTime;

      const responseText = response.text || '';
      if (!responseText) {
        throw new InternalServerError('Empty response received from Gemini model');
      }

      // Parse and validate JSON against Zod schema
      let jsonPayload: unknown;
      try {
        jsonPayload = JSON.parse(responseText);
      } catch (err) {
        logger.error('Failed to parse Gemini response as JSON', { responseText, error: err });
        throw new BadRequestError('AI model returned an invalid JSON structure');
      }

      const parsedData = schema.parse(jsonPayload);

      return {
        data: parsedData,
        modelName: this.modelName,
        promptTokens: response.usageMetadata?.promptTokenCount,
        completionTokens: response.usageMetadata?.candidatesTokenCount,
        latencyMs,
        rawResponse: responseText,
      };
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        logger.error('Gemini response failed schema validation', { errors: err.errors });
        throw new BadRequestError('AI model output did not match expected schema', err.errors);
      }
      logger.error('Gemini API call failed', { error: err.message });
      throw err;
    }
  }
}

