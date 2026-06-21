---
name: architecture-decisions
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >





  Architecture decision making — ADRs, monolith vs. microservices, build vs. buy, cloud selection, and making defensible technical decisions.






  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Architecture Decision Making

## Architecture Decision Records (ADRs)

### Why document decisions

Future engineers (including you in 6 months) will ask "why did they do it this way?"
Without ADRs: Decisions get relitigated endlessly or silently changed.
With ADRs: Context preserved. Decisions revisited consciously when circumstances change.

### ADR template

```markdown
# ADR-001: Use PostgreSQL as Primary Database

## Status

Accepted (2024-01-15)

## Context

We need a primary database for the application. Team evaluates PostgreSQL vs. MongoDB vs. MySQL.

## Decision

We will use PostgreSQL 16.

## Consequences

**Positive:**

- Strong ACID guarantees for financial transactions.
- JSONB support for flexible data alongside relational.
- Excellent ecosystem (Prisma, pgvector, PostGIS extensions).
- Strong on-premise and cloud provider support.

**Negative:**

- Horizontal write scaling requires more complex setup (Citus, partitioning).
- Schema migrations require careful management.

## Alternatives considered

**MongoDB:** Rejected. Our data is relational. Document model adds complexity.
**MySQL:** Good option, PostgreSQL preferred for JSON support and extensions.
```

Store ADRs in `/docs/adr/` in your repository. Number sequentially.

## Monolith vs. Microservices

### Start monolith

**For most products:** Monolith first, always.
Microservices problems: Network latency, distributed transactions, deployment complexity, service discovery, observability, eventual consistency.
Monolith benefits: Simple deployment, easy debugging, refactoring possible, no network calls for internal operations.

**When to split:**

- Team > 50 engineers struggling to coordinate deployments.
- Specific service needs dramatically different scaling.
- Compliance isolation required (e.g., payment processing).
- Service owned by completely independent team.

**Right migration path:**
Modular monolith (internal modules with clean interfaces) → Extract module to service when justified.

## Build vs. Buy decision matrix

| Consideration              | Build                           | Buy                |
| -------------------------- | ------------------------------- | ------------------ |
| Core competitive advantage | ✅ Build                        | ❌ Avoid           |
| Commodity functionality    | ❌ Wasteful                     | ✅ Buy             |
| Team expertise             | Has it                          | Lacks it           |
| Time to market             | Long                            | Short              |
| Total cost                 | Long-term cheaper if high usage | Short-term cheaper |
| Customization need         | High                            | Low                |

**Rule:** Buy commodity infrastructure; build differentiated product.
Buy: Auth (Clerk), payments (Stripe), email (Resend), observability (Datadog), queues (SQS).
Build: your core product logic.

## Cloud selection

**AWS:** Broadest service catalog. Most enterprise-ready. Steeper learning curve.
**GCP:** Best AI/ML services. Kubernetes (GKE). BigQuery for data.
**Azure:** If your customers are Microsoft shops. Active Directory integration.
**Vercel/Railway/Render:** For product teams who want to ship, not manage infrastructure.

**Decision:** Use managed services wherever possible. Your value is in product, not infrastructure.

## The scaling conversation

**Pre-100 users:** Don't optimize for scale. Ship features.
**100-10,000 users:** Add indexes, fix N+1 queries, add caching where hot.
**10,000-100,000:** CDN, Redis caching, read replicas, optimize expensive queries.
**100,000+:** Depends entirely on your architecture and bottlenecks. Measure first.

Sources: Martin Fowler architecture patterns (martinfowler.com — free), Michael Nygard "Release It!" (principles), Designing Data-Intensive Applications (Kleppmann — principles), ADR GitHub organization (adr.github.io — free)
