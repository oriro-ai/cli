# Data Engineering Reference — Pipelines, Streaming, Warehousing, Analytics

## DATA ARCHITECTURE DECISION TREE

```
What are you building?
  ├── Operational reporting (same-day data, business ops)
  │     → PostgreSQL + materialized views + Metabase
  │
  ├── Analytics / BI (historical, aggregated, for decisions)
  │     → Data warehouse (BigQuery / Snowflake / Redshift) + dbt + Looker
  │
  ├── Real-time dashboards (sub-second latency, live metrics)
  │     → Kafka → Flink/Spark Streaming → ClickHouse / Apache Druid
  │
  ├── ML feature engineering (training data, feature store)
  │     → Lakehouse (Delta Lake / Iceberg) + Feast + dbt
  │
  └── Data sharing / marketplace
        → Delta Sharing or Snowflake Data Clean Room

Start simple: PostgreSQL + dbt + BigQuery covers 90% of SaaS analytics needs.
Reach for Kafka/Flink only when real-time window <5 minutes required.
```

---

## ETL / ELT PIPELINE PATTERNS

### ELT vs ETL

```
ETL (Transform before load):  Legacy. Data warehouse is expensive. Transform first, load clean.
ELT (Load then transform):    Modern. Warehouse is cheap. Load raw, transform in SQL.

Recommendation: Always ELT. Load raw → transform with dbt → serve from warehouse.
Benefits: Replay transforms, raw data preserved, SQL is lingua franca, version control.
```

### Ingestion Tools

```
Airbyte:     Open source, 300+ connectors, self-hosted or cloud. Best default choice.
Fivetran:    Managed, reliable, expensive. Use for critical pipelines where uptime matters.
Stitch:      Simple, affordable, limited connectors.
Custom:      Build only when connector doesn't exist. Use Singer spec.

For APIs → warehouse:  Airbyte (most connectors, free to start)
For DB replication:    Debezium (CDC — capture every row change in real-time)
For events → warehouse: Kafka → Kafka Connect → BigQuery Sink Connector
```

### dbt (Data Build Tool) — The Standard

```sql
-- models/staging/stg_transactions.sql
-- Staging: clean raw data, standardize types, apply naming conventions
{{config(materialized='view')}}

SELECT
    id::varchar                                    AS transaction_id,
    user_id::varchar                               AS user_id,
    NULLIF(amount, 0)::numeric(18, 2)              AS amount,
    UPPER(TRIM(currency))                          AS currency_code,
    COALESCE(status, 'unknown')                   AS status,
    created_at AT TIME ZONE 'UTC'                  AS created_at_utc,
    _loaded_at                                     AS ingested_at
FROM {{ source('raw', 'transactions') }}
WHERE created_at >= '2020-01-01'  -- Exclude test data

-- models/marts/fct_daily_transaction_volume.sql
-- Fact: business-ready aggregation
{{config(materialized='table', partition_by={'field': 'date', 'data_type': 'date'})}}

SELECT
    DATE(t.created_at_utc)    AS date,
    t.currency_code,
    u.country_code,
    COUNT(*)                  AS transaction_count,
    SUM(t.amount)             AS total_volume,
    AVG(t.amount)             AS avg_amount,
    COUNT(DISTINCT t.user_id) AS unique_users
FROM {{ ref('stg_transactions') }} t
JOIN {{ ref('stg_users') }} u USING (user_id)
WHERE t.status = 'completed'
GROUP BY 1, 2, 3
```

### dbt Project Structure

```
dbt_project/
├── models/
│   ├── staging/         # 1:1 with source tables. Clean, cast, rename.
│   │   ├── sources.yml  # Define source tables + freshness expectations
│   │   └── stg_*.sql
│   ├── intermediate/    # Multi-source joins, business logic building blocks
│   │   └── int_*.sql
│   └── marts/           # Final tables consumed by BI tools
│       ├── core/        # Shared across business units
│       │   ├── dim_*.sql  (dimensions: users, products, dates)
│       │   └── fct_*.sql  (facts: transactions, events, revenue)
│       └── finance/     # Finance-specific aggregations
├── tests/
│   ├── generic/         # not_null, unique, accepted_values (built-in)
│   └── singular/        # Custom SQL tests
├── macros/              # Reusable SQL functions
└── seeds/               # Small CSV lookup tables
```

### dbt Testing (Data Quality)

```yaml
# models/staging/sources.yml
sources:
  - name: raw
    freshness:
      warn_after: { count: 6, period: hour }
      error_after: { count: 12, period: hour } # Alert if data is stale
    tables:
      - name: transactions
        columns:
          - name: id
            tests:
              - not_null
              - unique
          - name: amount
            tests:
              - not_null
              - dbt_utils.accepted_range:
                  min_value: 0
                  max_value: 1000000
          - name: status
            tests:
              - accepted_values:
                  values: ["pending", "completed", "failed", "refunded"]
```

---

## STREAMING DATA ARCHITECTURE

### Kafka Production Patterns

```
Topic design:
  Naming:      {domain}.{entity}.{event}  → payments.transaction.created
  Partitions:  Start with 12 (allows 12x parallelism). Never decrease.
  Replication: Factor 3 (minimum for production). Factor 2 = NOT safe.
  Retention:   7 days default. 90 days for audit trail. Compacted for state.

Producer:
  acks=all:        Wait for all replicas to acknowledge (no data loss)
  idempotent=true: Exactly-once producer semantics
  compression:     lz4 (best balance of speed/ratio for log data)
  batch.ms:        20ms batching (throughput vs latency tradeoff)

Consumer:
  Group per consumer: Each service gets its own consumer group
  auto.offset.reset: earliest (don't miss messages on new consumer group)
  Commit only after: processing AND side effects are complete
  Handle duplicates: Store processed event IDs in DB with unique constraint

Schema Registry (mandatory for production):
  Every message has a schema (Avro or Protobuf)
  Schema evolution: BACKWARD_TRANSITIVE compatibility required
  This prevents consumers from breaking when producers evolve schemas
```

### Flink / Spark Streaming

```python
# PySpark Structured Streaming — real-time aggregation
from pyspark.sql import SparkSession
from pyspark.sql.functions import window, col, count, sum

spark = SparkSession.builder.appName("fraud-analytics").getOrCreate()

# Read from Kafka
transactions = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", "kafka:9092") \
    .option("subscribe", "payments.transaction.created") \
    .load()

# Parse and aggregate: rolling 1-hour window, count per user
fraud_signals = transactions \
    .selectExpr("CAST(value AS STRING)") \
    .select(from_json(col("value"), schema).alias("data")) \
    .select("data.*") \
    .withWatermark("created_at", "10 minutes") \   # Late data tolerance
    .groupBy(
        window("created_at", "1 hour", "5 minutes"),  # 1hr window, slide every 5min
        col("user_id")
    ) \
    .agg(
        count("*").alias("tx_count"),
        sum("amount").alias("total_amount")
    ) \
    .filter(col("tx_count") > 10)  # Flag high-velocity users

# Write to PostgreSQL + alert
fraud_signals.writeStream \
    .foreachBatch(write_to_postgres_and_alert) \
    .outputMode("update") \
    .trigger(processingTime="30 seconds") \
    .start()
```

---

## DATA WAREHOUSE — BIGQUERY PRODUCTION

### Table Design

```sql
-- Partitioned + clustered for optimal cost and performance
CREATE TABLE `project.dataset.transactions` (
    transaction_id  STRING      NOT NULL,
    user_id         STRING      NOT NULL,
    org_id          STRING      NOT NULL,
    amount          NUMERIC     NOT NULL,
    currency_code   STRING(3)   NOT NULL,
    status          STRING      NOT NULL,
    risk_score      FLOAT64,
    metadata        JSON,
    created_at      TIMESTAMP   NOT NULL,
    date            DATE        NOT NULL   -- Partition key (derived)
)
PARTITION BY date                           -- ~$5/TB vs $20/TB without partitioning
CLUSTER BY org_id, status, currency_code    -- Collocate frequently filtered columns
OPTIONS (
    require_partition_filter = TRUE,        -- Force queries to specify date range
    partition_expiration_days = 1825        -- Auto-delete after 5 years
);

-- NEVER: SELECT * FROM transactions        → Full scan = expensive
-- ALWAYS: SELECT ... WHERE date BETWEEN '2024-01-01' AND '2024-12-31'
```

### BigQuery Cost Control

```sql
-- Preview before running expensive queries
SELECT COUNT(*), SUM(amount)
FROM `project.dataset.transactions`
WHERE date BETWEEN '2024-01-01' AND '2024-12-31'
-- Check "This query will process X GB" in console before running

-- Materialized view for expensive recurring queries
CREATE MATERIALIZED VIEW `dataset.mv_daily_volume`
OPTIONS (enable_refresh = true, refresh_interval_minutes = 30)
AS
SELECT date, org_id, SUM(amount) as volume, COUNT(*) as tx_count
FROM `dataset.transactions`
WHERE status = 'completed'
GROUP BY 1, 2;

-- Use INFORMATION_SCHEMA for audit
SELECT * FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY total_bytes_processed DESC
LIMIT 20;  -- Find the most expensive queries
```

---

## DATA QUALITY & OBSERVABILITY

### Great Expectations (Data Validation)

```python
import great_expectations as gx

context = gx.get_context()
datasource = context.sources.add_pandas("transactions")
asset = datasource.add_csv_asset("daily_transactions", filepath_or_buffer="transactions.csv")
batch = asset.get_batch_request()

# Define expectations — business rules as code
suite = context.add_expectation_suite("transactions.warning")
validator = context.get_validator(batch_request=batch, expectation_suite=suite)

validator.expect_column_values_to_not_be_null("transaction_id")
validator.expect_column_values_to_be_unique("transaction_id")
validator.expect_column_values_to_be_between("amount", min_value=0, max_value=1_000_000)
validator.expect_column_values_to_be_in_set("status", ["pending", "completed", "failed"])
validator.expect_column_pair_values_a_to_be_greater_than_b(
    "completed_at", "created_at"  # completed must be after created
)

result = validator.validate()
if not result.success:
    alert_team(result)  # Block pipeline if expectations fail
```

### Data Lineage & Catalog

```
Why it matters: Know exactly where every column in every dashboard comes from.
                Debug data issues in minutes, not hours.
                Required for GDPR (data mapping) and SOC2 (data access audit).

Tools:
  OpenMetadata:  Open source, comprehensive, strong lineage
  DataHub:       LinkedIn's open source, excellent for large orgs
  Atlan:         Modern UX, strong integration with dbt/Airflow
  Collibra:      Enterprise, expensive, compliance-focused

dbt generates lineage automatically — use dbt docs generate + serve.
```

---

## ANALYTICS ENGINEERING (BI Layer)

### BI Tool Selection

```
Metabase:    Open source, SQL + no-code, great for internal ops. Free self-hosted.
Grafana:     Engineering/ops metrics, time-series dashboards. Free.
Looker:      Enterprise, LookML modeling layer, governance. $$$. Google product.
Superset:    Open source, feature-rich, Airbnb-born. Good alternative to Tableau.
Power BI:    Microsoft ecosystem, good for Azure shops.
Tableau:     Legacy enterprise, expensive, dominant in large orgs.

For SaaS analytics: Metabase (free) → Looker (when enterprise customers require it).
For product analytics: PostHog (open source, self-host) > Mixpanel > Amplitude.
```

### Product Analytics (Self-Hosted PostHog)

```typescript
// Event tracking — instrument every user action
import PostHog from "posthog-node";

const client = new PostHog(process.env.POSTHOG_KEY, {
  host: "https://analytics.<project>.com", // self-hosted
});

// Track meaningful events (not just page views)
client.capture({
  distinctId: userId,
  event: "transaction_reviewed",
  properties: {
    org_id: orgId,
    risk_score: riskScore,
    decision: "approved",
    review_duration_seconds: reviewDuration,
    plan: userPlan,
  },
});

// Identify users with traits (used for segmentation + cohort analysis)
client.identify({
  distinctId: userId,
  properties: {
    email,
    name,
    plan,
    org_id: orgId,
    signed_up_at: createdAt,
  },
});
```
