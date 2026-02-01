import { z } from 'zod';

export const nodeSchema = z.object({
	id: z.string(),
	type: z.enum(['start', 'end', 'message', 'wait', 'branch', 'action']).default('message'),
	channel: z.string().optional(),
	templates: z.record(z.string(), z.object({ text: z.string().optional() })).optional(),
	config: z.record(z.string(), z.unknown()).optional()
});

export const edgeSchema = z.object({
	from: z.string(),
	to: z.string(),
	condition: z.string().optional()
});

export const flowSchema = z.object({
	nodes: z.array(nodeSchema),
	edges: z.array(edgeSchema),
	starts: z.array(z.object({ nodeId: z.string() })).optional(),
	ends: z.array(z.object({ nodeId: z.string() })).optional()
});

export const campaignSpecSchema = z.object({
	id: z.string().optional(),
	tenantId: z.string().optional(),
	name: z.string(),
	version: z.string().default('1'),
	flow: flowSchema,
	segment: z
		.object({
			id: z.string().optional(),
			name: z.string().optional(),
			definition: z.record(z.string(), z.unknown()).optional(),
			estimatedSize: z.number().int().nonnegative().optional()
		})
		.optional(),
	compliance: z
		.object({
			optIn: z.array(z.string()).optional(),
			frequencyCapByChannel: z.record(z.string(), z.number()).optional()
		})
		.optional(),
	localization: z.object({ requiredLocales: z.array(z.string()).optional() }).optional(),
	personalization: z.object({ allowedVars: z.array(z.string()).optional() }).optional(),
	channelMeta: z.record(z.string(), z.unknown()).optional()
});

export type CampaignSpec = z.infer<typeof campaignSpecSchema>;

