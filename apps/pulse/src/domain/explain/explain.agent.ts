import { readFileSync } from 'fs';
import { join } from 'path';
import { LLMProvider, OpenAIProvider } from './llm.provider';
import { DriftIncident } from '../drift/drift.types';
import { Segment } from '../segment/segment.types';
import { DriftRecommendation } from '../drift/drift.types';
import { logger } from '../../observability/logger';

export class ExplainAgent {
  private llmProvider: LLMProvider;
  private systemPrompt: string;
  private userPromptTemplate: string;

  constructor(llmProvider?: LLMProvider) {
    this.llmProvider = llmProvider || new OpenAIProvider();
    this.systemPrompt = this.loadPrompt('drift_explainer.system.md');
    this.userPromptTemplate = this.loadPrompt('drift_explainer.user.md');
  }

  /**
   * Generate explanation and recommendations for a drift incident
   */
  async explainDrift(
    incident: DriftIncident,
    segment: Segment
  ): Promise<{
    explanation: string;
    recommendations: DriftRecommendation[];
  }> {
    logger.info({ incidentId: incident.id, segmentId: segment.id }, 'Generating drift explanation');

    try {
      // Build user prompt with incident context
      const userPrompt = this.buildUserPrompt(incident, segment);

      // Generate explanation
      const response = await this.llmProvider.generateCompletion(this.systemPrompt, userPrompt);

      // Parse response
      const { explanation, recommendations } = this.parseResponse(response);

      logger.info(
        { incidentId: incident.id, recommendationCount: recommendations.length },
        'Drift explanation generated'
      );

      return { explanation, recommendations };
    } catch (error) {
      logger.error({ error, incidentId: incident.id }, 'Failed to generate drift explanation');
      throw error;
    }
  }

  private loadPrompt(filename: string): string {
    const promptPath = join(__dirname, 'prompts', filename);
    return readFileSync(promptPath, 'utf-8');
  }

  private buildUserPrompt(incident: DriftIncident, segment: Segment): string {
    const evidence = incident.evidence;
    const affectedAttributes = evidence.affectedAttributes?.join(', ') || '';

    return this.userPromptTemplate
      .replace('{{segmentName}}', segment.name)
      .replace('{{segmentOwner}}', segment.owner)
      .replace('{{segmentDefinition}}', JSON.stringify(segment.definition, null, 2))
      .replace('{{driftType}}', incident.type)
      .replace('{{driftSeverity}}', incident.severity)
      .replace('{{detectedAt}}', incident.timestamp.toISOString())
      .replace('{{currentValue}}', String(evidence.currentValue))
      .replace('{{previousValue}}', String(evidence.previousValue))
      .replace('{{changePercent}}', (evidence.changePercent * 100).toFixed(1))
      .replace('{{threshold}}', (evidence.threshold * 100).toFixed(1))
      .replace(
        '{{#if affectedAttributes}}',
        affectedAttributes ? '' : '<!--'
      )
      .replace('{{affectedAttributes}}', affectedAttributes)
      .replace(
        '{{/if}}',
        affectedAttributes ? '' : '-->'
      )
      .replace('{{details}}', JSON.stringify(evidence.details, null, 2));
  }

  private parseResponse(response: string): {
    explanation: string;
    recommendations: DriftRecommendation[];
  } {
    // Simple parsing - in production, might use structured output
    const lines = response.trim().split('\n');
    const recommendations: DriftRecommendation[] = [];

    // Extract recommendations (look for numbered lists or bullet points)
    const recommendationPattern = /^[\d\-\*]\.\s*(.+)/;

    for (const line of lines) {
      const match = line.match(recommendationPattern);
      if (match) {
        recommendations.push({
          action: match[1].trim(),
          reason: 'Derived from drift analysis',
          priority: 'medium', // Could be enhanced with LLM to specify priority
        });
      }
    }

    // If no structured recommendations found, create generic one
    if (recommendations.length === 0 && response.length > 0) {
      recommendations.push({
        action: 'Review the analysis and investigate the root cause',
        reason: response.substring(0, 200),
        priority: 'medium',
      });
    }

    return {
      explanation: response,
      recommendations,
    };
  }
}
