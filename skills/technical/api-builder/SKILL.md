---
watermark: ORIRO
name: api-builder
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  API design and development — REST, GraphQL, tRPC, versioning, authentication,
  rate limiting, documentation, and API best practices. Activate for questions
  about building APIs, designing endpoints, API versioning, API security,
  or any API development question. Sources: OpenAPI specification, REST best
  practices, GraphQL Foundation.
---

# API Design and Development

## REST API design principles

### Resource naming

Resources are nouns, not verbs. HTTP methods provide the action.

```
✅  GET    /users              List users
✅  POST   /users              Create user
✅  GET    /users/{id}         Get user
✅  PATCH  /users/{id}         Update user
✅  DELETE /users/{id}         Delete user
✅  GET    /users/{id}/posts   Get user's posts

❌  GET    /getUsers
❌  POST   /createUser
❌  GET    /users/delete/{id}
```

Plural nouns for collections. Nested resources for clear ownership (max 2 levels deep).

### HTTP status codes — use them correctly

```
200 OK              — Successful GET, PATCH, PUT
201 Created         — Successful POST (include Location header)
204 No Content      — Successful DELETE
400 Bad Request     — Invalid input (validation errors)
401 Unauthorized    — Not authenticated (no/invalid token)
403 Forbidden       — Authenticated but lacks permission
404 Not Found       — Resource doesn't exist
409 Conflict        — State conflict (duplicate email, etc.)
422 Unprocessable   — Validation failed (alternative to 400)
429 Too Many Requests — Rate limit exceeded
500 Internal Server Error — Unexpected server error (never expose details)
```

### Request and response design

**Always return JSON with consistent structure:**

```json
// Success response
{ "data": { "id": "123", "name": "Alice", "email": "alice@example.com" } }

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address",
    "field": "email"
  }
}

// List response
{
  "data": [...],
  "meta": { "total": 342, "page": 1, "limit": 20 }
}
```

## Authentication

### API Keys

Simple, widely understood. Best for server-to-server.

```
Authorization: Bearer sk_live_abc123...
X-API-Key: sk_live_abc123...
```

Store hashed in DB. Never log API keys.

### JWT (JSON Web Tokens)

```
Header.Payload.Signature
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Access token: short-lived (15 min). Refresh token: longer-lived (7-30 days), stored in httpOnly cookie.
Never store access tokens in localStorage (XSS risk).

### OAuth 2.0 flows

Authorization Code + PKCE: For web/mobile apps. User redirected to provider.
Client Credentials: For server-to-server (machine-to-machine).
Never use Implicit flow (deprecated).

## Rate limiting

**Why:** Protect against abuse, DDoS, runaway clients.
**Strategies:**
Fixed window: Max N requests per hour. Simple but burst vulnerable.
Sliding window: Better burst handling.
Token bucket: Smooth rate limiting with burst allowance.

**Headers to return:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 997
X-RateLimit-Reset: 1640000000
Retry-After: 3600  (when rate limited)
```

**Implementation:** Redis `INCR` with expiry or `ZREMRANGEBYSCORE` for sliding window.

## Versioning

**URL versioning (most common):** `/api/v1/users`, `/api/v2/users`
Clear, cacheable, easy to debug. Downside: URL redundancy.
**Header versioning:** `Accept: application/vnd.api+json;version=2`
**Query parameter:** `/api/users?version=2`

**When to increment version:** Breaking changes only.
Breaking: Removing/renaming fields, changing field types, changing behavior.
Non-breaking: Adding optional fields, adding new endpoints.
Support N-1 versions minimum. Deprecation notice before removal.

## Validation and error handling

**Validate at the boundary.** Don't let invalid data into your system.

```ts
import { z } from "zod";

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  age: z.number().int().min(13).max(120).optional(),
});

// In route handler:
const parsed = CreateUserSchema.safeParse(body);
if (!parsed.success) {
  return Response.json({ error: parsed.error.flatten() }, { status: 422 });
}
```

## API documentation

**OpenAPI/Swagger:** Industry standard. Machine-readable. Generates client SDKs, testing UIs.

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - in: query
          name: limit
          schema:
            type: integer
            default: 20
      responses:
        "200":
          description: List of users
```

## GraphQL vs REST

Use GraphQL when: Clients need flexible queries, multiple clients with different data needs, complex nested data, real-time subscriptions matter.
Use REST when: Simple CRUD, caching is important, team is familiar, simpler debugging.
GraphQL costs: N+1 query problem (use DataLoader), schema management overhead, complexity.

## Webhooks

Push model: You push events to subscriber's URL instead of subscriber polling.

```
POST https://customer-app.com/webhook
Content-Type: application/json
X-Signature: sha256=abc123...

{ "event": "order.created", "data": { ... } }
```

**Security:** HMAC signature on payload. Customer verifies before processing.
**Reliability:** Retry with exponential backoff. Idempotency keys so duplicates are safe.

Sources: OpenAPI Specification (swagger.io/specification — free), REST API Design Rulebook principles (Richardson), Google API Design Guide (free), Stripe API design (excellent public example)
