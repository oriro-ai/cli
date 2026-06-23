---
watermark: ORIRO
name: database-design
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Database design — relational modeling, normalization, indexing, query optimization,
  NoSQL patterns, and choosing the right database. Activate for questions about
  database schema design, SQL, indexing, performance, choosing between databases,
  or any database question. Sources: PostgreSQL docs, MongoDB docs, database theory.
---

# Database Design

## Relational modeling

### Entity-Relationship (ER) design

**Entities:** Things with data (User, Order, Product).
**Attributes:** Properties of an entity (User.email, Order.total).
**Relationships:**

- One-to-many: One user has many orders. FK (order.user_id → users.id).
- Many-to-many: Products and orders. Junction table (order_items with order_id, product_id, quantity).
- One-to-one: User and profile. Shared PK or FK with UNIQUE constraint.

**Design process:**

1. Identify entities and their attributes.
2. Identify relationships between entities.
3. Normalize to at least 3NF.
4. Add indexes for query patterns.
5. Denormalize specific tables where performance requires it.

### Normalization

**1NF:** Each column holds atomic values. No repeating groups.
Bad: `user.phones = "555-1234, 555-5678"`
Good: Separate `user_phones` table.

**2NF:** 1NF + every non-key attribute fully depends on the entire primary key. (Relevant for composite keys.)

**3NF:** 2NF + no transitive dependencies (non-key attributes depend only on the key, not on other non-key attributes).
Bad: `order(order_id, customer_id, customer_name, customer_address)`
`customer_name` and `customer_address` depend on `customer_id`, not `order_id`.
Good: Separate `customers` table.

**Denormalization:** Intentional deviation for performance. Cache computed values, store redundant data to avoid expensive JOINs. Document the reason.

### Primary and foreign keys

```sql
CREATE TABLE users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  published   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**ON DELETE choices:**
`CASCADE`: Delete child rows when parent deleted.
`RESTRICT/NO ACTION`: Prevent parent deletion if children exist.
`SET NULL`: Set FK to NULL when parent deleted.
`SET DEFAULT`: Set FK to default when parent deleted.

## Indexing

### When to add indexes

Every foreign key column (JOINs become fast).
Columns used in WHERE clauses for frequent queries.
Columns used in ORDER BY.
Columns used in aggregation (GROUP BY).

### Index types (PostgreSQL)

```sql
-- B-tree (default): equality and range queries
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Partial index: only indexes rows matching condition
CREATE INDEX idx_posts_published ON posts(user_id) WHERE published = true;

-- Composite index: multiple columns
CREATE INDEX idx_posts_user_published ON posts(user_id, published);
-- Queries on (user_id) AND (user_id, published) benefit. (published) alone does NOT.

-- GIN: full-text search, arrays, JSONB
CREATE INDEX idx_posts_search ON posts USING GIN(to_tsvector('english', title || ' ' || body));
```

### Index performance rules

Column order in composite index matters. Leftmost columns benefit from the index.
Index on high-cardinality columns (many unique values) is most beneficial.
Too many indexes = slow writes. Balance reads vs. writes.
Use EXPLAIN ANALYZE to verify indexes are being used.

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM posts WHERE user_id = $1 AND published = true;
```

## Query optimization

### Common patterns

```sql
-- Pagination (use keyset/cursor for large datasets, not OFFSET)
-- Bad (slow for large offsets):
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 10000;

-- Good (keyset pagination):
SELECT * FROM posts
WHERE created_at < $last_seen_created_at
ORDER BY created_at DESC LIMIT 20;

-- N+1 problem: Don't query in a loop. JOIN or use IN.
-- Bad: SELECT user FROM users WHERE id = X (in a loop)
-- Good:
SELECT u.*, p.title
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
WHERE u.id = ANY($ids);
```

### Connection pooling

Never open a new connection per request in web applications.
Use PgBouncer (dedicated pooler) or application-level pooling (Prisma, Sequelize, pg pool).
Connection pool size ≈ Number of cores × 2 (database server cores, not app server).

## NoSQL patterns

### When to use NoSQL

- Document DB (MongoDB): Flexible schema, hierarchical/nested data, rapid iteration, variable attributes.
- Redis: Caching, sessions, rate limiting, leaderboards, pub/sub, queues.
- Cassandra/DynamoDB: Massive write scale, time-series, global distribution.
- Elasticsearch/OpenSearch: Full-text search, log analysis.
- Neo4j: Highly connected graph data, relationship queries.

### MongoDB document model

```js
// Embed related data that is always accessed together
{
  _id: ObjectId("..."),
  userId: "user_123",
  items: [                // Embedded array
    { productId: "p1", qty: 2, price: 9.99 },
    { productId: "p2", qty: 1, price: 24.99 }
  ],
  total: 44.97,
  status: "confirmed"
}

// Reference (link) data that is large or independently queried
{ _id: ObjectId("..."), userId: "user_123", productId: "p1" }  // separate collection
```

**Rule:** Embed when you always need the data together. Reference when accessed independently or data is large.

## Choosing the right database

| Need                             | Database                                   |
| -------------------------------- | ------------------------------------------ |
| Relational data, complex queries | PostgreSQL                                 |
| Global distribution, any region  | CockroachDB, PlanetScale, Aurora           |
| Flexible schema, JSON documents  | MongoDB                                    |
| Caching, sessions                | Redis                                      |
| Full-text search                 | Elasticsearch, PostgreSQL FTS              |
| Time series                      | TimescaleDB (Postgres extension), InfluxDB |
| Graph relationships              | Neo4j, AWS Neptune                         |
| Edge/serverless SQLite           | Turso, Cloudflare D1                       |

Sources: PostgreSQL documentation (postgresql.org/docs — free), MongoDB documentation (mongodb.com/docs — free), Use The Index Luke (use-the-index-luke.com — free, indexing deep dive), Designing Data-Intensive Applications (Kleppmann — principles)
