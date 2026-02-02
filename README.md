##AgentGuard — AI Control Plane for Agentic Engagement Systems
-What problem this solves (in plain terms)
-- MoEngage is moving from rule-driven automation to agentic workflows — systems that reason, decide, and act on behalf of marketers and operators.

That shift creates three new risks at scale:
*Silent failures:
-- Campaigns, segments, and flows look valid but break business logic, compliance, or personalization once live.
*Unobservable drift:
--Segments and journeys degrade over time due to data, behavior, or schema changes — teams find out only after CTRs drop.
*Enterprise risk with LLMs:
--Agentic systems introduce PII leakage, uncontrolled tool access, and non-deterministic behavior that CTOs and CISOs cannot sign off on without guardrails.

AgentGuard addresses all three as a single platform primitive.

##What AgentGuard is
AgentGuard is a control plane that sits between agentic intelligence and production systems. It does not replace MoEngage’s AI features. It makes them safe, observable, and operational at enterprise scale.

Core capabilities (built as one system)
1. Sentinel — Pre-flight Campaign & Journey QA
-- Prevents bad campaigns before they go live.
-- Reviews flows, segments, and templates
-- Detects logic errors, unreachable nodes, missing exits
-- Validates personalization, localization, opt-in rules
-- Flags fatigue, over-messaging, compliance risks
-- Produces a structured risk report + recommended fixes

*Impact
-- Fewer rollbacks
-- Lower support load
-- Higher trust in AI-assisted campaign creation

2. Pulse — Segment Drift & Audience Observability
-- Makes audiences observable, not static.
-- Continuously snapshots segment behavior
-- Detects silent drift in size, composition, conversion
-- Explains why drift happened using agentic diagnosis
-- Recommends corrective actions before performance drops

*Impact
-- Early detection instead of reactive firefighting
-- Better ROI from existing campaigns
-- Stronger trust in segmentation at scale

3. Gateway (Aegis) — PII, Policy & Tool Firewall
-- Enterprise-grade safety layer for agentic systems.
-- Inspects all prompts and agent outputs
-- Redacts or blocks PII before it reaches LLMs
-- Enforces policy on tool calls (read vs write, rate limits)
-- Creates replayable audit trails for every decision

*Impact
-- CTO/CISO-approved agentic adoption
-- Reduced regulatory and data exposure risk
-- Clear explainability for AI decisions


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
