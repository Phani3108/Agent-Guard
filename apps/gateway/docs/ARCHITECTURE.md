# Aegis Support: Multi-Agent Banking System Architecture

## System Overview

Aegis Support is a multi-agent banking system designed to help care agents analyze transactions, generate AI reports, and triage suspected fraud. The system consists of a Django backend with a multi-agent AI pipeline and an Angular 13 frontend dashboard.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Angular 13    │    │   Django API    │    │  Multi-Agent    │
│   Frontend      │◄──►│   Backend       │◄──►│   System        │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser       │    │   PostgreSQL    │    │   Redis Cache   │
│   Storage       │    │   Database      │    │   & Queue       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Architecture

### Frontend (Angular 13)
- **Dashboard**: KPIs, fraud triage table, filters
- **Customer Pages**: Transaction timeline, spend breakdown, insights
- **Alerts Queue**: Risk scoring, triage drawer
- **Evals Dashboard**: Model performance metrics
- **Triage Drawer**: Real-time agent execution with SSE

### Backend (Django)
- **API Layer**: RESTful endpoints with authentication
- **Service Layer**: Business logic and orchestration
- **Data Layer**: Models, repositories, and data access
- **Agent Layer**: Multi-agent system with tool calling

### Multi-Agent System
- **Orchestrator**: Plans and coordinates agent execution
- **Insights Agent**: Transaction analysis and categorization
- **Fraud Agent**: Risk assessment and fraud detection
- **KB Agent**: Knowledge base search and citations
- **Compliance Agent**: Policy enforcement and validation
- **Redactor**: PII scrubbing and data protection
- **Summarizer**: Report generation and documentation

## Data Flow

### Transaction Ingestion Flow
1. CSV/JSON data uploaded via `/api/ingest/transactions`
2. Data validated and deduplicated
3. Stored in partitioned PostgreSQL tables
4. Indexes updated for fast queries

### Fraud Triage Flow
1. Alert triggered for suspicious transaction
2. Orchestrator creates execution plan
3. Sub-agents execute in sequence:
   - Get customer profile
   - Analyze recent transactions
   - Assess risk signals
   - Search knowledge base
   - Make decision
   - Propose action
4. Compliance agent validates action
5. Result streamed to frontend via SSE

### Action Execution Flow
1. Agent proposes action (freeze card, open dispute, etc.)
2. Compliance agent checks policies
3. OTP validation if required
4. Action executed with audit trail
5. Status updated and notifications sent

## Technology Stack

### Backend
- **Framework**: Django 4.2+ with Django REST Framework
- **Database**: PostgreSQL with partitioning
- **Cache/Queue**: Redis
- **Authentication**: JWT with API keys
- **Monitoring**: Prometheus metrics, structured logging
- **Testing**: pytest with fixtures

### Frontend
- **Framework**: Angular 13 with TypeScript
- **UI Library**: Angular Material
- **State Management**: NgRx
- **Real-time**: Server-Sent Events (SSE)
- **Testing**: Jasmine/Karma

### Infrastructure
- **Containerization**: Docker Compose
- **Database**: PostgreSQL 14+
- **Cache**: Redis 7+
- **Monitoring**: Prometheus + Grafana (optional)

## Security Architecture

### Authentication & Authorization
- API Key authentication for backend services
- JWT tokens for frontend sessions
- Role-based access control (agent vs lead)
- OTP validation for sensitive actions

### Data Protection
- PII redaction in logs and traces
- Input sanitization and validation
- Rate limiting with token bucket
- Circuit breakers for external services

### Compliance
- Audit trails for all actions
- Policy enforcement engine
- Data retention policies
- GDPR compliance measures

## Performance Considerations

### Database Optimization
- Monthly partitioning for transactions
- Strategic indexes on customer_id, timestamp, merchant
- Connection pooling
- Query optimization

### Caching Strategy
- Redis for session data and rate limiting
- Application-level caching for frequently accessed data
- CDN for static assets

### Scalability
- Horizontal scaling with load balancers
- Database read replicas
- Microservice architecture potential

## Monitoring & Observability

### Metrics
- Agent execution latency
- Tool call success rates
- Fallback usage statistics
- Rate limiting metrics
- Action blocking metrics

### Logging
- Structured JSON logs
- Request tracing with correlation IDs
- PII redaction enforcement
- Error tracking and alerting

### Tracing
- Distributed tracing for agent workflows
- Human-readable execution traces
- Performance profiling
- Debug information for troubleshooting

## Deployment Architecture

### Development
- Docker Compose for local development
- Hot reloading for both frontend and backend
- Local PostgreSQL and Redis instances
- Mock external services

### Production
- Containerized deployment
- Load balancer with SSL termination
- Database clustering
- Redis cluster for high availability
- Monitoring and alerting stack

## Data Architecture

### Database Schema
- **Customers**: User profiles and risk flags
- **Cards**: Payment card information
- **Transactions**: Financial transactions with partitioning
- **Chargebacks**: Dispute history
- **Devices**: Device binding information
- **KB_Docs**: Knowledge base content
- **Evals**: Test cases and results

### Partitioning Strategy
- Transactions partitioned by month
- Indexes on (customer_id, timestamp DESC)
- Merchant and MCC indexes for analytics
- Archive strategy for old data

## API Design

### RESTful Endpoints
- `/api/ingest/transactions` - Data ingestion
- `/api/customer/{id}/transactions` - Customer data
- `/api/insights/{customerId}/summary` - Analytics
- `/api/triage` - Fraud analysis
- `/api/action/*` - Action execution
- `/api/kb/search` - Knowledge base
- `/api/evals/run` - Evaluation system

### Real-time Communication
- Server-Sent Events for agent progress
- WebSocket for live updates
- Polling fallback for compatibility

## Error Handling & Resilience

### Circuit Breakers
- Tool call failures trigger circuit breakers
- Fallback mechanisms for critical paths
- Graceful degradation under load

### Retry Logic
- Exponential backoff for transient failures
- Maximum retry limits
- Idempotency for safe retries

### Fallback Strategies
- Rule-based fallbacks when AI services fail
- Template-based responses
- Human escalation paths

This architecture provides a robust, scalable, and secure foundation for the Aegis Support system while maintaining high performance and observability.
