import { z } from "zod";

export const Severity = z.enum(["LOW", "MEDIUM", "HIGH", "BLOCKER"]);
export type Severity = z.infer<typeof Severity>;

export const FindingCategory = z.enum([
    "FLOW_LOGIC",
    "AUDIENCE",
    "PERSONALIZATION",
    "POLICY_COMPLIANCE",
    "FATIGUE",
    "DELIVERABILITY",
    "OTHER"
]);
export type FindingCategory = z.infer<typeof FindingCategory>;

export const Finding = z.object({
    id: z.string(),
    severity: Severity,
    category: FindingCategory,
    title: z.string(),
    message: z.string(),
    evidence: z.any().optional(),
    suggestion: z.string().optional(),
    patch: z.any().optional() // optional: "patched spec fragment"
});
export type Finding = z.infer<typeof Finding>;

export const RiskScore = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type RiskScore = z.infer<typeof RiskScore>;

export const Report = z.object({
    run_id: z.string(),
    tenant_id: z.string(),
    risk: RiskScore,
    summary: z.string(),
    findings: z.array(Finding),
    created_at: z.string()
});
export type Report = z.infer<typeof Report>;
