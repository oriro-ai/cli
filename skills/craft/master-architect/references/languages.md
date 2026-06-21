# Language Reference — Deep Patterns & Best Practices

## JAVA 21 (Current LTS)

### Modern Java Patterns

```java
// Records (replace Lombok @Data)
record TransactionDto(String id, BigDecimal amount, String currency, Instant createdAt) {}

// Sealed classes (exhaustive type hierarchies)
sealed interface PaymentResult permits PaymentSuccess, PaymentFailure, PaymentPending {}
record PaymentSuccess(String transactionId) implements PaymentResult {}
record PaymentFailure(String errorCode, String message) implements PaymentResult {}

// Pattern matching switch (exhaustive, compiler-checked)
String describe(PaymentResult result) {
    return switch (result) {
        case PaymentSuccess s  -> "Approved: " + s.transactionId();
        case PaymentFailure f  -> "Declined: " + f.message();
        case PaymentPending p  -> "Processing";
    };
}

// Virtual threads (Project Loom) — handle 1M+ concurrent connections
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 100_000).forEach(i ->
        executor.submit(() -> handleRequest(i))
    );
}

// Text blocks
String json = """
    {
        "type": "fraud_detected",
        "transactionId": "%s"
    }
    """.formatted(txId);
```

### Spring Boot 3.x Essentials

```java
// Minimal REST controller
@RestController @RequestMapping("/api/v1/transactions")
@RequiredArgsConstructor
public class TransactionController {
    private final TransactionService service;

    @GetMapping
    public Page<TransactionDto> list(
        @AuthenticationPrincipal UserDetails user,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return service.findByUser(user.getUsername(), PageRequest.of(page, size));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionDto create(@Valid @RequestBody CreateTransactionRequest req,
                                  @AuthenticationPrincipal UserDetails user) {
        return service.create(req, user.getUsername());
    }
}

// Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(NotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleNotFound(NotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }
}
```

### Java Pitfalls

```
BigDecimal for money:   NEVER double/float. new BigDecimal("19.99") not new BigDecimal(19.99)
Optional correctly:     Never as method param. Never .get() without .isPresent(). Use .orElseThrow()
String concatenation:   StringBuilder in loops. Never "str" + var in loop body.
equals/hashCode:        Always override together. Records do this automatically.
Static analysis:        SpotBugs + CheckStyle + SonarQube — run in CI.
```

---

## PYTHON 3.12+

### Modern Python Patterns

```python
from __future__ import annotations
from typing import TypeVar, Generic
from dataclasses import dataclass, field
from datetime import datetime
import asyncio

# Dataclasses (not dicts for structured data)
@dataclass(frozen=True, slots=True)  # frozen=immutable, slots=memory-efficient
class Transaction:
    id: str
    amount: Decimal
    currency: str
    created_at: datetime = field(default_factory=datetime.utcnow)

# Type aliases and generics
type UserId = str
type TransactionId = str

# Structural pattern matching (3.10+)
match result:
    case {"status": "success", "data": data}:
        process(data)
    case {"status": "error", "code": code} if code >= 500:
        alert_team(code)
    case _:
        log_unknown(result)

# Async patterns (always use async for I/O)
async def fetch_fraud_signals(tx_ids: list[str]) -> dict[str, float]:
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_signal(session, tx_id) for tx_id in tx_ids]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return {
            tx_id: score
            for tx_id, score in zip(tx_ids, results)
            if not isinstance(score, Exception)
        }
```

### FastAPI (Production Patterns)

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.connect()
    await redis.ping()
    yield
    # Shutdown
    await db.disconnect()
    await redis.aclose()

app = FastAPI(lifespan=lifespan)

# Dependency injection
async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db)):
    payload = verify_jwt(token)
    user = await db.users.get(payload["sub"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED)
    return user

@app.get("/transactions", response_model=Page[TransactionResponse])
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await transaction_service.paginate(db, current_user.id, page, limit)
```

### Python Pitfalls

```python
# Mutable default args — classic bug
def bad(items=[]):    items.append(1); return items  # SAME list across calls
def good(items=None): items = items or []; items.append(1); return items

# Late binding closures
# bad: all lambdas capture same i
funcs = [lambda: i for i in range(3)]  # all return 2
# good: capture by value
funcs = [lambda i=i: i for i in range(3)]  # 0, 1, 2

# Blocking in async — kills performance
async def bad(): time.sleep(1)          # blocks entire event loop
async def good(): await asyncio.sleep(1) # yields to other coroutines

# String formatting — always f-strings (fastest)
name = "World"
bad  = "Hello, " + name   # concatenation
bad  = "Hello, %s" % name  # old style
good = f"Hello, {name}"    # f-strings — fastest, most readable
```

---

## TYPESCRIPT (Strict Mode Always)

### Type System Mastery

```typescript
// Discriminated unions — exhaustive pattern matching
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) return { ok: false, error: new Error("Division by zero") };
  return { ok: true, value: a / b };
}

// Template literal types — type-safe event names
type EventName = `${string}.created` | `${string}.updated` | `${string}.deleted`;
type UserEvent = `user.${"created" | "updated" | "deleted"}`;

// Conditional types — advanced type transformations
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Branded types — prevent primitive obsession
type UserId = string & { readonly _brand: "UserId" };
type Amount = number & { readonly _brand: "Amount" };
const userId = "abc-123" as UserId; // explicit cast required
function getUser(id: UserId) {} // compiler prevents passing arbitrary string

// Satisfies operator (4.9+) — check type without widening
const config = {
  db: { host: "localhost", port: 5432 },
  redis: { host: "localhost", port: 6379 },
} satisfies Record<string, { host: string; port: number }>;
// config.db.host is still string literal type (not widened to string)
```

### Next.js 14 App Router Patterns

```typescript
// Server component (default — zero JS sent to client)
async function TransactionList({ userId }: { userId: string }) {
  const transactions = await db.transaction.findMany({ where: { userId } })
  return <ul>{transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)}</ul>
}

// Server action (form mutation without API route)
async function createTransaction(formData: FormData) {
  'use server'
  const amount = formData.get('amount') as string
  await db.transaction.create({ data: { amount: parseFloat(amount), userId: await getUserId() }})
  revalidatePath('/dashboard')
}

// Route handler with proper error handling
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = schema.parse(body)  // Zod validation
    const result = await service.create(validated)
    return Response.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof ZodError) {
      return Response.json({ error: err.errors }, { status: 400 })
    }
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## GO 1.22+

### Production Patterns

```go
// Error handling — always explicit, never ignore
func getUser(ctx context.Context, id string) (*User, error) {
    user, err := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", id).Scan(&user)
    if err != nil {
        if errors.Is(err, sql.ErrNoRows) {
            return nil, fmt.Errorf("user %s: %w", id, ErrNotFound) // wrap for context
        }
        return nil, fmt.Errorf("query user %s: %w", id, err)
    }
    return user, nil
}

// Context propagation — always pass ctx as first param
func (s *Service) ProcessTransaction(ctx context.Context, req Request) (*Response, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    // All downstream calls use this ctx — cancellation propagates automatically
    return s.repo.Create(ctx, req)
}

// Goroutine leak prevention — always use errgroup or WaitGroup
func fetchAll(ctx context.Context, ids []string) ([]Result, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([]Result, len(ids))
    for i, id := range ids {
        i, id := i, id  // capture loop vars
        g.Go(func() error {
            result, err := fetch(ctx, id)
            if err != nil { return err }
            results[i] = result
            return nil
        })
    }
    return results, g.Wait()
}

// Struct embedding for interfaces
type Service struct {
    db     *sql.DB
    cache  Cache          // interface — easy to mock in tests
    logger *slog.Logger   // structured logging — use slog (stdlib since 1.21)
}
```

### Go Pitfalls

```
Goroutine leaks:    Always defer cancel() after context.WithTimeout/WithCancel
Slice gotchas:      append may or may not create new backing array — use copy() when in doubt
Interface nil:      var err *MyError = nil; var i error = err; i != nil is TRUE (interface type != nil)
Map not safe:       sync.Map or mutex for concurrent map access
String conversion:  []byte(str) copies — use unsafe.Slice for zero-copy in hot paths
```

---

## RUST (2021 Edition)

### Core Patterns

```rust
// Result and Option — no null pointer exceptions, ever
fn parse_amount(s: &str) -> Result<f64, ParseError> {
    s.trim().parse::<f64>().map_err(|e| ParseError::InvalidAmount(e.to_string()))
}

// Ownership-safe shared state
use std::sync::{Arc, RwLock};
#[derive(Clone)]
struct AppState { db: Arc<Pool<Postgres>>, cache: Arc<RwLock<HashMap<String, Value>>> }

// Axum web handler (async, zero-cost)
async fn create_transaction(
    State(state): State<AppState>,
    Json(payload): Json<CreateRequest>,
) -> Result<Json<Transaction>, AppError> {
    let tx = sqlx::query_as::<_, Transaction>("INSERT INTO transactions ...")
        .bind(&payload.amount)
        .fetch_one(&*state.db)
        .await?;
    Ok(Json(tx))
}

// Traits for behavior abstraction
trait FraudDetector: Send + Sync {
    async fn score(&self, tx: &Transaction) -> Result<f64, Error>;
}
```

---

## SQL — PRODUCTION PATTERNS

### Query Optimization

```sql
-- EXPLAIN ANALYZE every new query in production
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM transactions WHERE user_id = $1 AND created_at > $2;

-- Index design rules:
-- 1. Index columns used in WHERE, JOIN ON, ORDER BY
-- 2. Composite index: put highest-selectivity column first
-- 3. Partial index for filtered queries:
CREATE INDEX idx_pending_transactions ON transactions (created_at)
WHERE status = 'pending';  -- Only indexes pending rows

-- 4. Index for LIKE prefix search:
CREATE INDEX idx_email_prefix ON users (email text_pattern_ops);
-- Supports: WHERE email LIKE 'user@%'

-- Avoid N+1: use JOIN or subquery instead
-- BAD (N+1):
SELECT * FROM orders;  -- then for each order:
SELECT * FROM order_items WHERE order_id = $1;

-- GOOD (1 query):
SELECT o.*, json_agg(i.*) as items
FROM orders o
LEFT JOIN order_items i ON i.order_id = o.id
WHERE o.user_id = $1
GROUP BY o.id;
```

### PostgreSQL Power Features

```sql
-- Row-level security (multi-tenant isolation)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transactions
    USING (org_id = current_setting('app.current_org_id')::uuid);

-- JSONB for flexible metadata (indexed)
ALTER TABLE transactions ADD COLUMN metadata JSONB DEFAULT '{}';
CREATE INDEX idx_tx_metadata_gin ON transactions USING gin(metadata);
-- Query: WHERE metadata @> '{"source": "mobile"}'

-- Window functions (analytics without GROUP BY collapse)
SELECT
    user_id,
    amount,
    SUM(amount) OVER (PARTITION BY user_id ORDER BY created_at) as running_total,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
FROM transactions;

-- CTEs for readability (optimizer inlines them in PG 12+)
WITH high_risk AS (
    SELECT user_id, COUNT(*) as flagged_count
    FROM transactions WHERE risk_score > 0.8
    GROUP BY user_id HAVING COUNT(*) > 3
)
SELECT u.email, h.flagged_count
FROM users u JOIN high_risk h USING (user_id);

-- Advisory locks for distributed mutex (no external Redis needed for simple cases)
SELECT pg_advisory_lock(hashtext('process-transaction-' || transaction_id));
-- ... do work ...
SELECT pg_advisory_unlock(hashtext('process-transaction-' || transaction_id));
```

---

## BASH — PRODUCTION SCRIPTS

```bash
#!/usr/bin/env bash
set -euo pipefail  # e=exit on error, u=error on unset vars, o pipefail=pipe errors propagate
IFS=$'\n\t'        # Safer word splitting

# Always quote variables
file="${1:-}"
if [[ -z "$file" ]]; then
    echo "Usage: $0 <filename>" >&2
    exit 1
fi

# Functions for reuse
log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2; }
die() { log "ERROR: $*"; exit 1; }

# Trap for cleanup
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

# Check dependencies
command -v jq >/dev/null || die "jq is required but not installed"
command -v gcloud >/dev/null || die "gcloud is required but not installed"

# Process with error handling
if ! result=$(some_command 2>&1); then
    die "Command failed: $result"
fi

log "Completed successfully"
```

---

## ELIXIR / ERLANG (Real-Time Systems)

```elixir
# Phoenix LiveView — real-time UI without JS complexity
defmodule FraudDashboardLive do
  use Phoenix.LiveView

  def mount(_params, _session, socket) do
    if connected?(socket), do: Phoenix.PubSub.subscribe(App.PubSub, "fraud_alerts")
    {:ok, assign(socket, alerts: load_recent_alerts())}
  end

  # Handles real-time messages from PubSub
  def handle_info({:new_alert, alert}, socket) do
    {:noreply, update(socket, :alerts, &[alert | &1])}
  end
end
```

Use Elixir when: real-time features (chat, live dashboards, presence), high-concurrency (millions of connections), fault-tolerant distributed systems, IoT backends.

---

## WEBASSEMBLY (WASM)

Modern use cases:

- Run CPU-intensive code in the browser (image processing, crypto, compression)
- Compile Rust/C/C++ to WASM for near-native browser performance
- WASI for server-side sandboxed plugins

```rust
// Rust → WASM via wasm-pack
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn process_transactions(data: &[u8]) -> Vec<u8> {
    // CPU-intensive processing — runs in browser at near-native speed
    let transactions: Vec<Transaction> = serde_json::from_slice(data).unwrap();
    let results = transactions.iter().map(score_transaction).collect::<Vec<_>>();
    serde_json::to_vec(&results).unwrap()
}
```

---

## DART (Flutter)

```dart
// Null safety — always enabled (Dart 3+)
String? maybeNull = null;
String definitelyNotNull = maybeNull ?? 'default';
String guaranteed = maybeNull!;  // throws if null — use sparingly

// Records (Dart 3) — lightweight data structures
(String name, int age) person = ('<user>', 40);
print(person.$1);  // '<user>'

// Sealed classes — exhaustive pattern matching
sealed class PaymentResult {}
class Success extends PaymentResult { final String txId; Success(this.txId); }
class Failure extends PaymentResult { final String error; Failure(this.error); }

String describe(PaymentResult r) => switch(r) {
  Success s => 'OK: ${s.txId}',
  Failure f => 'Error: ${f.error}',
};  // Compiler error if not exhaustive

// Async/await — same as JS/TS
Future<List<Transaction>> fetchTransactions(String userId) async {
  final response = await http.get(Uri.parse('$baseUrl/transactions?userId=$userId'));
  if (response.statusCode != 200) throw ApiException(response.statusCode);
  return (jsonDecode(response.body) as List)
      .map((e) => Transaction.fromJson(e))
      .toList();
}

// Streams — reactive data
Stream<int> countUp(int max) async* {
  for (var i = 0; i < max; i++) {
    await Future.delayed(const Duration(seconds: 1));
    yield i;
  }
}
```

---

## SOLIDITY (Smart Contracts / Web3)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Security patterns — ALWAYS use these in production contracts
contract SecureToken is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18;
    mapping(address => bool) public blacklisted;

    event Blacklisted(address indexed account);

    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {}

    // Checks-Effects-Interactions pattern (prevent reentrancy)
    function mint(address to, uint256 amount) external onlyOwner nonReentrant {
        require(!blacklisted[to], "Blacklisted address");    // CHECK
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");  // CHECK
        _mint(to, amount);                                   // EFFECT (state change)
        // No external calls after state changes (prevent reentrancy)
    }

    // Custom errors (cheaper than strings — Solidity 0.8+)
    error Unauthorized(address caller);
    error InsufficientBalance(uint256 available, uint256 required);

    function _update(address from, address to, uint256 value)
        internal override
    {
        if (blacklisted[from] || blacklisted[to]) revert Unauthorized(from);
        super._update(from, to, value);
    }
}
```

**Solidity Security Checklist:**

```
□ Reentrancy:       ReentrancyGuard on all state-changing external calls
□ Integer overflow: Solidity 0.8+ has built-in. Use SafeMath only for older.
□ Access control:   OpenZeppelin Ownable/AccessControl. Never trust msg.sender without check.
□ Oracle manipulation: Never use single oracle (Chainlink preferred, time-weighted for DEX)
□ Front-running:    Commit-reveal scheme for sensitive operations
□ Audit:            ALWAYS audit before mainnet. CertiK, Trail of Bits, OpenZeppelin audits.
□ Testing:          Hardhat + Foundry. 100% branch coverage. Fuzzing required.
□ Upgrades:         Proxy pattern (OpenZeppelin UUPS/Transparent) with timelocks
```

---

## GRAPHQL — PRODUCTION PATTERNS

```typescript
// Schema-first design (use SDL, not code-first for large schemas)
// schema.graphql
type Transaction {
  id: ID!
  amount: Float!
  currency: String!
  status: TransactionStatus!
  user: User!
  riskScore: Float
  createdAt: DateTime!
}

enum TransactionStatus { PENDING COMPLETED FAILED REFUNDED }

type Query {
  transaction(id: ID!): Transaction
  transactions(
    filter: TransactionFilter
    first: Int = 20
    after: String    # Cursor-based pagination
  ): TransactionConnection!
}

type Mutation {
  createTransaction(input: CreateTransactionInput!): TransactionResult!
}

type Subscription {
  transactionUpdated(orgId: ID!): Transaction!  # Real-time updates
}

# --- Resolver (TypeScript with DataLoader) ---
import DataLoader from 'dataloader'

// N+1 problem solution — batch all user lookups into one query
const userLoader = new DataLoader<string, User>(async (userIds) => {
  const users = await db.user.findMany({ where: { id: { in: [...userIds] }}})
  return userIds.map(id => users.find(u => u.id === id) ?? new Error(`User ${id} not found`))
})

const resolvers = {
  Transaction: {
    user: (tx: Transaction) => userLoader.load(tx.userId),  // Batched automatically
    riskScore: async (tx: Transaction, _, { user }) => {
      // Field-level auth — only admins see risk scores
      if (!user.isAdmin) return null
      return fraudService.getScore(tx.id)
    }
  }
}

// Persisted queries — prevent arbitrary query abuse in production
// Client sends query hash, not query string → server looks up allowed query
```

### GraphQL Security

```
Depth limiting:      Max query depth = 10 (prevent deeply nested abuse queries)
Complexity limits:   Assign cost to fields, reject queries over budget
Introspection:       DISABLE in production (hides schema from attackers)
Rate limiting:       Per-field and per-operation, not just per-request
Auth:                Resolve auth in context (not in each resolver) — consistent
Field-level auth:    Use @auth directive or resolver-level checks per field
Query allowlisting:  Production uses persisted queries only
```

---

## gRPC — SERVICE-TO-SERVICE

```protobuf
// fraud.proto
syntax = "proto3";
package fraud.v1;

import "google/protobuf/timestamp.proto";

service FraudDetector {
  rpc ScoreTransaction(ScoreRequest) returns (ScoreResponse);
  rpc StreamAlerts(AlertStreamRequest) returns (stream FraudAlert);  // Server streaming
  rpc BatchScore(stream ScoreRequest) returns (stream ScoreResponse); // Bidirectional
}

message ScoreRequest {
  string transaction_id = 1;
  double amount = 2;
  string currency = 3;
  string user_id = 4;
  google.protobuf.Timestamp created_at = 5;
  map<string, string> metadata = 6;
}

message ScoreResponse {
  string transaction_id = 1;
  double risk_score = 2;
  repeated string risk_factors = 3;
  bool should_block = 4;
}
```

```typescript
// TypeScript gRPC server
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const packageDef = protoLoader.loadSync("fraud.proto", { keepCase: true });
const fraudProto = grpc.loadPackageDefinition(packageDef).fraud.v1 as any;

const server = new grpc.Server();
server.addService(fraudProto.FraudDetector.service, {
  async scoreTransaction(call: any, callback: any) {
    const { transaction_id, amount, user_id } = call.request;
    try {
      const score = await fraudEngine.score({
        transactionId: transaction_id,
        amount,
        userId: user_id,
      });
      callback(null, { transaction_id, risk_score: score.value, should_block: score.value > 0.9 });
    } catch (err) {
      callback({ code: grpc.status.INTERNAL, message: err.message });
    }
  },
});

// Interceptor for auth + logging (gRPC middleware equivalent)
server.addService(
  fraudProto.FraudDetector.service,
  withInterceptors([authInterceptor, loggingInterceptor, tracingInterceptor], handlers),
);
```
