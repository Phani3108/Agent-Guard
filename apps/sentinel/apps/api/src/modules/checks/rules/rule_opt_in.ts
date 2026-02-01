import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';
import type { Policy } from '../../policy/policy.service.js';

export function ruleOptIn(spec: CampaignSpec, policy: Policy): Finding[] {
	const findings: Finding[] = [];
	const channelsRequiringOptIn = new Set(policy.channels?.requireOptIn ?? []);

	for (const node of spec.flow.nodes ?? []) {
		if (node.type === 'message') {
			const channel = node.channel ?? 'unknown';
			if (channelsRequiringOptIn.has(channel) && !spec.compliance?.optIn?.includes(channel)) {
				findings.push({
					id: `optin:${channel}`,
					severity: 'BLOCKER',
					category: 'Compliance',
					message: `Channel ${channel} requires opt-in but campaign lacks it.`,
					evidence: { channel },
					suggestion: `Ensure opt-in is captured for ${channel} or remove ${channel} messages.`
				});
			}
		}
	}

	return findings;
}

