import { Injectable } from '@nestjs/common';
import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Report } from '@sentinel/shared/src/schemas/report.js';
import { RunsRepo } from './runs.repo.js';
import type { Run } from './runs.types.js';

@Injectable()
export class RunsService {
	constructor(private readonly repo: RunsRepo) {}

	async createRun(spec: CampaignSpec): Promise<Run> {
		return this.repo.create(spec);
	}

	async saveReport(id: string, report: Report): Promise<void> {
		return this.repo.saveReport(id, report);
	}

	async getRun(id: string): Promise<Run | undefined> {
		return this.repo.findById(id);
	}

	async getReport(id: string): Promise<Report | undefined> {
		return this.repo.findById(id)?.report;
	}
}

