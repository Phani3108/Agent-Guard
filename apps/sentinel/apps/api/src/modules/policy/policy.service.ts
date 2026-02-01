import { Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import YAML from 'yaml';

export interface Policy {
	forbidden?: { keywords?: string[] };
	channels?: { requireOptIn?: string[] };
	frequency?: { maxPerUserPerDay?: number };
	geos?: { restricted?: string[] };
}

@Injectable()
export class PolicyService {
	private cache = new Map<string, Policy>();

	async getPolicy(tenantId: string): Promise<Policy> {
		if (this.cache.has(tenantId)) return this.cache.get(tenantId)!;
		// MVP: load default policy only
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const policyPath = path.resolve(__dirname, './policies/default.policy.yaml');
		const raw = await readFile(policyPath, 'utf8');
		const parsed = YAML.parse(raw) as Policy;
		this.cache.set(tenantId, parsed);
		return parsed;
	}
}

