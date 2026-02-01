import { z } from "zod";

export const DecisionAction = z.enum(["ALLOW", "REDACT", "DENY", "WARN"]);
export type DecisionAction = z.infer<typeof DecisionAction>;

export const Redaction = z.object({
    type: z.string(),                 // e.g., "email", "phone", "user_id"
    original: z.string().optional(),   // optional: avoid storing raw PII in prod
    replacement: z.string(),           // e.g., "[REDACTED_EMAIL]"
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative()
});
export type Redaction = z.infer<typeof Redaction>;

export const Decision = z.object({
    request_id: z.string(),
    tenant_id: z.string(),
    action: DecisionAction,
    reasons: z.array(z.string()).default([]),
    redactions: z.array(Redaction).default([]),
    allowed_tools: z.array(z.string()).default([]),
    requires_approval: z.boolean().default(false),
    audit_id: z.string().optional()
});
export type Decision = z.infer<typeof Decision>;
