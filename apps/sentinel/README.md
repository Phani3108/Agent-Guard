# Sentinel

Agentic Campaign QA & Guardrails Platform

Tagline: Prevent bad campaigns before they go live.

## What is this?

Sentinel reviews campaigns pre-flight across logic, audience, personalization, policy, and fatigue to produce a structured risk report with suggested fixes. This repo contains a monorepo with an API service, shared schema package, an SDK, infra, and docs.

## Quick start (dev)

1) Copy env

```bash
cp .env.example .env
```

2) Install deps (requires pnpm)

```bash
pnpm install
```

3) Start infra (Postgres + Redis) and API

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm -C apps/api dev
```

API listens on http://localhost:4000.

## Repo layout

See `docs/` and comments in folders for details.

