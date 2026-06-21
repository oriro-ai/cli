# Architecture Patterns Reference

## CHOOSING AN ARCHITECTURE PATTERN

| Pattern                      | When to Use                                             | Scale       | Complexity |
| ---------------------------- | ------------------------------------------------------- | ----------- | ---------- |
| Modular Monolith             | MVP, small team, <100k users                            | Low-Medium  | Low        |
| Microservices                | Domain-separated teams, high scale, independent deploys | High        | High       |
| Event-Driven                 | Async workflows, audit trails, loose coupling needed    | Medium-High | Medium     |
| Serverless                   | Spiky traffic, low ops overhead, event triggers         | Medium      | Low-Medium |
| CQRS + Event Sourcing        | Audit requirements, complex domain, financial systems   | High        | Very High  |
| Hexagonal (Ports & Adapters) | Testability, framework independence, long-lived systems | Any         | Medium     |

**Default recommendation for solo-founder SaaS:** Modular Monolith → extract services when a module needs independent scaling or deployment. Do NOT start with microservices.

---

## CORE SYSTEM COMPONENTS

### API Layer

- REST (default): OpenAPI 3.0 spec first, code second
- GraphQL: When client needs flexible querying (BFF pattern)
- gRPC: Internal service-to-service, streaming, polyglot environments
- WebSockets: Real-time features (presence, live updates, notifications)

### Database Selection

```
Relational (PostgreSQL):     Default. ACID, complex queries, foreign keys.
Document (MongoDB):          Flexible schema, nested documents, content systems.
Time-Series (TimescaleDB):   Metrics, IoT, financial tick data.
Graph (Neo4j):               Relationship traversal, fraud networks, recommendations.
Cache (Redis):               Session store, rate limiting, pub/sub, leaderboards.
Search (Elasticsearch):      Full-text search, log aggregation, analytics.
Warehouse (BigQuery):        Analytical queries, historical data, BI.
Vector (pgvector/Pinecone):  ML embeddings, semantic search, RAG systems.
```

### Caching Strategy

1. Browser cache (static assets, CDN) — free performance
2. CDN edge cache (API responses, HTML) — Cloudflare Rules
3. Application cache (Redis) — session, computed results, rate limit counters
4. Database query cache — PostgreSQL `pg_stat_statements`, connection pooling (PgBouncer)

### Message Queue / Event Bus

- Redis Streams: Simple, low-ops, great for small-medium scale
- GCP Pub/Sub / AWS SQS: Managed, scales to millions of messages, dead-letter queues
- Apache Kafka: High throughput, replay, strict ordering, complex topologies
- RabbitMQ: Complex routing, priority queues, enterprise patterns

---

## SCALABILITY DECISIONS

### Vertical vs Horizontal

- **Start vertical** (bigger instance) — simpler, cheaper at low scale
- **Go horizontal** when: CPU/memory consistently >70%, or need 99.9%+ uptime
- **Stateless services** always → enables horizontal scaling trivially

### Database Scaling Path

```
Stage 1: Single primary (0-10k users)
Stage 2: Read replicas (10k-100k users, read-heavy)
Stage 3: Connection pooling + query optimization (100k-500k)
Stage 4: Partitioning / sharding (500k+ or data >1TB)
Stage 5: CQRS + separate read/write models (complex domains)
```

### Multi-Region Strategy

- Primary region: Where most users are
- DR region: Hot standby (async replication, RTO <15min)
- Edge caching: CDN for static + semi-static content globally
- Data residency: Know your compliance requirements BEFORE multi-region

---

## API DESIGN STANDARDS

### REST Conventions

```
GET    /resources          → list (paginated)
GET    /resources/:id      → single item
POST   /resources          → create
PUT    /resources/:id      → full update (idempotent)
PATCH  /resources/:id      → partial update
DELETE /resources/:id      → soft delete (set deleted_at)

Response envelope:
{
  "data": {...},
  "meta": { "page": 1, "total": 100 },
  "error": null
}

Error format:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [...]
  }
}
```

### Versioning

- URL versioning (`/v1/`, `/v2/`) for major breaking changes
- Header versioning (`API-Version: 2024-01`) for minor changes
- Never break existing API contracts without a deprecation period

---

## OBSERVABILITY STACK

### The Three Pillars

1. **Logs:** Structured JSON logs (not strings). Include: trace_id, user_id, duration_ms, status
2. **Metrics:** RED method — Rate, Errors, Duration. Plus USE for infra (Utilization, Saturation, Errors)
3. **Traces:** Distributed tracing across service boundaries. OpenTelemetry standard.

### Tooling

- **GCP:** Cloud Logging + Cloud Trace + Cloud Monitoring (native, zero config on Cloud Run)
- **AWS:** CloudWatch Logs + X-Ray + CloudWatch Metrics
- **Self-hosted:** Grafana + Loki (logs) + Tempo (traces) + Prometheus (metrics)
- **SaaS:** Datadog (expensive, powerful), Honeycomb (traces-first), Axiom (affordable logs)

### Alerting Principles

- Alert on symptoms, not causes (high error rate > high CPU)
- Every alert must have a runbook
- PagerDuty / OpsGenie for on-call routing
- SLO-based alerting (error budget burn rate alerts)

---

## DATA ARCHITECTURE

### ETL / Data Pipeline

```
Source → Ingest → Transform → Load → Serve

Tools:
  Ingest:    Kafka Connect, Airbyte, Fivetran, custom scripts
  Transform: dbt (SQL-based, version-controlled), Spark, Pandas
  Warehouse: BigQuery, Snowflake, Redshift
  Serve:     Looker, Metabase, Superset, custom API
```

### Data Modeling Approaches

- **OLTP (operational):** 3NF normalization. Fast writes, consistent reads.
- **OLAP (analytical):** Star schema or wide tables. Fast reads, accept redundancy.
- **Lakehouse:** Raw zone → Silver (cleaned) → Gold (aggregated). Delta Lake / Iceberg format.

---

## SECURITY ARCHITECTURE

### Zero Trust Principles

1. Never trust network location — authenticate everything
2. Least privilege on every resource
3. Assume breach — design for detection and containment

### Threat Modeling (STRIDE)

- **S**poofing → Auth controls, MFA
- **T**ampering → Input validation, checksums, audit logs
- **R**epudiation → Immutable audit logs, signed tokens
- **I**nformation Disclosure → Encryption at rest + transit, PII masking in logs
- **D**enial of Service → Rate limiting, circuit breakers, auto-scaling
- **E**levation of Privilege → RBAC, row-level security, capability-based access

### Compliance Flags (Raise These Early)

- PII data → GDPR (EU), CCPA (CA), India PDPB
- Financial data → PCI DSS, SOX, RBI IT Framework
- Healthcare → HIPAA, HITECH
- Government → FedRAMP, FISMA, CMMC

---

## REAL-TIME SYSTEMS

### Technology Selection

```
WebSockets:    Full-duplex, persistent connection. Use for: chat, live dashboards, collaborative editing, gaming.
SSE:           Server-Sent Events — one-way server push. Use for: live feeds, notifications, progress bars.
               Simpler than WebSockets, works over HTTP/2, auto-reconnect built-in.
Long Polling:  Fallback for restrictive firewalls. Higher latency. Avoid if possible.
gRPC Stream:   Bi-directional streaming for service-to-service. Not for browsers.
Kafka/Pub-Sub: Async event streaming. Not real-time to client — use for backend event pipelines.
```

### WebSocket Architecture (Production)

```
Client → Load Balancer (sticky sessions) → WebSocket Server → Redis Pub/Sub ← Other WS Servers

Sticky sessions required: WebSocket connections are stateful, must stay on same server.
Redis Pub/Sub: Broadcast messages across multiple server instances.
Heartbeat: Ping every 30s, close connection if no pong after 10s (detect zombie connections).
Reconnection: Client-side exponential backoff: 1s, 2s, 4s, 8s, max 30s.
Auth: JWT in connection upgrade handshake, not in each message.
```

### SSE Implementation

```typescript
// Next.js 14 App Router SSE
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Subscribe to Redis channel
      const sub = redis.duplicate();
      await sub.subscribe("fraud-alerts", (message) => send(JSON.parse(message)));

      // Cleanup when client disconnects
      request.signal.addEventListener("abort", () => {
        sub.unsubscribe();
        sub.quit();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Event Streaming (Kafka Production Patterns)

```
Topic naming:     domain.entity.event  (e.g., payments.transaction.created)
Partitioning:     Partition by entity ID (user_id, org_id) — guarantees ordering per entity
Retention:        7 days default. Longer for audit trail use cases.
Consumer groups:  One per downstream service. Each service gets all events independently.
Schema registry:  Avro or Protobuf schemas. Enforce contracts at schema registry level.
Dead letter:      Failed messages → DLT (dead letter topic) → alert + manual review queue
Idempotency:      Consumer must handle duplicate delivery (at-least-once semantics)
                  Use unique event ID + "processed_events" table to deduplicate.

Kafka vs Pub/Sub vs SQS:
  Kafka:    Self-managed, replay, strict ordering, high throughput. Complex ops.
  Pub/Sub:  GCP managed, scales to millions/s, no replay by default. Simple ops.
  SQS:      AWS managed, exactly-once (FIFO queues), simple. No fan-out natively.
```
