import { DriftIncident } from '../drift/drift.types';
import { Segment } from '../segment/segment.types';
import { SlackChannel } from './channels/slack';
import { EmailChannel } from './channels/email';
import { TeamsChannel } from './channels/teams';
import { logger } from '../../observability/logger';
import { AgentGuardClient } from '@agentguard/sdk';
import { DecisionAction } from '@agentguard/contracts';

export class AlertService {
  private slackChannel: SlackChannel;
  private emailChannel: EmailChannel;
  private teamsChannel: TeamsChannel;
  private guard: AgentGuardClient;

  constructor() {
    this.slackChannel = new SlackChannel();
    this.emailChannel = new EmailChannel();
    this.teamsChannel = new TeamsChannel();
    this.guard = new AgentGuardClient(
      process.env.GATEWAY_URL || 'http://localhost:7100',
      process.env.GATEWAY_API_KEY
    );
  }

  /**
   * Send alerts for a drift incident across all configured channels
   */
  async sendAlerts(incident: DriftIncident, segment: Segment): Promise<void> {
    logger.info({ incidentId: incident.id, segmentId: segment.id }, 'Sending drift alerts');

    let explanation = incident.explanationText;

    // 1. Safety check via AgentGuard Gateway
    if (explanation) {
      const safetyDecision = await this.guard.inspect({
        tenantId: 'demo', // TODO: get from context/tenant
        requestId: incident.id,
        text: explanation
      });

      if (safetyDecision.action === DecisionAction.DENY) {
        logger.warn({ incidentId: incident.id }, 'Alert blocked by safety guardrail');
        return;
      }

      if (safetyDecision.action === DecisionAction.REDACT) {
        logger.info({ incidentId: incident.id }, 'Alert redacted by safety guardrail');
        // Simple MVP: if redacted, we could use the replacement from Gateway
        // For now, we'll just prepend a warning or use a placeholder if available
        explanation = `[REDACTED SUMMARY] ${explanation.substring(0, 50)}... (Safety Redacted)`;
      }
    }

    // Send alerts in parallel
    const promises: Promise<void>[] = [];

    // Slack
    promises.push(
      this.slackChannel.send(incident, segment, explanation).catch((error) => {
        logger.error({ error, incidentId: incident.id }, 'Slack alert failed');
      })
    );

    // Email
    promises.push(
      this.emailChannel.send(incident, segment, explanation).catch((error) => {
        logger.error({ error, incidentId: incident.id }, 'Email alert failed');
      })
    );

    // Teams (optional)
    if (this.teamsChannel.isConfigured()) {
      promises.push(
        this.teamsChannel.send(incident, segment, explanation).catch((error) => {
          logger.error({ error, incidentId: incident.id }, 'Teams alert failed');
        })
      );
    }

    await Promise.all(promises);

    logger.info({ incidentId: incident.id }, 'Drift alerts sent');
  }

  /**
   * Send test alert to verify configuration
   */
  async sendTestAlert(): Promise<void> {
    const testIncident: DriftIncident = {
      id: 'test-123',
      segmentId: 'test-segment',
      timestamp: new Date(),
      type: 'size_jump',
      severity: 'low',
      evidence: {
        type: 'size_jump',
        currentValue: 12000,
        previousValue: 10000,
        changePercent: 0.20,
        threshold: 0.15,
      },
      explanationText: 'This is a test alert to verify your Pulse alerting configuration.',
      recommendations: [
        {
          action: 'Verify that all alert channels are working correctly',
          reason: 'Test configuration',
          priority: 'low',
        },
      ],
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const testSegment: Segment = {
      id: 'test-segment',
      name: 'Test Segment',
      definition: {
        rules: [{ field: 'test', operator: '=', value: 'test' }],
      },
      owner: 'test-user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.sendAlerts(testIncident, testSegment);
  }
}
