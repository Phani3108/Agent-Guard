# Pulse Demo Script

This script walks you through demonstrating Pulse's segment drift detection capabilities.

## Setup (5 minutes)

### 1. Start Infrastructure
```bash
cd /path/to/pulse
npm run docker:up
```

Wait for PostgreSQL and Redis to be healthy.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and set:
- `OPENAI_API_KEY`: Your OpenAI API key
- `SLACK_WEBHOOK_URL`: Your Slack webhook (optional)
- `RESEND_API_KEY`: Your Resend API key (optional)

### 4. Initialize Database & Seed
```bash
# Database schema is auto-created by docker-compose
npm run seed
```

You should see 5 demo segments created.

### 5. Start Server
```bash
npm run dev
```

Server should start on `http://localhost:3000`

## Demo Part 1: Basic Monitoring (5 minutes)

### Show Segments
```bash
curl http://localhost:3000/api/segments | jq
```

**Say**: "Here are 5 segments we're monitoring: high-value users, trial users, churned users, power users, and enterprise customers."

### Take Initial Snapshots
```bash
curl -X POST http://localhost:3000/api/snapshots/take
```

**Say**: "Pulse takes daily snapshots of each segment, capturing size, attribute distributions, and behavioral metrics."

### View Snapshots
```bash
curl http://localhost:3000/api/snapshots?limit=10 | jq
```

**Say**: "Each snapshot captures current state - you can see size, platform distribution, conversion rates, and user velocity."

## Demo Part 2: Simulate Drift (10 minutes)

### Generate Synthetic Drift
```bash
npm run generate-snapshots
```

**Say**: "I'm generating 7 days of historical snapshots. On day 2, we simulate a schema change that causes a 42% silent erosion in one of our segments."

### Check Snapshots Timeline
```bash
# Get a specific segment ID first
SEGMENT_ID=$(curl -s http://localhost:3000/api/segments | jq -r '.[0].id')

# View its snapshot history
curl "http://localhost:3000/api/snapshots/segment/$SEGMENT_ID" | jq
```

**Say**: "Notice the size drop from ~10,000 to ~5,800 users on the recent snapshots. This is exactly the kind of silent degradation teams miss."

### Trigger Drift Detection
In a real setup, this runs on a schedule. For demo, we can trigger manually via the drift detection job queue.

**Alternative**: If running with scheduler, drift will be auto-detected on next scheduled run.

### View Drift Incidents
```bash
curl http://localhost:3000/api/drift/incidents | jq
```

**Say**: "Pulse detected multiple types of drift:
- **Size Jump**: 42% segment erosion
- **Distribution Shift**: Android users disappeared completely  
- **Conversion Anomaly**: Conversion rate dropped from 15% to 10%
- **Inactivity Creep**: Churn rate doubled

Each incident includes evidence, severity, and AI-generated explanations."

### Deep Dive into Specific Incident
```bash
INCIDENT_ID=$(curl -s http://localhost:3000/api/drift/incidents | jq -r '.[0].id')

curl "http://localhost:3000/api/drift/incidents/$INCIDENT_ID" | jq
```

**Say**: "Look at the explanation. The AI agent analyzed the evidence and hypothesized this could be:
1. An Android SDK update that broke tracking
2. A schema change in the app_version field
3. A data pipeline issue

It also provides specific recommendations like checking recent SDK deployments and validating Android tracking."

## Demo Part 3: Alerting (5 minutes)

### Show Alert Configuration
```bash
cat .env | grep -E "(SLACK|RESEND|TEAMS)"
```

**Say**: "Pulse integrates with Slack, Email, and Microsoft Teams. When drift is detected, your team gets notified immediately."

### Example Slack Alert
**Say**: "The Slack alert includes:
- Segment name and owner
- Drift type and severity
- What changed (with evidence)
- AI-generated explanation
- Actionable recommendations
- Link to full incident"

Show example alert in Slack or the formatted message template.

### n8n Integration
```bash
curl -X POST http://localhost:3000/webhook/drift \
  -H "Content-Type: application/json" \
  -d '{
    "incidentId": "test-123",
    "segmentId": "test-segment",
    "severity": "high"
  }'
```

**Say**: "For advanced workflows, Pulse has a webhook endpoint. You can use n8n to route drift incidents to Jira, Notion, DataDog, or any other tool."

## Demo Part 4: Investigation & Resolution (5 minutes)

### Resolve Incident
```bash
curl -X POST "http://localhost:3000/api/drift/incidents/$INCIDENT_ID/resolve" \
  -H "Content-Type: application/json" \
  -d '{"resolvedBy": "demo-user"}'
```

**Say**: "Once the team investigates and fixes the issue, they can mark the incident as resolved."

### View Resolution Status
```bash
curl "http://localhost:3000/api/drift/incidents/$INCIDENT_ID" | jq '.status'
```

### Filter Open Incidents
```bash
curl 'http://localhost:3000/api/drift/incidents?status=open' | jq
```

**Say**: "Teams can filter incidents by status to focus on active issues."

## Demo Part 5: The Value Proposition (5 minutes)

### Before Pulse
**Say**: "Without Pulse:
- Segment degradation is silent
- Teams notice only when campaigns fail
- Root cause analysis is manual and slow
- No historical context or baselines
- Reactive firefighting

### With Pulse
**Say**: "With Pulse:
- Continuous monitoring of all segments
- Proactive alerts before business impact
- AI-powered root cause analysis
- Historical trends and baselines
- Evidence-based recommendations
- Automated notifications

### The Demo Narrative
**Say**: "This segment looked stable for weeks. Then Pulse caught a 42% silent erosion caused by a schema change. 

Without Pulse, the marketing team would have:
1. Sent campaigns to 10,000 users
2. Actually reached only 5,800
3. Seen terrible performance
4. Spent hours debugging
5. Lost revenue and trust

With Pulse:
1. Detected drift within 24 hours
2. Explained the likely cause (Android tracking)
3. Recommended immediate actions
4. Prevented campaign launch
5. Saved the day"

## Cleanup
```bash
npm run docker:down
```

## Questions & Extensions

### Q: How does it handle false positives?
**A**: Tune thresholds per-segment. Critical segments can have tighter thresholds (10%), while experimental segments can be looser (30%).

### Q: Can it auto-fix segments?
**A**: No - by design. Pulse explains, doesn't decide. Humans review and act on recommendations.

### Q: What about predictive drift?
**A**: Not in MVP. Future: ML models to predict drift before it happens.

### Q: Scale?
**A**: Designed for 1000s of segments. Uses BullMQ for job distribution, PostgreSQL for storage, Redis for queueing.

### Q: Integration with data warehouse?
**A**: Currently uses synthetic data. Production: Connect to Snowflake/BigQuery/Databricks to compute real segment metrics.

## Tips for a Great Demo

1. **Prepare**: Run through the script once before presenting
2. **Visuals**: Have Slack notifications ready to show
3. **Story**: Focus on the "42% silent erosion" narrative - it's compelling
4. **Interactive**: Let audience suggest segments to monitor
5. **Q&A**: Be ready to dive into specific drift types
6. **Next Steps**: End with clear ROI (time saved, revenue protected)

---

**Remember**: The power of Pulse is not just detecting drift, but **explaining it intelligently** and **recommending actions**. That's what makes it agentic, not just monitoring.
