import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';

export function ruleLocalizationGaps(spec: CampaignSpec): Finding[] {
	const findings: Finding[] = [];
	const requiredLocales = new Set(spec.localization?.requiredLocales ?? []);
	if (requiredLocales.size === 0) return findings;

	for (const node of spec.flow.nodes ?? []) {
		if (node.type === 'message') {
			const localesProvided = new Set(Object.keys(node.templates ?? {}));
			for (const locale of requiredLocales) {
				if (!localesProvided.has(locale)) {
					findings.push({
						id: `i18n:${node.id}:${locale}`,
						severity: 'MEDIUM',
						category: 'Personalization',
						message: `Template missing for locale ${locale} on node ${node.id}.`,
						evidence: { nodeId: node.id, missingLocale: locale },
						suggestion: `Add template variant for locale ${locale}.`
					});
				}
			}
		}
	}
	return findings;
}

