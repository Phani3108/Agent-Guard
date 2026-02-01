import { z } from 'zod';
import { findingSchema } from './finding.js';

export const reportRiskSchema = z.enum(['Low', 'Medium', 'High']);
export type ReportRisk = z.infer<typeof reportRiskSchema>;

export const reportSchema = z.object({
	runId: z.string(),
	risk: reportRiskSchema,
	findings: z.array(findingSchema),
	summary: z.string().optional()
});

export type Report = z.infer<typeof reportSchema>;

