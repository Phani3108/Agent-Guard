import type { Finding } from '@sentinel/shared/src/schemas/finding.js';
import type { ReportRisk } from '@sentinel/shared/src/schemas/report.js';

export function computeRisk(findings: Finding[]): ReportRisk {
	let level: ReportRisk = 'Low';
	for (const f of findings) {
		if (f.severity === 'BLOCKER' || f.severity === 'HIGH') return 'High';
		if (f.severity === 'MEDIUM') level = 'Medium';
	}
	return level;
}

