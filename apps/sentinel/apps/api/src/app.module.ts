import { Module } from '@nestjs/common';
import { IngestController } from './modules/ingest/ingest.controller.js';
import { IngestService } from './modules/ingest/ingest.service.js';
import { RunsController } from './modules/runs/runs.controller.js';
import { RunsService } from './modules/runs/runs.service.js';
import { RunsRepo } from './modules/runs/runs.repo.js';
import { ChecksService } from './modules/checks/checks.service.js';
import { PolicyService } from './modules/policy/policy.service.js';
import { AuditService } from './modules/audit/audit.service.js';
import { LlmProvider } from './modules/llm/llm.provider.js';
import { AgentGuardClient } from '@agentguard/sdk';

@Module({
	controllers: [IngestController, RunsController],
	providers: [
		IngestService,
		RunsService,
		RunsRepo,
		ChecksService,
		PolicyService,
		AuditService,
		LlmProvider,
		{
			provide: AgentGuardClient,
			useFactory: () => {
				return new AgentGuardClient(
					process.env.GATEWAY_URL || 'http://localhost:7100',
					process.env.GATEWAY_API_KEY
				);
			}
		}
	]
})
export class AppModule { }

