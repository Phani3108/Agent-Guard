import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';

export function ruleMissingExits(spec: CampaignSpec): Finding[] {
	const findings: Finding[] = [];
	const endNodes = new Set((spec.flow.ends ?? []).map((e) => e.nodeId));
	const nodes = spec.flow.nodes ?? [];

	for (const n of nodes) {
		// Heuristic: message nodes should reach an end eventually.
		if (n.type === 'message') {
			const hasExit = (spec.flow.ends ?? []).some((e) => e.nodeId === n.id);
			if (!hasExit) {
				findings.push({
					id: `missing_exit:${n.id}`,
					severity: 'LOW',
					category: 'Logical',
					message: `Message node ${n.id} has no explicit exit.`,
					evidence: { nodeId: n.id, ends: Array.from(endNodes) },
					suggestion: 'Add an exit condition or connect this path to a terminating node.'
				});
			}
		}
	}

	return findings;
}

