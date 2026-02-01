# AgentGuard

AgentGuard is an enterprise control plane for agentic workflows:
- **Gateway (Aegis core):** PII redaction, policy enforcement, tool firewall, audit traces
- **Sentinel:** agentic campaign pre-flight QA + guardrails
- **Pulse:** segment drift observability + agentic diagnosis + alerts

## Why
Agentic features increase velocity — and risk. AgentGuard makes agentic systems:
- safe (policy + PII firewall)
- debuggable (trace/audit)
- reliable (deterministic checks + controlled tool calls)
- operational (drift monitoring + alerts)

## Monorepo layout
- apps/gateway  -> Aegis core
- apps/sentinel -> campaign QA app
- apps/pulse    -> segment drift app
- apps/console  -> optional UI
- packages/contracts -> shared Zod schemas + types
- packages/sdk -> typed client for internal calls

## Quickstart
1. Copy your existing repos into:
   - apps/gateway
   - apps/sentinel
   - apps/pulse

2. Install deps
   pnpm i

3. Start infra + services
   docker compose up -d postgres redis
   pnpm dev

## Local URLs (defaults)
- Gateway  : http://localhost:7100
- Sentinel : http://localhost:7200
- Pulse    : http://localhost:7300
- Console  : http://localhost:7400 (optional)

## MVP integration (the point of AgentGuard)
- Sentinel calls Gateway `/inspect` before any LLM call
- Pulse calls Gateway `/inspect` before sending alerts or storing explanations
- All apps write to a shared audit store (request_id, tenant_id, app, event_type, payload)

## Key contracts
See packages/contracts:
- Decision (ALLOW|REDACT|DENY|WARN)
- Finding/Report (Sentinel output)
- SegmentSnapshot/DriftIncident (Pulse output)
- AuditEvent (shared trace)
