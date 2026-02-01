import { Body, Controller, Post } from '@nestjs/common';
import { IngestService } from './ingest.service.js';
import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';

@Controller('runs')
export class IngestController {
	constructor(private readonly ingestService: IngestService) {}

	@Post()
	async createRun(@Body() spec: CampaignSpec) {
		const run = await this.ingestService.ingest(spec);
		return { runId: run.id };
	}
}

