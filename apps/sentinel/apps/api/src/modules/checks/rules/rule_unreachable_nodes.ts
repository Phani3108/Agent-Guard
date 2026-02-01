import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';

export function ruleUnreachableNodes(spec: CampaignSpec): Finding[] {
	const findings: Finding[] = [];
	const nodes = spec.flow.nodes ?? [];
	const edges = spec.flow.edges ?? [];
	if (nodes.length === 0) return findings;

	const startIds = new Set((spec.flow.starts ?? []).map((s) => s.nodeId));
	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		const list = adjacency.get(edge.from) ?? [];
		list.push(edge.to);
		adjacency.set(edge.from, list);
	}

	const visited = new Set<string>();
	const stack = [...startIds];
	while (stack.length > 0) {
		const node = stack.pop() as string;
		if (visited.has(node)) continue;
		visited.add(node);
		const next = adjacency.get(node) ?? [];
		for (const n of next) stack.push(n);
	}

	for (const n of nodes) {
		if (!visited.has(n.id)) {
			findings.push({
				id: `unreachable:${n.id}`,
				severity: 'MEDIUM',
				category: 'Logical',
				message: `Node ${n.id} is unreachable from any start.`,
				evidence: { nodeId: n.id },
				suggestion: 'Ensure there is a path from a start node to this node.'
			});
		}
	}

	return findings;
}

