import OpenAI from 'openai';
import { logger } from '../../observability/logger';

export interface LLMProvider {
  generateCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      logger.debug({ model: this.model }, 'Generating LLM completion');

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in LLM response');
      }

      logger.debug(
        {
          tokens: completion.usage?.total_tokens,
          model: this.model,
        },
        'LLM completion generated'
      );

      return content;
    } catch (error) {
      logger.error({ error }, 'Failed to generate LLM completion');
      throw error;
    }
  }
}
