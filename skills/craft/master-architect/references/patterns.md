# Design Patterns & Software Engineering Principles

## CLEAN CODE — ABSOLUTE RULES

```
Function length:    ≤20 lines. If longer, extract.
Class length:       ≤200 lines. If longer, split responsibilities.
Parameters:         ≤3. If more, use a config object/record.
Nesting depth:      ≤3. Flatten with early returns.
Names:              Reveal intent. No abbreviations. No single letters except loop vars.
Comments:           Explain WHY, not WHAT. Code explains what. If you need a comment
                    to explain what the code does, rewrite the code.
DRY:                Three-strike rule — same logic 3 times → extract to shared function.
Dead code:          Delete it. Git tracks history. Comments don't.
Boolean params:     Never. Use enums or separate methods.
Magic numbers:      Never. Named constants only.
```

---

## SOLID PRINCIPLES — APPLIED

### S — Single Responsibility

```typescript
// BAD: One class doing too much
class UserService {
  createUser(data) { ... }
  sendWelcomeEmail(user) { ... }  // ← should be EmailService
  generateInvoice(user) { ... }   // ← should be BillingService
  exportToCsv(users) { ... }      // ← should be ExportService
}

// GOOD: One reason to change
class UserService { createUser(data) { ... } }
class EmailService { sendWelcomeEmail(user) { ... } }
```

### O — Open/Closed

```typescript
// BAD: Add new payment type → modify existing class
class PaymentProcessor {
  process(type: string, amount: number) {
    if (type === 'stripe') { ... }
    else if (type === 'paypal') { ... }
    // Every new payment method = modifying this class
  }
}

// GOOD: New payment type = new class, no modification
interface PaymentProvider { process(amount: number): Promise<Receipt> }
class StripeProvider implements PaymentProvider { ... }
class PayPalProvider implements PaymentProvider { ... }
class PaymentProcessor { constructor(private provider: PaymentProvider) {} }
```

### L — Liskov Substitution

Every subclass must be substitutable for its parent without breaking behavior. If you have to override a method to throw NotImplementedException, your hierarchy is wrong.

### I — Interface Segregation

```typescript
// BAD: Fat interface forces implementors to implement unused methods
interface Worker { work(): void; eat(): void; sleep(): void }

// GOOD: Small, focused interfaces
interface Workable { work(): void }
interface Eatable { eat(): void }
class HumanWorker implements Workable, Eatable { ... }
class Robot implements Workable { work() { ... } } // doesn't eat
```

### D — Dependency Inversion

```typescript
// BAD: High-level depends on low-level
class OrderService {
  private db = new PostgreSQLDatabase(); // concrete dependency
}

// GOOD: Depend on abstractions
interface Database {
  query(sql: string, params: any[]): Promise<any[]>;
}
class OrderService {
  constructor(private db: Database) {} // inject, don't instantiate
}
```

---

## DESIGN PATTERNS — MOST USED IN PRODUCTION

### Creational

**Factory Method** — Use when object creation logic is complex or varies by type:

```typescript
interface Notifier {
  send(message: string): Promise<void>;
}
class NotifierFactory {
  static create(type: "email" | "sms" | "push"): Notifier {
    switch (type) {
      case "email":
        return new EmailNotifier();
      case "sms":
        return new SMSNotifier();
      case "push":
        return new PushNotifier();
    }
  }
}
```

**Builder** — Use for complex objects with many optional fields:

```typescript
const query = new QueryBuilder()
  .table("transactions")
  .where("user_id", userId)
  .where("status", "completed")
  .orderBy("created_at", "desc")
  .limit(50)
  .build();
```

**Singleton** — Database connection pools, configuration, loggers. Use sparingly — it's global state.

### Structural

**Adapter** — Wrap a third-party API behind your own interface:

```typescript
// Wrapping Stripe so you can swap payment providers without changing business code
interface PaymentGateway {
  charge(amount: number, currency: string, customerId: string): Promise<string>;
}
class StripeAdapter implements PaymentGateway {
  async charge(amount, currency, customerId) {
    const pi = await stripe.paymentIntents.create({ amount, currency, customer: customerId });
    return pi.id;
  }
}
```

**Decorator** — Add behavior without modifying the class:

```typescript
// Cache decorator wrapping any service method
function Cacheable(ttl: number) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${key}:${JSON.stringify(args)}`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
      const result = await original.apply(this, args);
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      return result;
    };
  };
}
```

**Proxy** — Intercept access: rate limiting, logging, access control:

```typescript
const protectedService = new Proxy(service, {
  get(target, method) {
    return async (...args: any[]) => {
      await rateLimiter.check(userId);
      await auditLogger.log(method, args);
      return target[method](...args);
    };
  },
});
```

### Behavioral

**Observer / Event Emitter** — Decouple producers from consumers:

```typescript
// Domain events — fire and forget
eventBus.emit("user.created", { userId, email, plan });
// Multiple subscribers, none know about each other
eventBus.on("user.created", sendWelcomeEmail);
eventBus.on("user.created", provisionWorkspace);
eventBus.on("user.created", startTrialTimer);
```

**Strategy** — Swap algorithms at runtime:

```typescript
interface PricingStrategy { calculate(usage: number, plan: Plan): number }
class FlatRatePricing implements PricingStrategy { ... }
class UsageBasedPricing implements PricingStrategy { ... }
class TieredPricing implements PricingStrategy { ... }
```

**Command** — Encapsulate operations (enables undo, retry, queuing):

```typescript
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
}
class CreateTransactionCommand implements Command {
  async execute() {
    await db.transaction.create(this.data);
  }
  async undo() {
    await db.transaction.delete(this.id);
  }
}
```

**Chain of Responsibility** — Middleware, validation pipelines:

```typescript
// Express middleware is this pattern
app.use(authenticate);
app.use(authorize("admin"));
app.use(validateBody(schema));
app.use(rateLimiter);
app.post("/api/...", handler);
```

---

## DOMAIN-DRIVEN DESIGN (DDD)

### Core Concepts

**Bounded Context:** A boundary around a domain with its own model and language. Don't share database tables across bounded contexts — use events or APIs.

**Ubiquitous Language:** Name everything in code using the business domain's words. If product calls it a "Claim" not a "Submission", use Claim in your code.

**Aggregates:** A cluster of entities with one root. All access goes through the root.

```typescript
// Order is the aggregate root
class Order {
  private items: OrderItem[] = [];

  addItem(product: Product, quantity: number): void {
    if (this.status !== "draft") throw new Error("Cannot modify confirmed order");
    this.items.push(new OrderItem(product, quantity));
    this.domainEvents.push(new OrderItemAdded(this.id, product.id));
  }
}
// Never: db.query('INSERT INTO order_items...') — always go through Order
```

**Value Objects:** Immutable, no identity, equality by value:

```typescript
class Money {
  constructor(
    readonly amount: number,
    readonly currency: "USD" | "EUR" | "INR",
  ) {
    if (amount < 0) throw new Error("Money cannot be negative");
  }
  add(other: Money): Money {
    if (other.currency !== this.currency) throw new Error("Currency mismatch");
    return new Money(this.amount + other.amount, this.currency);
  }
}
```

**Domain Events:** Things that happened. Past tense. Immutable.

```typescript
// Domain event — something that happened in the domain
class FraudDetected {
  readonly occurredAt = new Date();
  constructor(
    readonly transactionId: string,
    readonly riskScore: number,
    readonly reason: string,
  ) {}
}
```

### DDD Layers (Hexagonal Architecture)

```
Domain Layer:        Entities, Value Objects, Domain Events, Aggregates, Domain Services
                     Pure business logic. Zero framework dependencies. Zero infrastructure code.

Application Layer:   Use Cases / Application Services. Orchestrate domain objects.
                     One use case = one public method. No business logic here.

Infrastructure Layer: DB, APIs, queues, email, file storage.
                     Implements interfaces defined in domain layer.

Presentation Layer:  HTTP controllers, GraphQL resolvers, CLI commands.
                     Thin. Just parses input, calls application service, formats output.
```

---

## SYSTEM DESIGN PATTERNS

### Saga Pattern (Distributed Transactions)

When a transaction spans multiple services, use sagas instead of 2PC:

```
Choreography Saga:    Each service publishes events and reacts to others' events
                      Good for: simple flows, ≤3 services

Orchestration Saga:   Central coordinator tells each service what to do
                      Good for: complex flows, need clear transaction log, >3 services

Compensating transactions: Each step has a "undo" transaction for rollback
  Reserve inventory → Charge payment → Create order → Ship
  Cancel shipment ← Refund payment ← Release inventory  ← (if any step fails)
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") throw new Error("Circuit open — service unavailable");
    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (err) {
      this.recordFailure();
      throw err;
    }
  }

  private recordFailure() {
    this.failures++;
    if (this.failures >= 5) this.state = "open"; // trip after 5 failures
    setTimeout(() => (this.state = "half-open"), 30_000); // try again after 30s
  }
}
```

### Outbox Pattern (Guaranteed Event Delivery)

```sql
-- Write to DB and outbox in one transaction — never lose an event
BEGIN;
  INSERT INTO orders (id, status, ...) VALUES (...);
  INSERT INTO outbox (aggregate_id, event_type, payload, created_at)
    VALUES (order_id, 'order.created', '{"orderId": "..."}', NOW());
COMMIT;

-- Separate process polls outbox and publishes to message queue
-- Delete from outbox only after confirmed publish
-- This guarantees at-least-once delivery without 2PC
```

### CQRS (Command Query Responsibility Segregation)

```
Write path:  Command → Command Handler → Domain Model → Event → Write DB
Read path:   Query → Query Handler → Read Model (optimized for reads) → Response

Use CQRS when:
  ✓ Read load >> Write load
  ✓ Complex domain model is hard to query efficiently
  ✓ Need different consistency guarantees for reads vs writes
  ✗ Simple CRUD app — massive overkill
```

---

## API DESIGN EXCELLENCE

### REST Maturity (Richardson Model)

```
Level 0: HTTP tunnel (POST everything to /api)          — bad
Level 1: Resources (/users, /orders)                   — minimum acceptable
Level 2: HTTP verbs + status codes (GET/POST/PUT/PATCH) — good (most APIs stop here)
Level 3: Hypermedia (HATEOAS — links in responses)     — rarely needed
```

### Idempotency (Always implement on mutating endpoints)

```typescript
// Client sends Idempotency-Key: uuid header
// Server stores results keyed by idempotency key
// If same key seen again — return cached result, don't process twice
// Critical for: payments, order creation, email sending, any mutation

async function createOrder(data: OrderData, idempotencyKey: string) {
  const cached = await redis.get(`idem:${idempotencyKey}`);
  if (cached) return JSON.parse(cached);

  const order = await db.order.create(data);
  await redis.setex(`idem:${idempotencyKey}`, 86400, JSON.stringify(order));
  return order;
}
```

### Pagination (Use Cursor, Not Offset)

```typescript
// Offset pagination (bad at scale):
// GET /transactions?page=500&limit=20
// → DB must scan 500*20 = 10,000 rows before returning 20 — gets slower as pages increase

// Cursor pagination (correct):
// GET /transactions?cursor=eyJpZCI6MTIzfQ&limit=20
// → Always fast, consistent under concurrent inserts
async function getTransactions(cursor: string | null, limit = 20) {
  const where = cursor ? { id: { lt: decodeCursor(cursor) } } : {};
  const rows = await db.transaction.findMany({
    where,
    orderBy: { id: "desc" },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  return {
    data: rows.slice(0, limit),
    nextCursor: hasMore ? encodeCursor(rows[limit - 1].id) : null,
  };
}
```

---

## CODE QUALITY GATES

Run these automatically in CI — block merge if any fail:

```
Linting:         ESLint (TS) / Pylint+Ruff (Python) / Spotless (Java) / golangci-lint (Go)
Formatting:      Prettier (JS/TS) / Black (Python) / gofmt (Go) — non-negotiable, auto-fix
Type checking:   tsc --noEmit (TS) / mypy --strict (Python) / javac warnings as errors
Test coverage:   >80% line coverage on domain/business logic (not framework glue)
Complexity:      Cyclomatic complexity ≤10 per function. Fail the build if exceeded.
Duplication:     <5% code duplication (SonarQube or similar)
Secrets:         Gitleaks or TruffleHog — zero tolerance on secret commits
Dependencies:    No critical CVEs (Snyk / OWASP Dependency Check)
```
