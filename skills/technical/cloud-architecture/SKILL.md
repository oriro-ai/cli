---
name: cloud-architecture
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >

  Cloud architecture — serverless, containers, managed services, cost optimization, availability, and cloud design patterns.



  Sources: Technical documentation, public guidelines, industry best practices.
---

# Cloud Architecture

## Serverless vs. containers vs. VMs

|                | Serverless                     | Containers                   | VMs                |
| -------------- | ------------------------------ | ---------------------------- | ------------------ |
| **Startup**    | Cold starts (ms-s)             | Fast (ms)                    | Slow (min)         |
| **Scale**      | 0 to ∞ automatically           | Scale to preset max          | Manual or auto     |
| **Cost model** | Per invocation                 | Per running container        | Per hour running   |
| **Management** | None                           | Some                         | Most               |
| **Best for**   | Event-driven, variable traffic | Stateful apps, microservices | Legacy, compliance |

## Serverless patterns (AWS Lambda / Cloud Run / Vercel Functions)

**When to use:**

- Intermittent or unpredictable traffic
- Event-driven workloads (file uploads, webhooks)
- APIs that scale to zero (dev/staging environments)

**When NOT to use:**

- Persistent connections (WebSockets)
- Long-running jobs (> 15 min for Lambda)
- Workloads where cold start latency is unacceptable

**Cold start mitigation:** Provisioned concurrency (Lambda), minimum instances (Cloud Run), ping-based warming.

## Key design principles

### High availability

**Multi-AZ deployment:** Replicate across availability zones. Single zone outage (common) = no downtime.
**Health checks + auto-replacement:** Load balancer removes unhealthy instances. Auto-scaling replaces them.
**Circuit breakers:** When a downstream service is unhealthy, stop calling it. Fail fast. Retry with backoff.

### Stateless design

Applications should be stateless — any instance can handle any request.
State stored in: Database, Redis, S3 — NOT in application memory.
Enables: Horizontal scaling, easy replacement of instances.

### Database patterns for cloud

**Managed databases:** RDS, Cloud SQL, Aurora, PlanetScale. Handles backups, patching, failover.
**Read replicas:** Scale reads. Primary handles writes.
**Connection pooling (critical):** PgBouncer or Prisma Data Proxy. Lambda functions must use connection pooling (each invocation opens a new connection otherwise → connection exhaustion).
**Multi-region:** Active-active (complex) or active-passive (simpler, some recovery time).

## Cost optimization

### Right-sizing

Start with the smallest instance that meets performance requirements.
Benchmark first. Scale when metrics show the need.
Reserved instances (1-3 year commitment) for predictable base load: 30-60% savings vs. on-demand.
Spot instances for fault-tolerant batch workloads: 70-90% savings.

### Storage tiering

S3 Intelligent-Tiering: Automatically moves objects to cheaper storage based on access patterns.
Archive cold data to Glacier ($0.004/GB vs $0.023/GB Standard).
Delete what you don't need (surprising how often this is forgotten).

### Architecture for cost

CDN + static assets: Serve from CDN, not from compute.
Background jobs: Use spot instances or serverless for async work.
Caching: Redis reduces database calls and compute.

Sources: AWS Well-Architected Framework (aws.amazon.com/architecture/well-architected — free), GCP best practices (cloud.google.com/architecture — free), Azure Architecture Center (free), Cloudflare architecture blog (free)
