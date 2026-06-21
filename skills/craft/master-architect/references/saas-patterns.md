# SaaS Patterns Reference

## MULTI-TENANCY MODELS

### Row-Level Isolation (Default Recommendation)

- Single database, `tenant_id` column on every table
- Row-Level Security (PostgreSQL RLS) enforces isolation at DB level
- Simplest to build and operate
- Risk: Bug could expose cross-tenant data → mitigate with RLS + app-level checks + tests
- Best for: <500 tenants, SMB market, fast MVP

### Schema-Per-Tenant

- Single database, separate PostgreSQL schema per tenant
- Better isolation, easier per-tenant backups
- Migration complexity increases (run migrations across N schemas)
- Best for: 50-500 enterprise tenants with compliance requirements

### Database-Per-Tenant

- Separate database instance per tenant
- Maximum isolation (GDPR, HIPAA, financial compliance)
- Expensive to operate at scale
- Best for: Enterprise SaaS with strict data residency requirements

---

## AUTHENTICATION & AUTHORIZATION

### Auth Stack Decision Tree

```
Solo/small project:     NextAuth / Auth.js (free, self-hosted)
Growing SaaS:           Clerk or WorkOS (DX-focused, worth the cost)
Enterprise SSO needed:  WorkOS (SAML, SCIM, directory sync)
Custom requirements:    Build on top of jose + argon2 + your own DB
```

### RBAC Pattern (Standard SaaS)

```
User → Role(s) → Permission(s) → Resource

Roles: Owner, Admin, Member, Viewer, Billing (common SaaS starter set)
Permissions: resource:action (e.g., "reports:read", "users:invite")

DB Schema:
  users (id, email, ...)
  organizations (id, plan, ...)
  org_members (user_id, org_id, role)
  roles (id, name, org_id | null)  ← null = global role
  role_permissions (role_id, permission)
```

### Session Management

- JWT: Stateless, short-lived (15 min access + 7 day refresh). Store refresh in HttpOnly cookie.
- Database sessions: Stateful, instantly revocable. Better for security-sensitive apps.
- Never store JWTs in localStorage (XSS vulnerable). Use HttpOnly cookies only.

---

## SUBSCRIPTION BILLING (Stripe)

### Pricing Model Patterns

| Model        | When                | Implementation                |
| ------------ | ------------------- | ----------------------------- |
| Flat monthly | Simple, predictable | Stripe Products + Prices      |
| Per-seat     | Team tools          | Quantity on subscription      |
| Usage-based  | API, infra, AI      | Stripe Meters + usage records |
| Hybrid       | Enterprise          | Base fee + overage            |
| Freemium     | Consumer SaaS       | Free tier + upgrade triggers  |

### Stripe Integration Checklist

- [ ] Webhook endpoint with signature verification (`stripe.webhooks.constructEvent`)
- [ ] Handle: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] Idempotency keys on all Stripe API calls
- [ ] Store: `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end` on org/user
- [ ] Trial period: Set `trial_period_days` on subscription, gate features by `status === 'trialing' || 'active'`
- [ ] Failed payment: Dunning flow — email D+1, D+3, D+7, then downgrade

### Revenue Recognition

- Record MRR, churn, expansion, contraction in your own DB — don't rely on Stripe alone
- Events to track: upgrade, downgrade, cancel, reactivate, trial_start, trial_convert, trial_expire

---

## ONBOARDING FLOW

### Minimum Viable Onboarding

```
Step 1: Sign up (email/password or OAuth)
Step 2: Verify email (send magic link or OTP)
Step 3: Create organization / workspace
Step 4: Invite first team member (optional, but increases retention)
Step 5: Complete one core action (the "aha moment")
Step 6: Prompt to connect key integration or set up first item
```

### Instrumentation (Non-Negotiable)

Track every onboarding step as an event:

```javascript
analytics.track("onboarding_step_completed", {
  user_id,
  org_id,
  step: "email_verified",
  duration_seconds,
  timestamp,
});
```

Drop-off at any step = product problem. Fix it within the sprint.

### Activation Metric

Define ONE activation event = "user has experienced core value."
Optimize everything to get new users there within 5 minutes.

---

## FEATURE FLAGS

### When to Use

- Dark launches (deploy without enabling)
- A/B testing
- Kill switches for risky features
- Gradual rollouts (10% → 50% → 100%)
- Enterprise-specific features

### Implementation Options

- **LaunchDarkly:** Full-featured, expensive ($)
- **Unleash:** Open source, self-hosted, solid
- **Growthbook:** Open source + A/B testing
- **DIY (simple):** `feature_flags` table in DB with `org_id`, `flag_key`, `enabled`. Cache in Redis with 60s TTL.

### Pattern

```typescript
// Never: if (org.plan === 'pro' && !isHoliday && env === 'prod')
// Always:
const canExport = await flags.isEnabled("bulk-export", { orgId, userId });
```

---

## USAGE METERING (Usage-Based Billing)

### Architecture

```
Event → Queue (Pub/Sub / Kafka) → Aggregator → Stripe Meters

1. App emits usage event on every billable action
2. Queue buffers events (no blocking on billing path)
3. Aggregator batches and sends to Stripe Meter API
4. Stripe handles invoicing at period end
```

### OpenMeter (Recommended)

- Open source usage metering + Stripe integration
- Handle deduplication, aggregation, real-time usage display
- Self-host on GCP or use cloud offering

---

## SAAS METRICS TO TRACK FROM DAY ONE

```
Growth:
  MRR / ARR         — Monthly/Annual Recurring Revenue
  MRR Growth Rate   — Month-over-month %
  Trial Conversion  — Trial → Paid %

Retention:
  Churn Rate        — % of MRR lost per month (<2% = good, <1% = great)
  Net Revenue Retention (NRR) — >100% = expansion outweighs churn
  DAU/MAU           — Engagement ratio

Unit Economics:
  CAC               — Customer Acquisition Cost
  LTV               — Lifetime Value
  LTV:CAC           — Target >3:1
  Payback Period    — Target <12 months

Product:
  Activation Rate   — % completing activation event
  Time to Activate  — Minutes from signup to aha moment
  Feature Adoption  — % of users using each feature
```

---

## SAAS LAUNCH CHECKLIST

### Pre-Launch (Technical)

- [ ] All API endpoints authenticated and authorized
- [ ] Rate limiting on all public endpoints
- [ ] Error tracking (Sentry or equivalent)
- [ ] Uptime monitoring with alerting
- [ ] Database backups verified and tested (restore drill)
- [ ] Performance baseline: p95 <200ms on core endpoints
- [ ] Security scan: OWASP ZAP or Burp Suite
- [ ] Dependency audit: `npm audit` / `pip audit` / Snyk
- [ ] Secrets rotation tested
- [ ] Runbooks written for top 5 failure scenarios

### Pre-Launch (Product)

- [ ] Onboarding flow tested end-to-end by 5 people who aren't you
- [ ] Billing tested in test mode (upgrade, downgrade, cancel, failed payment)
- [ ] Email deliverability verified (SPF, DKIM, DMARC)
- [ ] Legal: Privacy Policy, Terms of Service, Cookie Policy
- [ ] Support channel ready (Intercom, email, Slack)

### Post-Launch (First 30 days)

- [ ] Watch error rates daily
- [ ] Interview every churned user
- [ ] Track activation funnel daily
- [ ] Set up weekly metrics review

---

## WEBHOOK PATTERNS (Send + Receive)

### Sending Webhooks (Your SaaS → Customers)

```typescript
// Production webhook delivery with retry + signing
async function deliverWebhook(endpoint: WebhookEndpoint, event: WebhookEvent) {
  const payload = JSON.stringify({ id: event.id, type: event.type, data: event.data });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = computeHmacSha256(`${timestamp}.${payload}`, endpoint.secret);

  const attempt = async (retryCount: number): Promise<void> => {
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `t=${timestamp},v1=${signature}`,
          "X-Webhook-Id": event.id,
          "X-Retry-Count": String(retryCount),
        },
        body: payload,
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (retryCount >= 5) {
        await markEndpointFailed(endpoint.id, err.message);
        return;
      }
      // Exponential backoff: 30s, 5m, 30m, 2h, 8h
      const delays = [30, 300, 1800, 7200, 28800];
      await scheduleRetry(event, endpoint, delays[retryCount]);
    }
  };
  await attempt(0);
}
```

### Receiving Webhooks (Customer Events → Your SaaS)

```typescript
// Always verify signatures before processing
export async function POST(request: Request) {
  const body = await request.text(); // Raw body for signature verification
  const signature = request.headers.get("x-signature");
  const timestamp = request.headers.get("x-timestamp");

  // 1. Verify timestamp (prevent replay attacks — reject if >5 min old)
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) {
    return new Response("Timestamp too old", { status: 400 });
  }

  // 2. Verify signature
  const expected = computeHmac(`${timestamp}.${body}`, process.env.WEBHOOK_SECRET);
  if (!timingSafeEqual(signature, expected)) {
    return new Response("Invalid signature", { status: 401 });
  }

  // 3. Acknowledge immediately — process async
  const event = JSON.parse(body);
  await queue.enqueue("webhook.process", event); // Don't process synchronously
  return new Response("OK", { status: 200 }); // Return 200 fast, process in background
}
```

---

## PRODUCT-LED GROWTH (PLG) PATTERNS

### PLG Architecture

```
Acquisition:    Free tier / freemium → user tries before buying
                Free = real value (not crippled), with natural expansion limits

Activation:     Shortest path to "aha moment" (value experienced, not just signed up)
                Instrument: time-to-first-value metric. Target: <5 minutes.

Retention:      Habit loops → user keeps coming back without prompting
                Weekly digest emails with value metrics (their data, not generic)

Expansion:      User hits free tier limit → natural upgrade prompt in context
                Team expansion: "Invite a colleague" at moments of realized value

Revenue:        Self-serve → no sales motion for low ACV deals
                PQL (Product Qualified Lead): user who hit expansion trigger → sales qualified
```

### Usage-Gating (Not Feature-Gating)

```typescript
// Gate on usage, not features — users experience value, then hit a limit
const PLAN_LIMITS = {
  free: { transactions: 1000, alerts: 10, retention_days: 30 },
  starter: { transactions: 10000, alerts: 100, retention_days: 90 },
  pro: { transactions: 100000, alerts: 1000, retention_days: 365 },
} as const;

async function checkUsageGate(orgId: string, resource: keyof typeof PLAN_LIMITS.free) {
  const org = await getOrg(orgId);
  const limit = PLAN_LIMITS[org.plan][resource];
  const usage = await getMonthlyUsage(orgId, resource);

  if (usage >= limit * 0.8) {
    // Warn at 80% — don't let them hit the wall unaware
    await sendUsageWarningEmail(org, resource, usage, limit);
  }
  if (usage >= limit) {
    throw new UsageLimitError({
      resource,
      usage,
      limit,
      upgradeUrl: `/upgrade?reason=${resource}_limit`,
      currentPlan: org.plan,
      suggestedPlan: getNextPlan(org.plan),
    });
  }
}
```

---

## API-FIRST SAAS PATTERNS

### Developer-Facing API Design

```
Every public API must have:
  □ OpenAPI 3.1 spec (machine-readable, generates SDKs)
  □ API versioning: /v1/, /v2/ in URL path (header versioning for minor)
  □ Idempotency keys on all POST/PATCH operations
  □ Pagination: cursor-based, not offset
  □ Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
  □ Consistent error format: { error: { code, message, doc_url, request_id } }
  □ Webhook delivery for async events
  □ Interactive docs (Scalar or Redocly — better than Swagger UI)
  □ SDKs: TypeScript, Python, Java minimum (Speakeasy generates from OpenAPI)
  □ API changelog (public, semantic versioning)

Deprecation policy:
  Announce 6 months before any breaking change
  Keep old version alive 12 months after deprecation announcement
  Send email to all API users 30 days, 7 days, 1 day before removal
```
