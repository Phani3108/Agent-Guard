import { Injectable } from '@nestjs/common';
import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Finding } from '@sentinel/shared/src/schemas/finding.js';

@Injectable()
export class LlmProvider {
	// MVP stub: returns no findings. Replace with provider adapter selection.
	async completeJSON(_spec: CampaignSpec): Promise<Finding[]> {
		return [];
	}
}

