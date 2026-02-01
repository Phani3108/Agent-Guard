import { z } from "zod";
import { Severity } from "./findings";

export const SegmentSnapshot = z.object({
    segment_id: z.string(),
    ts: z.string(),
    size: z.number().int().nonnegative(),
    distributions: z.record(z.any()).optional(),
    conv_rate: z.number().min(0).max(1).optional(),
    velocity_in: z.number().optional(),
    velocity_out: z.number().optional()
});
export type SegmentSnapshot = z.infer<typeof SegmentSnapshot>;

export const DriftType = z.enum([
    "SIZE_JUMP",
    "DISTRIBUTION_SHIFT",
    "CONVERSION_ANOMALY",
    "INACTIVITY_CREEP",
    "OTHER"
]);
export type DriftType = z.infer<typeof DriftType>;

export const DriftIncident = z.object({
    id: z.string(),
    segment_id: z.string(),
    ts: z.string(),
    type: DriftType,
    severity: Severity,
    evidence: z.any(),
    explanation: z.string().optional(),
    recommendations: z.array(z.string()).default([]),
    status: z.enum(["OPEN", "ACKED", "RESOLVED"]).default("OPEN")
});
export type DriftIncident = z.infer<typeof DriftIncident>;
