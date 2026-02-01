import { Injectable } from '@nestjs/common';
import type { Run } from './runs.types.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class RunsRepo {
	private readonly runs = new Map<string, Run>();

	create(spec: Run['spec']): Run {
		const id = randomUUID();
		const run: Run = {
			id,
			createdAt: new Date().toISOString(),
			spec
		};
		this.runs.set(id, run);
		return run;
	}

	saveReport(id: string, report: NonNullable<Run['report']>): void {
		const existing = this.runs.get(id);
		if (!existing) {
			throw new Error(`Run not found: ${id}`);
		}
		existing.report = report;
		this.runs.set(id, existing);
	}

	findById(id: string): Run | undefined {
		return this.runs.get(id);
	}
}

