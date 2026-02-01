import { z } from "zod";

/**
 * Sentinel input. Keep it permissive in MVP; tighten later.
 */
export const CampaignSpec = z.object({
    id: z.string().optional(),
    name: z.string(),
    channel: z.enum(["email", "push", "sms", "whatsapp", "inapp"]).optional(),
    flow: z.any(),               // your DAG / nodes
    segment: z.any().optional(), // segment definition snapshot
    templates: z.any().optional()// Jinja/templates bundle
});
export type CampaignSpec = z.infer<typeof CampaignSpec>;

/**
 * Pulse input.
 */
export const SegmentDefinition = z.object({
    id: z.string().optional(),
    name: z.string(),
    definition: z.any()          // rule JSON
});
export type SegmentDefinition = z.infer<typeof SegmentDefinition>;
