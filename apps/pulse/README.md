# Pulse 🫀

> **Your segments are alive. We tell you when they go wrong.**

Pulse is an agentic segment drift and reach intelligence system that continuously monitors audience segments and provides intelligent explanations when they degrade.

## 🎯 Problem

Segments silently degrade over time due to:
- Data changes
- User behavior shifts
- Upstream schema changes
- Product feature changes

Teams only notice when CTR drops, delivery fails, or someone complains. **This is reactive, not intelligent.**

## 💡 Solution

Pulse continuously monitors segments and answers:

> "Is this segment still behaving the way the business expects?"

It's **observability for audiences**.

## 🚀 Features

### Core Capabilities (MVP)

1. **Segment Snapshotting**
   - Daily segment size tracking
   - Attribute distributions
   - Entry/exit velocity

2. **Drift Detection (Agent + Stats)**
   - Sudden size changes
   - Attribute distribution skew
   - Conversion rate anomalies
   - Inactivity creep

3. **Agentic Diagnosis**
   - What changed
   - Why it likely changed
   - What to do next
   
   Examples:
   - _"Android SDK update changed app_version values"_
   - _"High-value users exited due to inactivity rule tightening"_

4. **Recommendations**
   - Adjust rule thresholds
   - Split into sub-segments
   - Archive unused segments
   - Create alerting rules

## 🏗️ Architecture

```
┌─────────────────┐
│  Segment CRUD   │
└────────┬────────┘
         │
    ┌────▼─────┐      ┌──────────────┐
    │ Snapshot │─────►│ Drift        │
    │ Job      │      │ Detector     │
    └──────────┘      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │ Explanation  │
                      │ Agent (LLM)  │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │ Alert        │
                      │ Channels     │
                      └──────────────┘
                    (Slack/Email/Teams)
```

### Components

- **Segment Metrics Store**: Historical baseline storage
- **Drift Detector**: Rules + statistical analysis
- **Explanation Agent**: LLM-powered insights
- **Alerting Channel**: Slack/Email/Teams notifications
- **Job Scheduler**: BullMQ for periodic tasks

## 🛠️ Tech Stack

- **API**: Fastify
- **Jobs**: BullMQ
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **AI**: OpenAI GPT-4
- **Alerts**: Slack webhooks + Resend (email) + Teams

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# Seed demo segments
npm run seed

# Run in development mode
npm run dev
```

## 🚀 Quick Start

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Register a segment**
   ```bash
   curl -X POST http://localhost:3000/api/segments \
     -H "Content-Type: application/json" \
     -d '{
       "name": "High-Value Active Users",
       "definition": {
         "rules": [
           {"field": "ltv", "operator": ">", "value": 1000},
           {"field": "last_active_days", "operator": "<=", "value": 7}
         ]
       },
       "owner": "growth-team"
     }'
   ```

3. **Trigger a snapshot**
   ```bash
   curl -X POST http://localhost:3000/api/snapshots/take
   ```

4. **Check for drift**
   ```bash
   curl http://localhost:3000/api/drift/incidents
   ```

## 📊 API Endpoints

- `GET /health` - Health check
- `POST /api/segments` - Create segment
- `GET /api/segments` - List segments
- `GET /api/segments/:id` - Get segment details
- `PUT /api/segments/:id` - Update segment
- `DELETE /api/segments/:id` - Delete segment
- `GET /api/snapshots` - List snapshots
- `POST /api/snapshots/take` - Trigger snapshot job
- `GET /api/drift/incidents` - List drift incidents
- `GET /api/drift/incidents/:id` - Get incident details
- `POST /webhook/drift` - n8n integration endpoint

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit
```

## 📈 Demo Narrative

> "This segment looked stable — until Pulse caught a **42% silent erosion** caused by a schema change."

Generate synthetic drift:
```bash
npm run generate-snapshots
```

## 🎯 Metrics of Success

- % of segments monitored
- Drift detection lead time
- Reduction in campaign underperformance
- Adoption by ops teams

## 🎭 Target Users

- Lifecycle Marketers
- CRM Ops
- Growth Teams
- Customer Success

## 🚫 Non-Goals (MVP)

- No auto-edit of segments
- No predictive modeling
- No user-level targeting changes

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines first.

---

Built with ❤️ for teams who care about their audience data.
