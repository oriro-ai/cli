---
watermark: ORIRO
name: debug-and-build-methodology
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Systematic methodology for debugging errors, making architecture decisions,
  and building production-grade software correctly the first time.
  Activate for ANY error message, stack trace, broken feature, unexpected
  behavior, build failure, or "why isn't this working" question.
  Also activate for architecture questions: "should I use X or Y",
  "how should I structure this", "what database should I use",
  "is this the right approach", "how do I scale this", "where will this break".
  Also activate for: 500 errors, CORS errors, auth failures, database errors,
  deployment failures, TypeScript errors, React errors, API errors.
  Never guess at a fix. Always follow the methodology in this skill.
---

# Skill C — Debug and Build Methodology

## Never guess. Always find the root cause. Build it right the first time.

---

# PART 1 — DEBUG METHODOLOGY

## The 5-step sequence (never skip steps)

```
1. READ    → Read the full error. All of it.
2. LOCATE  → Find where in your code it originates
3. ISOLATE → Confirm minimum input that reproduces it
4. FIX     → Change only what causes the error
5. VERIFY  → Confirm fix works AND no new problem introduced
```

**The rule:** If you have been stuck more than 20 minutes,
stop and write down the problem. The act of writing it
forces the correct framing. The answer usually appears
before you finish writing.

---

## Reading errors correctly

**Stack trace structure:**

```
Error: Cannot read properties of undefined (reading 'name')
    at ProductCard (/app/components/ProductCard.tsx:23:18)  ← YOUR code
    at renderWithHooks (/node_modules/react-dom/...)        ← framework
    at mountIndeterminateComponent (...)                    ← ignore
```

The first line with YOUR file path is where to look.
Ignore all framework/library lines below it.

**Where to look by error type:**

- Browser error → DevTools Console tab
- Server error → terminal running your server (not browser)
- Network error → DevTools Network tab → failed request → Response tab
- Build error → fix the FIRST error only, run again, repeat

---

## Error pattern reference

### JavaScript / TypeScript

**`Cannot read properties of undefined (reading 'X')`**
Cause: accessing `.X` on a null/undefined value

```typescript
// Broken
const name = user.name;

// Fixed
const name = user?.name ?? "Guest";
```

**`TypeError: X is not a function`**
Cause: variable exists but is wrong type. Log it first.

```typescript
console.log(typeof myFn, myFn); // diagnose before fixing
```

**`ReferenceError: X is not defined`**
Cause: wrong import path, or variable used before declaration
Check: Is it imported? Does the import path match the file exactly?

**`Unhandled Promise Rejection`**
Cause: async error with no catch

```typescript
// Always wrap async operations
try {
  const data = await fetchData();
} catch (error) {
  console.error("Failed:", error);
}
```

**`SyntaxError: Unexpected token`**
Cause: invalid JSON or JS syntax error
Fix for JSON: paste into jsonlint.com to find exact line

---

### Next.js

**`Hydration error`**
Cause: component renders differently on server vs client
Common cause: `Date.now()`, `Math.random()`, or `window` on server
Fix: move to `useEffect` or add `suppressHydrationWarning`

**`Module not found: Can't resolve '@/...'`**
Check `tsconfig.json` has: `"paths": { "@/*": ["./*"] }`

**`API route returning 404`**
App Router: file must be `route.ts` not a page file
Path: `app/api/endpoint/route.ts` → URL: `/api/endpoint`

**`Build failed`**
Rule: fix the FIRST error only. Run build. Repeat.
Never try to fix multiple build errors at once.

---

### Network / API

**`CORS error`**
Cause: backend missing Access-Control headers

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  },
});
```

**`401 Unauthorized`**
Cause: missing or expired auth token
Fix: check Authorization header is being sent with request

**`500 Internal Server Error`**
Cause: unhandled server error
Fix: check SERVER terminal, not browser console

**`ECONNREFUSED`**
Cause: service you are connecting to is not running
Fix: start the service. Check connection string and port.

---

### Supabase / Database

**`relation "X" does not exist`** → table not created yet

**`violates row-level security`** → missing RLS policy for that operation

```sql
CREATE POLICY "name" ON table FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**`unique constraint violation`** → duplicate in UNIQUE column

```typescript
// Use upsert instead of insert
await supabase.from("users").upsert({ email }, { onConflict: "email" });
```

**`JWT expired`** → call `supabase.auth.refreshSession()` or redirect to login

---

### Environment variables

**Variable works locally but not in production:**
It was added for Development environment only in Vercel.
Fix: Dashboard → Settings → Environment Variables → edit → check Production.

**Variable is `undefined` in client component:**
Must be prefixed `NEXT_PUBLIC_` to be available in browser.

```
NEXT_PUBLIC_SUPABASE_URL=...     ← accessible client-side
SUPABASE_SERVICE_ROLE_KEY=...    ← server only, never expose
```

---

## Debug toolkit

```bash
# Log full object structure
console.log(JSON.stringify(value, null, 2))

# Check type
console.log(typeof value, Array.isArray(value))

# Test API route directly
curl -X POST https://yourapp.com/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}' -v

# Check what environment variables are set
console.log(Object.keys(process.env).filter(k => k.includes('SUPABASE')))
```

---

# PART 2 — ARCHITECTURE DECISIONS

## The decision framework

Before choosing a technology or pattern, answer:

1. What is the simplest thing that solves this problem?
2. What does this look like at 10x current scale?
3. What is the cost of being wrong? (easy to change vs. locked in)

**The 10x rule:** Build for 10x your current scale. Not 100x.
Premature optimization wastes time. Under-engineering causes rewrites.

---

## SQL vs NoSQL

**Use SQL (Supabase/PostgreSQL) when:**

- Your data has clear relationships (users → orders → products)
- You need to query across different types of data
- You need ACID transactions (payments, bookings)
- You do not know your access patterns yet
  → Default choice. Use SQL unless you have a strong reason not to.

**Use NoSQL (Firestore, MongoDB) when:**

- You have truly flexible/dynamic schemas that change constantly
- You need extreme write throughput (>10K writes/second)
- Your data is naturally document-shaped with no relations
  → Edge case. Most apps do not need this.

---

## Serverless vs traditional server

**Use serverless (Vercel functions, Cloudflare Workers) when:**

- Traffic is unpredictable or bursty
- You want zero infrastructure management
- Each request is independent (no shared state needed)
- You want to start at $0
  → Default choice for new apps.

**Use a persistent server (Railway, Render) when:**

- You need WebSocket connections (real-time chat, live data)
- You need background jobs running continuously
- You have heavy CPU work per request (video processing, ML)
  → Add when you have a specific need for it.

---

## Monolith vs microservices

**Start with monolith always.**
One codebase, one deployment, one database.
Fast to build, easy to debug, simple to reason about.

**Split into services only when:**

- Different parts need to scale independently
- Different teams own different parts
- You have clear boundaries that rarely change
  → Most startups never need microservices. Premature splitting is a trap.

---

## Build vs buy

| Build it yourself            | Use an existing service  |
| ---------------------------- | ------------------------ |
| Core to your business        | Commodity infrastructure |
| Unique competitive advantage | No differentiation       |
| Exact requirements known     | Standard requirements    |
| Team has deep expertise      | Team needs to learn      |

**Rule:** Buy everything that is not your core product.
Auth → Supabase. Email → Resend. Payments → Stripe.
Never build what you can integrate.

---

## Data modeling rules

**1. Store money in integers (cents), never floats:**

```typescript
price: 2999; // $29.99 — correct
price: 29.99; // WRONG — floating point errors in calculations
```

**2. Always use UTC for timestamps:**

```sql
created_at TIMESTAMPTZ DEFAULT NOW()  -- stores UTC, converts on display
```

**3. Use UUIDs for primary keys:**

```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY
-- Not sequential integers — harder to guess, safer for APIs
```

**4. Soft delete with deleted_at (never hard delete user data):**

```sql
deleted_at TIMESTAMPTZ  -- NULL = active, set = deleted
-- Query: WHERE deleted_at IS NULL
```

**5. Every table needs created_at:**

```sql
created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
```

---

## Performance — measure before optimizing

**Never optimize without measuring first.**
The thing you think is slow is rarely the actual bottleneck.

**Measure first:**

```typescript
console.time("db-query");
const data = await supabase.from("products").select("*");
console.timeEnd("db-query");
// "db-query: 234ms" — now you know where the time goes
```

**Common slow spots in order of frequency:**

1. Missing database indexes → add index on columns you filter by
2. N+1 queries → fetch related data in one query, not a loop
3. Unoptimized images → use Next.js `<Image>` component
4. Too much JavaScript → lazy load components not needed immediately
5. No CDN → Cloudflare solves this automatically

**Add index for frequently queried column:**

```sql
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

---

## Security fundamentals — the non-negotiable list

Every project ships with these. No exceptions.

```typescript
// 1. Never put secrets in code
// WRONG: const key = "sk_live_abc123"
// RIGHT: const key = process.env.STRIPE_SECRET_KEY

// 2. Validate all input
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive().max(100000),
})
const validated = schema.parse(requestBody) // throws if invalid

// 3. Rate limit every API endpoint
// Cloudflare handles this at the edge automatically

// 4. Never return raw database errors to users
try {
  await db.query(...)
} catch (error) {
  console.error(error) // log for debugging
  return Response.json({ error: 'Something went wrong' }, { status: 500 })
  // never: return Response.json({ error: error.message })
}

// 5. Check auth before every protected operation
const { data: { user } } = await supabase.auth.getUser()
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

// 6. Scope every database query to current user
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('user_id', user.id) // always scope — never fetch all
```

---

## Estimation — the reality check

**The 3x rule:** Everything takes 3x longer than the first estimate.
Not because of incompetence — because requirements clarify during building.

**MVP definition test:**
Ask: "What is the smallest version that proves this idea works?"
That is your MVP. Build that first. Add everything else after validation.

**What to defer until after launch:**

- Admin dashboard → use Supabase dashboard directly first
- Mobile app → mobile-responsive web app first
- Advanced search → basic filtering first
- Email sequences → single confirmation email first
- Analytics dashboard → check Supabase directly first

**Complexity warning signs:**
If building a feature requires:

- More than 3 new database tables
- More than 5 new API endpoints
- More than 1 week of work
  → Break it into smaller pieces. Build the smallest useful version.
