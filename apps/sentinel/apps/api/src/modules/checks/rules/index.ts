import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';
import type { Policy } from '../../policy/policy.service.js';
import { ruleUnreachableNodes } from './rule_unreachable_nodes.js';
import { ruleMissingExits } from './rule_missing_exits.js';
import { ruleFrequencyCaps } from './rule_frequency_caps.js';
import { ruleOptIn } from './rule_opt_in.js';
import { ruleLocalizationGaps } from './rule_localization_gaps.js';
import { ruleTemplateVars } from './rule_template_vars.js';

export function runAllRules(spec: CampaignSpec, policy: Policy): Finding[] {
	const results: Finding[] = [];
	results.push(...ruleUnreachableNodes(spec));
	results.push(...ruleMissingExits(spec));
	results.push(...ruleFrequencyCaps(spec, policy));
	results.push(...ruleOptIn(spec, policy));
	results.push(...ruleLocalizationGaps(spec));
	results.push(...ruleTemplateVars(spec));
	return results;
}

