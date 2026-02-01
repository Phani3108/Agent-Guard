import type { CampaignSpec } from '@sentinel/shared/src/schemas/campaign.js';
import type { Report } from '@sentinel/shared/src/schemas/report.js';

export class SentinelClient {
	constructor(private readonly baseUrl: string) {}

	async createRun(spec: CampaignSpec): Promise<{ runId: string }> {
		const res = await fetch(new URL('/runs', this.baseUrl), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(spec)
		});
		if (!res.ok) throw new Error(`createRun failed: ${res.status}`);
		return res.json();
	}

	async getReport(runId: string): Promise<Report> {
		const res = await fetch(new URL(`/runs/${runId}/report`, this.baseUrl));
		if (!res.ok) throw new Error(`getReport failed: ${res.status}`);
		return res.json();
	}
}

