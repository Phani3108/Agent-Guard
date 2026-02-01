import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';

const JINJA_VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export function ruleTemplateVars(spec: CampaignSpec): Finding[] {
	const findings: Finding[] = [];

	for (const node of spec.flow.nodes ?? []) {
		if (node.type !== 'message') continue;
		for (const [locale, tpl] of Object.entries(node.templates ?? {})) {
			const text = tpl.text ?? '';
			let match: RegExpExecArray | null;
			while ((match = JINJA_VAR_RE.exec(text)) !== null) {
				const varName = match[1];
				const allowed = (spec.personalization?.allowedVars ?? []).includes(varName);
				if (!allowed) {
					findings.push({
						id: `tplvar:${node.id}:${locale}:${varName}`,
						severity: 'HIGH',
						category: 'Personalization',
						message: `Template references variable "${varName}" not declared in allowedVars.`,
						evidence: { nodeId: node.id, locale, varName },
						suggestion: `Add "${varName}" to allowedVars or provide a null-safe fallback.`
					});
				}
			}
		}
	}

	return findings;
}

