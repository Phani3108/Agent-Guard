# Architecture Decision Records (ADR)

## ADR-001: Django Backend Framework
**Decision**: Use Django 4.2+ with Django REST Framework for the backend API
**Rationale**: 
- Django provides excellent ORM, admin interface, and security features out of the box
- Django REST Framework offers robust API development with authentication, serialization, and testing
- Strong ecosystem for financial applications with built-in security features
- Excellent PostgreSQL integration and performance optimization tools

## ADR-002: Angular 13 Frontend Framework
**Decision**: Use Angular 13 with TypeScript for the frontend
**Rationale**:
- Angular provides enterprise-grade structure and tooling
- Strong TypeScript support for type safety
- Excellent component architecture for complex dashboards
- Built-in dependency injection and testing framework
- Angular Material for consistent UI components

## ADR-003: PostgreSQL with Monthly Partitioning
**Decision**: Use PostgreSQL with monthly partitioning for transaction data
**Rationale**:
- PostgreSQL handles large datasets efficiently with partitioning
- Monthly partitions allow for efficient querying and maintenance
- Indexes on (customer_id, timestamp DESC) provide fast lookups
- Partition pruning improves query performance significantly
- Easy to implement archive strategies for old data

## ADR-004: Redis for Caching and Rate Limiting
**Decision**: Use Redis for session storage, rate limiting, and short-term caching
**Rationale**:
- Redis provides fast in-memory operations for rate limiting
- Token bucket algorithm implementation for rate limiting
- Session storage for user authentication
- Work queue for background tasks
- Pub/Sub for real-time notifications

## ADR-005: Multi-Agent Architecture with Tool Calling
**Decision**: Implement a multi-agent system with explicit tool calling and orchestration
**Rationale**:
- Explicit tool calling provides better control and debugging
- Orchestrator pattern allows for complex workflow management
- Sub-agents can be specialized and tested independently
- Tool calling enables better observability and tracing
- Fallback mechanisms can be implemented at the tool level

## ADR-006: Server-Sent Events (SSE) for Real-time Updates
**Decision**: Use SSE instead of WebSockets for agent progress streaming
**Rationale**:
- SSE is simpler to implement and debug
- Unidirectional communication fits the use case (server to client)
- Better browser compatibility and automatic reconnection
- Lower overhead compared to WebSockets
- Easier to implement with Django's streaming responses

## ADR-007: Rule-based Fallbacks with Optional LLM
**Decision**: Implement deterministic rule-based fallbacks with optional LLM enhancement
**Rationale**:
- Ensures system works offline and without external dependencies
- Provides consistent, predictable results for testing
- LLM can be toggled on/off for enhanced responses
- Fallbacks prevent system failures when AI services are unavailable
- Easier to debug and validate results

## ADR-008: PII Redaction at Multiple Layers
**Decision**: Implement PII redaction in logs, traces, and UI with multiple validation layers
**Rationale**:
- Financial data requires strict PII protection
- Multiple layers ensure no PII leaks even if one layer fails
- Redaction patterns for PANs (13-19 digits) and email addresses
- Audit trail shows redaction was applied (masked=true flag)
- Compliance with financial regulations and GDPR

## ADR-009: Idempotency Keys for All Mutating Operations
**Decision**: Require idempotency keys for ingestion and action endpoints
**Rationale**:
- Prevents duplicate processing of the same request
- Critical for financial operations where duplicates could cause issues
- Idempotency-Key header enforced at the API level
- Returns same result for duplicate requests
- Improves system reliability and user experience

## ADR-010: Circuit Breakers with Exponential Backoff
**Decision**: Implement circuit breakers with exponential backoff for tool calls
**Rationale**:
- Prevents cascade failures when external services are down
- Exponential backoff reduces load on failing services
- Circuit breaker opens after 3 consecutive failures
- 30-second cooldown period before retry
- Graceful degradation with fallback mechanisms

## ADR-011: Docker Compose for Local Development
**Decision**: Use Docker Compose for local development environment
**Rationale**:
- Consistent development environment across team members
- Easy setup with single command (docker compose up)
- Includes all dependencies (PostgreSQL, Redis, services)
- Production-like environment for testing
- Simplified onboarding for new developers

## ADR-012: Structured JSON Logging with Correlation IDs
**Decision**: Use structured JSON logging with request correlation IDs
**Rationale**:
- Structured logs enable better searching and analysis
- Correlation IDs allow tracing requests across services
- JSON format is machine-readable and tool-friendly
- Consistent log format across all services
- Easy integration with log aggregation systems

## ADR-013: Role-based Access Control (RBAC)
**Decision**: Implement simple RBAC with "agent" and "lead" roles
**Rationale**:
- Leads can force actions without OTP (still logged for audit)
- Agents require OTP for sensitive operations
- Simple two-role system reduces complexity
- Clear separation of permissions
- Audit trail for all actions regardless of role

## ADR-014: Virtual Scrolling for Large Data Sets
**Decision**: Use virtual scrolling for tables with >2k rows
**Rationale**:
- Maintains performance with large transaction datasets
- Reduces memory usage and DOM nodes
- Better user experience with smooth scrolling
- Angular CDK Virtual Scrolling provides this functionality
- Essential for handling 1M+ transaction records

## ADR-015: Template-based Fallback Responses
**Decision**: Use template-based fallbacks for agent responses when AI services fail
**Rationale**:
- Provides consistent, professional responses
- No dependency on external AI services
- Templates can be customized for different scenarios
- Easier to maintain and update
- Ensures system always provides useful information

## ADR-016: Metrics Collection with Prometheus Format
**Decision**: Expose metrics in Prometheus format at /metrics endpoint
**Rationale**:
- Standard format for monitoring and alerting
- Easy integration with monitoring systems
- Rich metric types (counters, histograms, gauges)
- Industry standard for observability
- Enables comprehensive system monitoring

## ADR-017: Evaluation System with Golden Test Cases
**Decision**: Implement comprehensive evaluation system with 12+ golden test cases
**Rationale**:
- Ensures system behavior is consistent and correct
- Golden test cases cover critical fraud scenarios
- Automated evaluation prevents regressions
- Provides confidence in system reliability
- Enables continuous improvement of agent performance

## ADR-018: Content Security Policy (CSP) for Frontend
**Decision**: Implement strict CSP headers for frontend pages
**Rationale**:
- Prevents XSS attacks and data injection
- Disallows unsafe-inline for pages with customer data
- Enhances security for financial application
- Compliance with security best practices
- Protects against malicious script execution

## ADR-019: Database Indexing Strategy
**Decision**: Create strategic indexes on (customer_id, timestamp DESC), (merchant), (mcc)
**Rationale**:
- Optimizes most common query patterns
- (customer_id, timestamp DESC) for customer transaction history
- (merchant) for merchant-based analysis
- (mcc) for category-based insights
- Composite indexes for complex queries
- Balances query performance with write performance

## ADR-020: Rate Limiting with Token Bucket Algorithm
**Decision**: Implement rate limiting using token bucket algorithm
**Rationale**:
- Allows burst traffic while maintaining average rate limits
- 5 requests per second per session limit
- Returns 429 with retryAfterMs for proper client handling
- Prevents abuse and ensures fair resource usage
- Industry standard approach for API rate limiting
