import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { campaignSpecSchema } from '@sentinel/shared/src/schemas/campaign.js';
import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import { RunsService } from '../runs/runs.service.js';
import { ChecksService } from '../checks/checks.service.js';
import { PolicyService } from '../policy/policy.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class IngestService {
	constructor(
		private readonly runsService: RunsService,
		private readonly checksService: ChecksService,
		private readonly policyService: PolicyService,
		private readonly auditService: AuditService
	) {}

	async ingest(spec: unknown) {
		const parsed = campaignSpecSchema.safeParse(spec);
		if (!parsed.success) {
			const message = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
			throw new Error(`Invalid CampaignSpec: ${message}`);
		}
		const validSpec: CampaignSpec = parsed.data;

		const run = await this.runsService.createRun(validSpec);
		this.auditService.log('run.created', { runId: run.id });

		// Load policies for tenant if present (MVP: default policy)
		const policy = await this.policyService.getPolicy(validSpec.tenantId ?? 'default');

		// Run checks synchronously (MVP). Queue can be introduced later.
		const report = await this.checksService.reviewCampaign(validSpec, policy);
		// Ensure runId is set on the report
		report.runId = run.id;
		await this.runsService.saveReport(run.id, report);

		this.auditService.log('run.completed', { runId: run.id, risk: report.risk });
		return run;
	}
}

