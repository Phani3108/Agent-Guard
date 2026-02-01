# Aegis Support: Multi-Agent Banking System

A production-ready internal tool for care agents to analyze transactions, generate AI reports, and triage suspected fraud using a multi-agent pipeline.

## Quick Start

```bash
# Clone and start the system
git clone <repository>
cd aegis-support
docker compose up
```

The system will be available at:
- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- Metrics: http://localhost:8000/metrics
- Health Check: http://localhost:8000/health

## Architecture

### High-Level Overview
- **Frontend**: Angular 13 with TypeScript, Bootstrap Design, and NgRx state management
- **Backend**: Django 4.2+ with Django REST Framework and PostgreSQL



#### APIs
- `POST /api/ingest/transactions` - Data ingestion with idempotency
- `GET /api/customer/{id}/transactions` - Customer transaction history
- `GET /api/insights/{customerId}/summary` - AI-generated insights
- `POST /api/triage` - Fraud analysis with streaming updates
- `POST /api/action/freeze-card` - Card management with OTP
- `POST /api/action/open-dispute` - Dispute creation
- `GET /api/kb/search` - Knowledge base search
- `GET /api/evals/run` - Evaluation system

## Key Features

### Security & Compliance
- **PII Redaction**: Automatic redaction of PANs, emails, and sensitive data
- **Role-Based Access**: Agent vs Lead roles with different permissions
- **Rate Limiting**: Token bucket algorithm (5 req/s per session)
- **Idempotency**: All mutating operations support idempotency keys
- **Audit Logging**: Complete audit trail for all actions

### Performance
- **Database Optimization**: Monthly partitioning, strategic indexes
- **Caching**: Redis for sessions, rate limiting, and frequently accessed data
- **Virtual Scrolling**: Frontend handles 1M+ transactions efficiently
- **SLA Compliance**: p95 ≤ 100ms for customer transaction queries

### Observability
- **Metrics**: Prometheus-format metrics at `/metrics`
- **Logging**: Structured JSON logs with correlation IDs
- **Tracing**: Human-readable agent execution traces
- **Health Checks**: Comprehensive health monitoring

### Multi-Agent Features
- **Tool Calling**: Explicit tool execution with timeouts and retries
- **Fallbacks**: Rule-based fallbacks when AI services fail
- **Circuit Breakers**: Prevent cascade failures
- **Streaming Updates**: Real-time progress via Server-Sent Events

## Evaluation System

The system includes 12+ golden test cases covering:
1. Card freeze with OTP verification
2. Unauthorized charge dispute creation
3. Duplicate transaction explanation
4. Geo-velocity anomaly detection
5. Device change analysis
6. Chargeback history escalation
7. Risk service timeout fallback
8. Rate limiting behavior
9. Policy enforcement blocks
10. PII redaction verification
11. Knowledge base FAQ responses
12. Ambiguous merchant disambiguation

Run evaluations:
```bash
curl -X POST http://localhost:8000/api/evals/run \
  -H "X-API-Key: aegis-api-key-2024"
```

## API Authentication

All API endpoints require authentication via API key:

```bash
# Agent role (requires OTP for sensitive actions)
curl -H "X-API-Key: aegis-api-key-2024" http://localhost:8000/api/...

# Lead role (can bypass OTP)
curl -H "X-API-Key: aegis-api-key-2024_lead" http://localhost:8000/api/...
```

## Data & Fixtures

The system includes comprehensive test data:
- 20 customers with various risk profiles
- 22 payment cards with different statuses
- 22 devices with trust levels
- Sample transactions with realistic patterns
- Knowledge base with 8 documents
- 12 evaluation test cases

Generate 1M transactions for performance testing:
```bash
cd scripts
python generate_transactions.py
```

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Management
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Load fixtures
python manage.py loaddata fixtures/customers.json
```

## Production Deployment

### Environment Variables
```bash
DEBUG=0
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port/0
API_KEY=your-api-key
LEAD_API_KEY=your-lead-api-key
```

### Security Considerations
- Use strong API keys in production
- Enable HTTPS with proper certificates
- Configure Content Security Policy headers
- Set up proper firewall rules
- Regular security audits and updates

## Monitoring

### Metrics Endpoints
- `/metrics` - Prometheus-format metrics
- `/health` - Health check with dependency status

### Key Metrics
- `request_duration_ms` - API response times
- `agent_latency_ms` - Agent execution times
- `tool_call_total` - Tool success/failure rates
- `rate_limit_block_total` - Rate limiting events
- `action_blocked_total` - Policy enforcement events


## Contributing

1. Follow the established architecture patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure PII redaction for all new endpoints
5. Add metrics for new functionality
