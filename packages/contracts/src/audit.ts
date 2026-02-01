import { z } from "zod";

export const AuditApp = z.enum(["gateway", "sentinel", "pulse"]);
export type AuditApp = z.infer<typeof AuditApp>;

export const AuditEvent = z.object({
    request_id: z.string(),
    tenant_id: z.string(),
    app: AuditApp,
    event_type: z.string(),              // e.g., "inspect", "llm_call", "rule_fail"
    ts: z.string(),                      // ISO timestamp
    payload: z.any()
});
export type AuditEvent = z.infer<typeof AuditEvent>;
