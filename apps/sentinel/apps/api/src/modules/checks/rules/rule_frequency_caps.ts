import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';
import type { Policy } from '../../policy/policy.service.js';

export function ruleFrequencyCaps(spec: CampaignSpec, policy: Policy): Finding[] {
	const findings: Finding[] = [];
	const maxPerDay = policy.frequency?.maxPerUserPerDay ?? 5;

	// Heuristic: if flow contains more than maxPerDay message nodes without waits, flag.
	const messageNodes = (spec.flow.nodes ?? []).filter((n) => n.type === 'message');
	const waitNodes = (spec.flow.nodes ?? []).filter((n) => n.type === 'wait');

	if (messageNodes.length > maxPerDay && waitNodes.length === 0) {
		findings.push({
			id: 'frequency:cap_violation',
			severity: 'HIGH',
			category: 'Policy',
			message: `Potential frequency cap violation: ${messageNodes.length} messages and no waits.`,
			evidence: { messageCount: messageNodes.length, maxPerDay },
			suggestion: `Insert waits or reduce messages to <= ${maxPerDay} per day.`
		});
	}

	return findings;
}

