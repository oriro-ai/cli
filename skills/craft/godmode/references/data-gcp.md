# Data & GCP Expert Reference — PostgreSQL, Prisma, Cloud SQL, Schedulers

## Table of Contents

1. [PostgreSQL 15/16 Expert Tier](#1-postgresql-1516-expert-tier)
2. [Prisma ORM 5.x Deep Reference](#2-prisma-orm-5x-deep-reference)
3. [Cloud SQL Configuration](#3-cloud-sql-configuration)
4. [Connection Pooling & Management](#4-connection-pooling--management)
5. [Zero-Downtime Migrations](#5-zero-downtime-migrations)
6. [Data Modeling for Fintech](#6-data-modeling-for-fintech)
7. [Cloud Scheduler — All 61 Jobs](#7-cloud-scheduler--all-61-jobs)
8. [BigQuery & Analytics](#8-bigquery--analytics)
9. [Backup, PITR & Disaster Recovery](#9-backup-pitr--disaster-recovery)
10. [Performance & Monitoring](#10-performance--monitoring)
11. [Row-Level Security & Multi-Tenancy](#11-row-level-security--multi-tenancy)
12. [Pub/Sub & Event-Driven Architecture](#12-pubsub--event-driven-architecture)
13. [GCP Secret Manager Operations](#13-gcp-secret-manager-operations)
14. [<project> DB Schema Reference](#14-<project>-db-schema-reference)

---

## 1. PostgreSQL 15/16 Expert Tier

**PostgreSQL 15 highlights relevant to <project>:**

- `MERGE` statement (upsert with conditions)
- `row_pattern_recognition` — for fraud pattern detection in sequences
- Improved JSON path queries
- Logical replication improvements for Cloud SQL cross-region replicas

**PostgreSQL 16 highlights:**

- Parallel query improvements
- `pg_stat_io` — detailed I/O statistics
- Logical replication from standbys
- `to_char()` improvements

**Index types and when to use each:**
| Type | Use case |
|------|---------|
| B-tree (default) | Equality, range, sorting — general purpose |
| GIN | JSONB containment, array operators, full-text search |
| GiST | Geometric data, full-text, exclusion constraints |
| BRIN | Very large tables with naturally ordered data (time-series, logs) |
| Hash | Equality only, faster than B-tree for large equals lookups |
| Partial | Index only rows matching a WHERE clause (e.g., active records only) |

**<project> critical indexes:**

```sql
-- ACH challenges: frequent lookup by userId + status
CREATE INDEX CONCURRENTLY idx_ach_challenge_user_status
  ON "AchChallenge"("userId", "status", "createdAt" DESC);

-- UPI fraud checks: lookup by VPA + time window
CREATE INDEX CONCURRENTLY idx_upi_fraud_vpa_created
  ON "UpiFraudCheck"("vpa", "createdAt" DESC);

-- Unit accounts: lookup by userId
CREATE INDEX CONCURRENTLY idx_unit_account_user
  ON "UnitAccount"("userId") WHERE "active" = true;

-- Guardian devices: lookup by userId
CREATE INDEX CONCURRENTLY idx_guardian_device_user
  ON "GuardianDevice"("userId", "lastSeen" DESC);

-- Threat intelligence: full-text search on threat content
CREATE INDEX CONCURRENTLY idx_threat_content_fts
  ON "Threat" USING GIN(to_tsvector('english', "content"));
```

**EXPLAIN ANALYZE — reading query plans:**

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM "AchChallenge"
WHERE "userId" = 'user_id' AND "status" = 'PENDING';
```

Key metrics:

- `Seq Scan` → needs an index
- `Index Scan` → good
- `Bitmap Heap Scan` → good for range queries
- `rows=X (actual X)` → large discrepancy = stale statistics → `ANALYZE tablename`

**VACUUM and autovacuum:**
Cloud SQL runs autovacuum by default. Monitor bloat:

```sql
SELECT relname, n_dead_tup, n_live_tup,
  round(n_dead_tup::numeric/nullif(n_live_tup,0)*100, 2) as dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

If dead_pct > 10% on hot tables: `VACUUM ANALYZE tablename;`

**JSONB operations for <project> threat data:**

```sql
-- Query JSONB field
SELECT * FROM "ThreatFeed" WHERE "metadata"->>'severity' = 'HIGH';

-- Update JSONB field
UPDATE "ThreatFeed"
SET "metadata" = "metadata" || '{"reviewed": true}'::jsonb
WHERE id = 'feed_id';

-- JSONB array contains
SELECT * FROM "ThreatFeed" WHERE "tags" @> '["ransomware"]'::jsonb;

-- Index for JSONB containment
CREATE INDEX CONCURRENTLY idx_threat_metadata_gin
  ON "ThreatFeed" USING GIN("metadata");
```

---

## 2. Prisma ORM 5.x Deep Reference

**Prisma 5 key features:**

- Faster query engine (Rust-based)
- `prismaSchemaFolder` for multi-file schemas
- `jsonProtocol` for edge/Cloudflare Workers
- `relationJoins` preview feature for JOIN-based queries (vs N+1)
- Typed SQL (`prisma/sql/` directory for raw SQL with types)

**Schema best practices:**

```prisma
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["relationJoins", "typedSql"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // for migrations (bypasses pgBouncer)
}

// Audit trail mixin pattern
model AchChallenge {
  id          String   @id @default(cuid())
  userId      String
  status      ChallengeStatus @default(PENDING)
  options     String[] // ["3", "7", "9"]
  correctOption String
  attempts    Int      @default(0)
  expiresAt   DateTime
  resolvedAt  DateTime?
  webhookSent Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])

  @@index([userId, status])
  @@index([expiresAt]) // for cleanup scheduler
}

enum ChallengeStatus {
  PENDING
  APPROVED
  DECLINED
  EXPIRED
  LOCKED
}
```

**Transaction patterns:**

```typescript
// Interactive transaction (multiple operations, rollback on error)
const result = await prisma.$transaction(
  async (tx) => {
    const challenge = await tx.achChallenge.update({
      where: { id: challengeId },
      data: { status: "APPROVED", resolvedAt: new Date() },
    });

    await tx.achAuditLog.create({
      data: { challengeId, action: "APPROVED", userId },
    });

    return challenge;
  },
  {
    timeout: 10000, // 10 second timeout
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  },
);
```

**Batch operations (better performance):**

```typescript
// createMany — single INSERT with multiple rows
await prisma.threatFeed.createMany({
  data: threats,
  skipDuplicates: true,
});

// updateMany — single UPDATE
await prisma.achChallenge.updateMany({
  where: { status: "PENDING", expiresAt: { lt: new Date() } },
  data: { status: "EXPIRED" },
});

// deleteMany with limit (safer for large deletes)
await prisma.$executeRaw`
  DELETE FROM "AchChallenge" 
  WHERE id IN (
    SELECT id FROM "AchChallenge" 
    WHERE "createdAt" < NOW() - INTERVAL '90 days'
    LIMIT 1000
  )
`;
```

**Pagination (cursor-based for large datasets):**

```typescript
// First page
const firstPage = await prisma.achChallenge.findMany({
  take: 20,
  orderBy: { createdAt: "desc" },
});

// Next page (cursor pagination — no offset drift)
const nextPage = await prisma.achChallenge.findMany({
  take: 20,
  skip: 1, // skip the cursor itself
  cursor: { id: lastId },
  orderBy: { createdAt: "desc" },
});
```

**Raw SQL with type safety (Prisma 5 typedSql):**

```sql
-- prisma/sql/getActiveChallenges.sql
SELECT ac.*, u.email FROM "AchChallenge" ac
JOIN "User" u ON ac."userId" = u.id
WHERE ac.status = $1 AND ac."expiresAt" > NOW()
ORDER BY ac."createdAt" DESC
LIMIT $2;
```

```typescript
import { getActiveChallenges } from "@prisma/client/sql";
const challenges = await prisma.$queryRawTyped(getActiveChallenges("PENDING", 50));
```

**Connection management in Cloud Run:**

```typescript
// Singleton pattern — critical for Cloud Run (multiple instances)
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Prisma migration commands:**

```bash
# Create migration (development)
npx prisma migrate dev --name add_unit_account

# Apply migrations (production — use in Cloud Build/deployment)
npx prisma migrate deploy

# Reset DB (development only — destroys all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# Generate Prisma client after schema change
npx prisma generate

# Introspect existing DB (for legacy schemas)
npx prisma db pull

# Push schema without migration (for rapid prototyping)
npx prisma db push
```

**Never run `prisma migrate dev` in production.** Always use `prisma migrate deploy`.

---

## 3. Cloud SQL Configuration

**<project> Cloud SQL:**

- Instance: Cloud SQL PostgreSQL 15 (check Console for exact version)
- Primary: us-central1
- Read replicas: us-east1, asia-south1
- GCP project: <gcp-project>

**Connection string format:**

```
postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

**Cloud SQL with Cloud Run — authentication options:**

**Option 1: Cloud SQL Auth Proxy (recommended for production):**

- Uses IAM authentication, no password needed
- Socket-based connection: `/cloudsql/PROJECT:REGION:INSTANCE`
- URL format: `postgresql://user@localhost/db?host=/cloudsql/PROJECT:REGION:INSTANCE`

**Option 2: Private IP (Cloud Run VPC Connector):**

- Cloud Run → VPC Connector → Cloud SQL private IP
- Requires VPC connector setup (additional cost)

**Option 3: SSL with public IP (current <project> setup):**

- `?sslmode=require` in DATABASE_URL
- Cloud SQL uses SSL certificates for secure connections
- IP is whitelisted or Cloud SQL Auth Proxy handles auth

**Instance settings to check/optimize:**

- Max connections: default varies by tier (db-standard-1 = 100, db-standard-2 = 200)
- Recommended max connections = (RAM in GB × 100) - 10 reserved
- Storage auto-increase: ON (prevents instance going read-only when disk fills)
- Maintenance window: choose low-traffic time (e.g., Sunday 3am UTC)
- High availability: enable for production (standby in same region, failover ~30s)

**Viewing current connections:**

```sql
SELECT count(*), state, wait_event_type, wait_event
FROM pg_stat_activity
GROUP BY state, wait_event_type, wait_event
ORDER BY count DESC;
```

**Connection limits by Cloud SQL tier:**
| Tier | vCPUs | RAM | Max connections |
|------|-------|-----|-----------------|
| db-f1-micro | shared | 0.6GB | 25 |
| db-g1-small | shared | 1.7GB | 100 |
| db-standard-1 | 1 | 3.75GB | 100 |
| db-standard-2 | 2 | 7.5GB | 200 |
| db-standard-4 | 4 | 15GB | 400 |

---

## 4. Connection Pooling & Management

**Problem with Cloud Run + Prisma:**
Each Cloud Run instance creates a Prisma client with connection pool.
Cloud Run can spin up many instances → can exhaust PostgreSQL max connections.

**Solution 1: PgBouncer (recommended for production at scale):**
Deploy PgBouncer as a Cloud Run sidecar or separate service.

- Transaction pooling: most efficient for API servers
- One PgBouncer handles 1000s of app connections → 10-50 DB connections

**Solution 2: Prisma Data Proxy / Accelerate (managed):**
Prisma's managed connection pooler.

```typescript
// Install: npm install @prisma/extension-accelerate
import { withAccelerate } from "@prisma/extension-accelerate";
const prisma = new PrismaClient().$extends(withAccelerate());
```

**Solution 3: Reduce Prisma pool size (immediate fix for <project>):**

```
DATABASE_URL="postgresql://...?connection_limit=5&pool_timeout=20"
```

- `connection_limit`: max connections per Prisma instance
- `pool_timeout`: seconds to wait for connection before error
- With 10 Cloud Run instances × 5 connections = 50 total connections (safe)

**Cloud Run recommended settings:**

```
Max instances: 10 (prevents connection exhaustion)
Min instances: 1 (keeps one warm for fast response)
Concurrency: 80 (requests per instance)
connection_limit in DATABASE_URL: 5
```

**Detecting connection exhaustion:**

```sql
SELECT count(*) FROM pg_stat_activity;
-- If close to max_connections: connection pool is exhausted
-- Check: SHOW max_connections;
```

**PgBouncer configuration (transaction mode):**

```ini
[databases]
<project> = host=CLOUD_SQL_HOST port=5432 dbname=<project>

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
server_idle_timeout = 600
```

---

## 5. Zero-Downtime Migrations

**Expand-Contract pattern (for columns that need type changes or renames):**

**Phase 1 — Expand (add new, keep old):**

```sql
ALTER TABLE "User" ADD COLUMN "phoneNumberNew" TEXT;
```

**Phase 2 — Migrate data (backfill):**

```sql
UPDATE "User" SET "phoneNumberNew" = "phoneNumber"
WHERE "phoneNumberNew" IS NULL AND "phoneNumber" IS NOT NULL;
-- Do in batches to avoid lock:
-- UPDATE "User" SET "phoneNumberNew" = "phoneNumber"
-- WHERE id IN (SELECT id FROM "User" WHERE "phoneNumberNew" IS NULL LIMIT 1000)
```

**Phase 3 — Deploy code using new column:**
Application reads both columns, writes to both.

**Phase 4 — Contract (drop old column):**

```sql
ALTER TABLE "User" DROP COLUMN "phoneNumber";
```

**Safe migration operations (no table lock):**

- `ADD COLUMN` (without default) ✅
- `ADD COLUMN ... DEFAULT NULL` ✅
- `ADD INDEX CONCURRENTLY` ✅
- `DROP INDEX CONCURRENTLY` ✅
- `CREATE TABLE` ✅
- `DROP TABLE` ✅
- Rename with multiple deployments ✅

**Dangerous migration operations (cause table lock):**

- `ADD COLUMN ... DEFAULT non-null` on large table ⚠️ (rewrites table)
- `ALTER COLUMN TYPE` on existing data ⚠️
- `ADD CONSTRAINT` without `NOT VALID` ⚠️
- `DROP COLUMN` (but usually fast) ⚠️

**Adding NOT NULL column safely:**

```sql
-- Step 1: Add nullable
ALTER TABLE "AchChallenge" ADD COLUMN "bankCode" TEXT;
-- Step 2: Backfill
UPDATE "AchChallenge" SET "bankCode" = 'UNKNOWN' WHERE "bankCode" IS NULL;
-- Step 3: Add constraint (use NOT VALID to skip scan)
ALTER TABLE "AchChallenge" ALTER COLUMN "bankCode" SET NOT NULL;
```

**Prisma migration for zero-downtime:**
Create the migration SQL manually to use CONCURRENTLY:

```bash
npx prisma migrate dev --create-only --name add_bank_code
# Edit the generated SQL to add CONCURRENTLY
npx prisma migrate deploy
```

---

## 6. Data Modeling for Fintech

**Core entities for <project>:**

**Users and accounts:**

```prisma
model User {
  id             String    @id @default(cuid())
  email          String    @unique
  emailVerified  DateTime?
  phone          String?
  region         String    @default("US") // "US" | "IN"
  kycStatus      KycStatus @default(PENDING)
  lockoutUntil   DateTime?
  failedAttempts Int       @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  achChallenges  AchChallenge[]
  unitAccount    UnitAccount?
  upiAccounts    UpiLinkedAccount[]
  guardianDevices GuardianDevice[]

  @@index([email])
  @@index([phone])
}
```

**Immutable audit trail (append-only, never update):**

```prisma
model TransactionAuditLog {
  id          String   @id @default(cuid())
  userId      String
  eventType   String   // "ACH_APPROVED" | "UPI_BLOCKED" | "GUARDIAN_ALERT"
  entityId    String   // challengeId, transactionId
  entityType  String   // "AchChallenge" | "UpiTransaction"
  metadata    Json     // full snapshot of event data
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
  @@index([entityId])
  // NO updatedAt — this table is append-only
}
```

**Soft deletes (never hard-delete financial records):**

```prisma
model UnitAccount {
  id              String    @id @default(cuid())
  userId          String    @unique
  unitCustomerId  String    @unique
  unitAccountId   String    @unique
  routingNumber   String
  accountNumber   String    // encrypted at rest
  nickname        String?
  status          String    @default("ACTIVE")
  active          Boolean   @default(true)
  deletedAt       DateTime? // soft delete
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Idempotency keys (prevent duplicate transactions):**

```prisma
model IdempotencyKey {
  id           String   @id @default(cuid())
  key          String   @unique // UUID from client
  operation    String   // "ACH_CHALLENGE" | "UPI_PAYMENT"
  response     Json?    // cached response
  createdAt    DateTime @default(now())
  expiresAt    DateTime // TTL: 24 hours

  @@index([key])
  @@index([expiresAt]) // for cleanup
}
```

**Fraud signal modeling:**

```prisma
model FraudSignal {
  id          String   @id @default(cuid())
  userId      String?  // null for anonymous signals
  signalType  String   // "VELOCITY", "AMOUNT_SPIKE", "GEO_ANOMALY"
  score       Float    // 0.0-1.0 fraud probability
  features    Json     // model input features
  decision    String   // "ALLOW" | "CHALLENGE" | "BLOCK"
  entityId    String   // transaction/challenge this triggered on
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
  @@index([signalType, score])
}
```

---

## 7. Cloud Scheduler — All 61 Jobs

**<project> scheduler architecture:**
All 61 jobs hit Cloud Run endpoints secured by `CRON_SECRET` header.
Pattern: `Authorization: Bearer ${CRON_SECRET}` or `X-Cron-Secret: ${CRON_SECRET}`

**Critical scheduler jobs and their timing:**
| Job | Schedule | Description |
|-----|----------|-------------|
| feed-fetch | `*/9 * * * *` | Fetch threat intelligence feeds |
| offline-settlement | `*/5 * * * *` | Process pending offline UPI settlements |
| offline-settlement-india | `*/5 * * * *` (IST) | India UPI settlement (IST timezone) |
| uptime-monitor | `*/5 * * * *` | Health check all 3 regions |
| shield-evolution-agent | `0 * * * *` | Hourly AI threat model update |
| news-crawler | `*/30 * * * *` | Financial security news crawl |
| github-crawler | `0 * * * *` | GitHub security advisory crawl |
| regulatory-crawler | `*/6 * * * *` | Regulatory update check |
| daily-digest | `0 6 * * *` | Daily threat digest email (6am UTC) |
| backup-verify | `0 */6 * * *` | Verify DB backup integrity |
| sitemap-submit | `0 9 * * 1` | Weekly GSC sitemap submission |
| feed-discovery | `0 3 * * 0` | Weekly new feed source discovery |
| ach-challenge-expiry | `*/1 * * * *` | Expire stale ACH challenges (60s TTL) |

**ACH challenge expiry job (new — needed for ACH Shield):**

```typescript
// POST /api/cron/expire-ach-challenges
export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });

  const expired = await prisma.achChallenge.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return Response.json({ expired: expired.count });
}
```

**Cloud Scheduler job configuration:**

```bash
gcloud scheduler jobs create http expire-ach-challenges \
  --location=us-central1 \
  --schedule="* * * * *" \
  --uri="https://<project>.com/api/cron/expire-ach-challenges" \
  --http-method=POST \
  --headers="X-Cron-Secret=${CRON_SECRET}" \
  --time-zone="UTC" \
  --attempt-deadline="30s" \
  --min-backoff=5s \
  --max-backoff=60s \
  --max-retry-attempts=3
```

**IST timezone for India jobs:**
`--time-zone="Asia/Kolkata"` — UTC+5:30

**Scheduler retry config:**

- `max-retry-attempts`: 3 for critical jobs, 0 for idempotent crawlers
- `attempt-deadline`: set based on expected job duration + buffer
- Monitor failures: Cloud Console → Cloud Scheduler → job → View logs

---

## 8. BigQuery & Analytics

**When to use BigQuery vs Cloud SQL:**

- Cloud SQL: operational data, transactions, real-time queries
- BigQuery: analytics, aggregations, historical reporting, ML

**Streaming inserts from Cloud Run:**

```typescript
import { BigQuery } from "@google-cloud/bigquery";
const bq = new BigQuery({ projectId: "<gcp-project>" });

// Stream fraud signals to BigQuery for analytics
await bq
  .dataset("<project>_analytics")
  .table("fraud_signals")
  .insert([
    {
      userId: signal.userId,
      signalType: signal.signalType,
      score: signal.score,
      createdAt: signal.createdAt.toISOString(),
      // BigQuery timestamp format: YYYY-MM-DDTHH:MM:SS.fffZ
    },
  ]);
```

**BigQuery tables for <project>:**

```sql
-- Fraud signals table
CREATE TABLE `<project>_analytics.fraud_signals`
PARTITION BY DATE(created_at)
OPTIONS (partition_expiration_days = 365)
AS SELECT ... ;

-- Daily aggregates (for dashboard)
CREATE TABLE `<project>_analytics.daily_metrics`
PARTITION BY report_date
AS SELECT
  DATE(created_at) as report_date,
  COUNT(*) as total_challenges,
  COUNTIF(status = 'APPROVED') as approved,
  COUNTIF(status = 'DECLINED') as declined,
  COUNTIF(status = 'EXPIRED') as expired,
  AVG(CASE WHEN resolved_at IS NOT NULL
    THEN TIMESTAMP_DIFF(resolved_at, created_at, SECOND) END) as avg_resolution_seconds
FROM `<project>_analytics.ach_challenges`
GROUP BY 1;
```

**Cost optimization:**

- Partition all tables by date (partition pruning = pay only for queried partitions)
- Cluster frequently filtered columns: `CLUSTER BY userId, signalType`
- Use approximate aggregation: `APPROX_COUNT_DISTINCT()` vs `COUNT(DISTINCT)`
- Preview query cost before running: check "This query will process X GB"

---

## 9. Backup, PITR & Disaster Recovery

**Cloud SQL automated backups:**

- Enabled by default on Cloud SQL
- Retention: 7 days (default) — increase to 30 days for production
- Takes ~30 minutes, no performance impact
- Stored in the same region as the instance

**Point-in-Time Recovery (PITR):**

- Allows restore to any second within the backup window
- Requires binary logging enabled (on by default in Cloud SQL)
- Use case: accidental `DELETE` or data corruption
- Recovery time: 30-60 minutes for a 10GB database

**Enabling extended backup retention:**

```bash
gcloud sql instances patch INSTANCE_NAME \
  --backup-retention-count=30 \
  --enable-bin-log \
  --retained-backups-count=30
```

**Manual backup before risky migrations:**

```bash
gcloud sql backups create \
  --instance=INSTANCE_NAME \
  --description="Pre-migration backup $(date +%Y-%m-%d)"
```

**Cross-region backup (for additional safety):**
Enable in Cloud SQL instance settings → Backups → Enable cross-region backups
Copies backups to another region automatically.

**Restore procedure:**

```bash
# List available backups
gcloud sql backups list --instance=INSTANCE_NAME

# Restore to a new instance (never restore to production directly)
gcloud sql instances create RESTORED_INSTANCE \
  --source-instance=INSTANCE_NAME \
  --backup-run-id=BACKUP_ID \
  --region=us-central1

# After verification, use Cloud SQL proxy to query restored instance
```

**Recovery time objectives for <project>:**

- RTO (Recovery Time Objective): < 1 hour
- RPO (Recovery Point Objective): < 5 minutes (PITR to last checkpoint)
- HA (High Availability): 99.95% SLA with Cloud SQL HA enabled

---

## 10. Performance & Monitoring

**Key metrics to monitor (Cloud SQL Insights):**

- Query latency: P50, P95, P99
- Active connections
- CPU utilization: alert at 70%
- Memory usage: alert at 85%
- Disk utilization: alert at 80%
- Replication lag (for replicas): alert at > 30 seconds

**pg_stat_statements (slow query analysis):**

```sql
-- Top 10 slowest queries
SELECT
  round(total_exec_time::numeric, 2) as total_ms,
  round(mean_exec_time::numeric, 2) as mean_ms,
  calls,
  round((total_exec_time / sum(total_exec_time) OVER ()) * 100, 2) as pct,
  query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

**Cloud SQL Query Insights:**

- Cloud Console → Cloud SQL → instance → Query insights
- Shows top queries by CPU, latency, count
- Execution plan visualization
- No setup needed — enabled by default

**Connection pool monitoring:**

```sql
-- Current connections by state
SELECT state, count(*)
FROM pg_stat_activity
GROUP BY state;

-- Long-running queries (> 5 minutes)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

**Killing a blocking query:**

```sql
SELECT pg_cancel_backend(pid); -- graceful cancel
SELECT pg_terminate_backend(pid); -- force terminate
```

**Cloud Monitoring alerting policies:**

```bash
# Create alert for high CPU
gcloud monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Cloud SQL CPU > 70%" \
  --condition-threshold-filter='resource.type="cloudsql_database"' \
  --condition-threshold-value=0.7 \
  --condition-threshold-comparison=COMPARISON_GT
```

---

## 11. Row-Level Security & Multi-Tenancy

**RLS for <project> (isolate user data):**

```sql
-- Enable RLS on sensitive tables
ALTER TABLE "AchChallenge" ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own challenges
CREATE POLICY user_isolation ON "AchChallenge"
  FOR ALL
  USING (current_setting('app.current_user_id') = "userId");

-- Set user context at query time (via Prisma middleware)
SET LOCAL app.current_user_id = 'user_id_here';
```

**Prisma middleware to set user context:**

```typescript
prisma.$use(async (params, next) => {
  if (currentUserId) {
    await prisma.$executeRaw`SET LOCAL app.current_user_id = ${currentUserId}`;
  }
  return next(params);
});
```

**Note:** RLS adds overhead. For <project>'s current scale, application-level isolation
(WHERE userId = currentUser.id) is sufficient. Use RLS as defense-in-depth for highly sensitive tables.

---

## 12. Pub/Sub & Event-Driven Architecture

**When to use Pub/Sub vs direct DB writes:**

- High-volume events: fraud signals, threat feeds, audit logs → Pub/Sub
- Real-time webhooks that might fail: ACH notifications → Pub/Sub with retry
- Cross-service communication: feed-fetch → feed-processor

**<project> Pub/Sub topics:**

```bash
# Create topics
gcloud pubsub topics create threat-feeds-ingestion
gcloud pubsub topics create ach-webhook-delivery
gcloud pubsub topics create fraud-signals

# Create subscriptions with retry
gcloud pubsub subscriptions create ach-webhook-processor \
  --topic=ach-webhook-delivery \
  --ack-deadline=60 \
  --min-retry-delay=10s \
  --max-retry-delay=600s \
  --dead-letter-topic=ach-webhook-dlq \
  --max-delivery-attempts=5
```

**Publishing from Next.js:**

```typescript
import { PubSub } from "@google-cloud/pubsub";
const pubsub = new PubSub({ projectId: "<gcp-project>" });

await pubsub.topic("ach-webhook-delivery").publish(
  Buffer.from(
    JSON.stringify({
      challengeId,
      bankWebhookUrl,
      decision: "APPROVED",
      timestamp: new Date().toISOString(),
    }),
  ),
);
```

---

## 13. GCP Secret Manager Operations

**All <project> secrets:**
DATABASE_URL, NEXTAUTH_SECRET, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CRON_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID, NVD_API_KEY, SHIELD_SIGNING_KEY, TG_MASTER_KEY, ADMIN_EMAIL, FIREBASE_SERVICE_ACCOUNT_KEY, BANK_WEBHOOK_SECRET, UNIT_API_KEY, UNIT_WEBHOOK_SECRET, UNIT_DEPOSIT_PRODUCT_ID

**Common operations:**

```bash
# Read a secret
gcloud secrets versions access latest --secret=SECRET_NAME --project=<gcp-project>

# Update a secret (creates new version)
echo -n "new_value" | gcloud secrets versions add SECRET_NAME --data-file=-

# List versions
gcloud secrets versions list SECRET_NAME

# Deploy new secret version to all Cloud Run regions
# (Cloud Run reads latest version on cold start — use revision deploy to force refresh)
gcloud run deploy <project> \
  --image LATEST_IMAGE \
  --region us-central1 \
  --update-secrets SECRET_NAME=SECRET_NAME:latest
```

**Adding a new secret:**

```bash
gcloud secrets create NEW_SECRET_NAME \
  --project=<gcp-project> \
  --replication-policy="automatic"

echo -n "secret_value" | gcloud secrets versions add NEW_SECRET_NAME --data-file=-

# Grant Cloud Run service account access
gcloud secrets add-iam-policy-binding NEW_SECRET_NAME \
  --member="serviceAccount:<email>" \
  --role="roles/secretmanager.secretAccessor"
```

**Secret rotation pattern:**

1. Add new version: `gcloud secrets versions add`
2. Deploy new Cloud Run revision (picks up new version)
3. Verify new version works
4. Disable old version: `gcloud secrets versions disable VERSION_ID --secret=SECRET_NAME`

---

## 14. <project> DB Schema Reference

**Current DB tables (55+):**

**Core auth/user:** User, Account, Session, VerificationToken (NextAuth)

**ACH Shield:**

- AchChallenge (id, userId, status, options[], correctOption, attempts, expiresAt, resolvedAt, webhookSent)
- UnitAccount (id, userId, unitCustomerId, unitAccountId, routingNumber, accountNumber, nickname, status, active)

**UPI Shield:**

- UpiLinkedAccount (id, userId, vpa, bankName, active, deletedAt)
- UpiFraudCheck (id, userId, vpa, amount, decision, score, blockedReason)
- UpiTransaction (id, userId, vpa, amount, status, offlineToken, settledAt)

**Guardian:**

- GuardianDevice (id, userId, platform, hostname, agentVersion, lastSeen, status)
- GuardianHeartbeat (id, deviceId, threats[], metrics{})
- GuardianAlert (id, deviceId, alertType, severity, detail, acknowledgedAt)

**SENTINEL:**

- ThreatFeed (id, feedId, title, content, severity, tags[], metadata{}, publishedAt)
- FeedRegistry (id, name, url, type, active, lastFetchAt, errorCount)
- FraudSignal (id, userId, signalType, score, features{}, decision, entityId)

**Offline UPI:**

- OfflineToken (id, userId, amount, vpa, encryptedPayload, expiresAt, used)
- MeshSettlement (id, tokenId, transportType, settledAt, npciRef)

**Schema migration for new tables (April 15, 2026 migration):**

- UnitAccount: created ✅
- GuardianDevice: confirmed ✅
- UpiLinkedAccount additions: ✅
- UpiFraudCheck field additions: ✅

**Checking migration status:**

```bash
npx prisma migrate status
# or
gcloud sql databases list --instance=INSTANCE_NAME
```
