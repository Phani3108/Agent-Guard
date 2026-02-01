import { Injectable } from '@nestjs/common';

export interface AuditEvent {
	type: string;
	ts: string;
	data?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
	private events: AuditEvent[] = [];

	log(type: string, data?: Record<string, unknown>) {
		this.events.push({ type, data, ts: new Date().toISOString() });
	}

	getAll(): AuditEvent[] {
		return [...this.events];
	}
}

