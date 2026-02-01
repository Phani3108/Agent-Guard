import { DriftIncident } from '../drift/drift.types';
import { Segment } from '../segment/segment.types';
import { logger } from '../../observability/logger';

export class TeamsChannel {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  async send(incident: DriftIncident, segment: Segment, explanation?: string): Promise<void> {
    if (!this.webhookUrl) {
      logger.warn('Teams webhook URL not configured, skipping Teams alert');
      return;
    }

    const message = this.buildMessage(incident, segment, explanation);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Teams API error: ${response.statusText}`);
      }

      logger.info({ incidentId: incident.id }, 'Teams alert sent successfully');
    } catch (error) {
      logger.error({ error, incidentId: incident.id }, 'Failed to send Teams alert');
      throw error;
    }
  }

  private buildMessage(incident: DriftIncident, segment: Segment, explanation?: string) {
    const severityColor = this.getSeverityColor(incident.severity);
    const changePercent = (incident.evidence.changePercent * 100).toFixed(1);

    const facts = [
      {
        name: 'Segment',
        value: segment.name,
      },
      {
        name: 'Owner',
        value: segment.owner,
      },
      {
        name: 'Drift Type',
        value: incident.type.replace('_', ' '),
      },
      {
        name: 'Severity',
        value: incident.severity.toUpperCase(),
      },
      {
        name: 'Current Value',
        value: String(incident.evidence.currentValue),
      },
      {
        name: 'Previous Value',
        value: String(incident.evidence.previousValue),
      },
      {
        name: 'Change',
        value: `${changePercent}%`,
      },
    ];

    const sections = [
      {
        activityTitle: '🚨 Segment Drift Alert',
        activitySubtitle: `Detected at ${incident.timestamp.toLocaleString()}`,
        facts,
        text: explanation || 'Analysis in progress...',
      },
    ];

    // Add recommendations
    if (incident.recommendations && incident.recommendations.length > 0) {
      const recommendationText = incident.recommendations
        .map((rec) => `- **${rec.priority.toUpperCase()}**: ${rec.action}`)
        .join('\n\n');

      sections.push({
        activityTitle: 'Recommendations',
        activitySubtitle: '',
        facts: [],
        text: recommendationText,
      });
    }

    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Segment Drift: ${segment.name}`,
      themeColor: severityColor,
      sections,
    };
  }

  private getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: 'DC2626',
      high: 'EA580C',
      medium: 'F59E0B',
      low: '10B981',
    };
    return colors[severity] || '6B7280';
  }
}
