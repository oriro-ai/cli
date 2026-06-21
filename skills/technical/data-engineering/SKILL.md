---
name: data-engineering
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >


  Data engineering — data pipelines, ETL, data warehouses, data lakes, streaming, and building data infrastructure.


  Sources: Technical documentation, public guidelines, industry best practices.
---

# Data Engineering

## The data stack

### Ingestion

**Batch:** Move data in periodic jobs (hourly, daily). Fivetran, Airbyte (open source), custom Python scripts.
**Streaming:** Continuous data flow. Kafka, AWS Kinesis, Google Pub/Sub. For real-time analytics.
**Change data capture (CDC):** Capture database changes as events. Debezium. Less latency than batch.

### Storage

**Data warehouse:** Structured data optimized for analytical queries. Snowflake, BigQuery, Redshift, DuckDB.
**Data lake:** Raw data in any format. S3, GCS. Schema applied at query time (schema-on-read).
**Lakehouse:** Combines warehouse and lake. Delta Lake, Apache Iceberg. ACID transactions on data lake.

### Transformation

**dbt (data build tool):** SQL-based transformations. Version controlled. Tests. Documentation. Industry standard.

```sql
-- models/staging/stg_orders.sql
with source as (
    select * from {{ source('raw', 'orders') }}
),
renamed as (
    select
        id as order_id,
        user_id,
        created_at as ordered_at,
        status,
        total_cents / 100.0 as total_usd
    from source
    where created_at >= '2020-01-01'  -- Filter test data
)
select * from renamed
```

### Consumption

**BI tools:** Metabase (open source), Looker, Tableau, Mode. Query warehouse directly.
**APIs:** Expose aggregated data to application.
**ML pipelines:** Prepare features for models.

## Data modeling

### Kimball dimensional modeling

**Fact tables:** Business events with measurable metrics. Orders, page views, payments.
**Dimension tables:** Context for facts. Users, products, dates.
**Star schema:** Fact table in center, dimension tables surrounding. Optimized for analytical queries.

```sql
-- Example star schema
-- Fact: daily_revenue
SELECT
    d.year, d.month, d.week,
    u.country, u.plan,
    p.category,
    SUM(f.revenue_usd) as total_revenue,
    COUNT(DISTINCT f.order_id) as order_count
FROM fact_orders f
JOIN dim_date d ON f.ordered_date = d.date
JOIN dim_users u ON f.user_id = u.user_id
JOIN dim_products p ON f.product_id = p.product_id
WHERE d.year = 2024
GROUP BY 1,2,3,4,5,6;
```

## Data quality

**Tests in dbt:**

```yaml
# models/schema.yml
models:
  - name: stg_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ["pending", "confirmed", "shipped", "delivered", "cancelled"]
      - name: total_usd
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"
```

**Great Expectations:** More sophisticated data validation. Runs in pipeline, blocks bad data.

## Data governance

**Catalog:** Document what data exists, what it means, who owns it. Alation, Amundsen (open source).
**Lineage:** Track where data comes from and where it goes. Know impact before changing.
**Access control:** Row-level security for sensitive data (PII). Column masking.
**PII handling:** Identify, classify, and protect personal data. Often separate to comply with GDPR/CCPA.

Sources: dbt documentation (docs.getdbt.com — free), BigQuery documentation (free), Kimball Group data warehouse toolkit (principles), Fivetran blog (free), Airbyte documentation (free)
