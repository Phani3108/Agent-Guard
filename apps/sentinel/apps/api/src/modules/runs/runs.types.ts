import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Report } from '@sentinel/shared/src/schemas/report.js';

export interface Run {
	id: string;
	createdAt: string;
	spec: CampaignSpec;
	report?: Report;
}

