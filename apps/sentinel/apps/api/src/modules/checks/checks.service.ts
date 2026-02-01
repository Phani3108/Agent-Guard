import { Injectable } from '@nestjs/common';
import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';
import type { Policy } from '../policy/policy.service.js';
import { runAllRules } from './rules/index.js';
import { computeRisk } from './scoring/risk_score.js';
import type { Report } from '@sentinel/shared/src/schemas/report.js';
import { LlmProvider } from '../llm/llm.provider.js';
import { AgentGuardClient } from '@agentguard/sdk';
import { DecisionAction } from '@agentguard/contracts';

@Injectable()
export class ChecksService {
	constructor(
		private readonly llm: LlmProvider,
		private readonly guard: AgentGuardClient
	) { }

	async reviewCampaign(spec: CampaignSpec, policy: Policy): Promise<Report> {
		const deterministicFindings = runAllRules(spec, policy);

		// 1. Safety check via AgentGuard Gateway
		const safetyDecision = await this.guard.inspect({
			tenantId: 'demo', // TODO: get from context
			requestId: spec.id || 'new-run',
			payload: spec
		});

		if (safetyDecision.action === DecisionAction.DENY) {
			return {
				runId: 'blocked',
				risk: 'BLOCKER',
				findings: [
					...deterministicFindings,
					{
						id: 'SAFETY_DENY',
						severity: 'BLOCKER',
						category: 'POLICY_COMPLIANCE',
						title: 'Safety Policy Violation',
						message: safetyDecision.reasons.join(', ') || 'Gateway denied this campaign.'
					}
				],
				summary: 'Campaign blocked by safety guardrail.'
			};
		}

		// LLM pass (using redacted spec if requested)
		const effectiveSpec = safetyDecision.action === DecisionAction.REDACT ?
			{ ...spec, redacted: true } : spec; // Simple MVP redaction flag

		const llmFindings = await this.llm.completeJSON(effectiveSpec as any);

		const findings: Finding[] = [...deterministicFindings, ...llmFindings];
		const risk = computeRisk(findings);
		const summary =
			findings.length === 0
				? 'No issues found.'
				: `Found ${findings.length} issues. Highest severity: ${risk}.`;

		return {
			runId: 'pending-assign',
			risk,
			findings,
			summary
		};
	}
}

