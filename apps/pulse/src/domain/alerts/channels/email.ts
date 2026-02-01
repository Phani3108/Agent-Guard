import { Resend } from 'resend';
import { DriftIncident } from '../drift/drift.types';
import { Segment } from '../segment/segment.types';
import { logger } from '../../observability/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

export class EmailChannel {
  private resend: Resend;
  private fromEmail: string;
  private toEmail: string;
  private template: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.ALERT_EMAIL_FROM || 'alerts@pulse.example.com';
    this.toEmail = process.env.ALERT_EMAIL_TO || 'team@example.com';
    this.template = readFileSync(join(__dirname, '../templates/email.html'), 'utf-8');
  }

  async send(incident: DriftIncident, segment: Segment, explanation?: string): Promise<void> {
    const html = this.buildEmail(incident, segment, explanation);
    const subject = `🚨 Segment Drift: ${segment.name} (${incident.severity})`;

    try {
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: this.toEmail,
        subject,
        html,
      });

      logger.info({ incidentId: incident.id, emailId: result.data?.id }, 'Email alert sent successfully');
    } catch (error) {
      logger.error({ error, incidentId: incident.id }, 'Failed to send email alert');
      throw error;
    }
  }

  private buildEmail(incident: DriftIncident, segment: Segment, explanation?: string): string {
    const changePercent = (incident.evidence.changePercent * 100).toFixed(1);
    const incidentUrl = `${process.env.APP_URL || 'http://localhost:3000'}/incidents/${incident.id}`;

    let html = this.template
      .replace(/{{segmentName}}/g, segment.name)
      .replace(/{{segmentOwner}}/g, segment.owner)
      .replace(/{{severity}}/g, incident.severity)
      .replace(/{{driftType}}/g, incident.type.replace('_', ' '))
      .replace(/{{detectedAt}}/g, incident.timestamp.toLocaleString())
      .replace(/{{explanation}}/g, explanation || 'Analysis in progress...')
      .replace(/{{currentValue}}/g, String(incident.evidence.currentValue))
      .replace(/{{previousValue}}/g, String(incident.evidence.previousValue))
      .replace(/{{changePercent}}/g, changePercent)
      .replace(/{{incidentUrl}}/g, incidentUrl);

    // Handle recommendations
    if (incident.recommendations && incident.recommendations.length > 0) {
      const recommendationsHtml = incident.recommendations
        .map(
          (rec) =>
            `<div class="recommendation">
              <span class="recommendation-priority">${rec.priority.toUpperCase()}:</span>
              ${rec.action}
            </div>`
        )
        .join('');

      html = html
        .replace('{{#if recommendations}}', '')
        .replace('{{#each recommendations}}', recommendationsHtml)
        .replace('{{/each}}', '')
        .replace('{{/if}}', '');
    } else {
      // Remove recommendations section if none
      html = html.replace(/{{#if recommendations}}[\s\S]*?{{\/if}}/g, '');
    }

    return html;
  }
}
