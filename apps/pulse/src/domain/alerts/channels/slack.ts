import { DriftIncident } from '../drift/drift.types';
import { Segment } from '../segment/segment.types';
import { logger } from '../../observability/logger';

export class SlackChannel {
  private webhookUrl: string;

  constructor() {
    const url = process.env.SLACK_WEBHOOK_URL;
    if (!url) {
      throw new Error('SLACK_WEBHOOK_URL environment variable is required');
    }
    this.webhookUrl = url;
  }

  async send(incident: DriftIncident, segment: Segment, explanation?: string): Promise<void> {
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
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      logger.info({ incidentId: incident.id }, 'Slack alert sent successfully');
    } catch (error) {
      logger.error({ error, incidentId: incident.id }, 'Failed to send Slack alert');
      throw error;
    }
  }

  private buildMessage(incident: DriftIncident, segment: Segment, explanation?: string) {
    const severityEmoji = this.getSeverityEmoji(incident.severity);
    const changePercent = (incident.evidence.changePercent * 100).toFixed(1);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚨 Segment Drift Alert`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Segment:*\n${segment.name}`,
          },
          {
            type: 'mrkdwn',
            text: `*Owner:*\n${segment.owner}`,
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severityEmoji} ${incident.severity.toUpperCase()}`,
          },
          {
            type: 'mrkdwn',
            text: `*Drift Type:*\n${incident.type.replace('_', ' ')}`,
          },
        ],
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*What Changed:*\n${explanation || 'Analysis in progress...'}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Current Value:*\n${incident.evidence.currentValue}`,
          },
          {
            type: 'mrkdwn',
            text: `*Previous Value:*\n${incident.evidence.previousValue}`,
          },
          {
            type: 'mrkdwn',
            text: `*Change:*\n${changePercent}%`,
          },
          {
            type: 'mrkdwn',
            text: `*Detected:*\n<!date^${Math.floor(incident.timestamp.getTime() / 1000)}^{date_short_pretty} {time}|${incident.timestamp.toISOString()}>`,
          },
        ],
      },
    ];

    // Add recommendations if available
    if (incident.recommendations && incident.recommendations.length > 0) {
      const recommendationText = incident.recommendations
        .map((rec) => `• *${rec.priority.toUpperCase()}*: ${rec.action}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Recommendations:*\n${recommendationText}`,
        },
      });
    }

    blocks.push({
      type: 'divider',
    });

    return {
      text: `Segment Drift Alert: ${segment.name}`,
      blocks,
    };
  }

  private getSeverityEmoji(severity: string): string {
    const emojis: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };
    return emojis[severity] || '⚪';
  }
}
