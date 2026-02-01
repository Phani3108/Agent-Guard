import { z } from 'zod';

export const findingSchema = z.object({
	id: z.string(),
	severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'BLOCKER']),
	category: z.enum(['Logical', 'Audience', 'Personalization', 'Compliance', 'Fatigue', 'Other']).default('Other'),
	message: z.string(),
	evidence: z.record(z.string(), z.unknown()).optional(),
	suggestion: z.string().optional(),
	patch: z.unknown().optional()
});

export type Finding = z.infer<typeof findingSchema>;

