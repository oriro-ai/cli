---
watermark: ORIRO
name: saas-builder
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  SaaS product development — multi-tenancy, subscription billing, onboarding, feature flags, and SaaS architecture patterns.





  Sources: Stripe docs, Anthropic docs, Sanity/Contentful docs, industry-specific technical resources.
---

# SaaS Product Development

## Multi-tenancy architecture

### Models

**Single database, shared schema:** All tenants in same tables. `tenant_id` column on every table. Simplest. RLS (Row-Level Security) enforces isolation.
**Database per tenant:** Full isolation. More complex. Higher cost. Required for data residency requirements.
**Schema per tenant (PostgreSQL):** Middle ground. Isolated but in same database.

### Row Level Security (PostgreSQL)

```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON posts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

Set `app.tenant_id` in your connection before queries. Postgres enforces the policy.

### Tenant resolution

**Subdomain:** `acme.yourapp.com` → tenant = acme. Common for B2B.
**URL path:** `yourapp.com/org/acme` → tenant from URL.
**Custom domain:** `app.acme.com` → custom domain mapped to tenant in DB.

```ts
// Middleware for subdomain resolution
function getTenantFromRequest(req: Request): string {
  const host = req.headers.get("host") ?? "";
  const subdomain = host.split(".")[0];
  if (subdomain && subdomain !== "www" && subdomain !== "app") return subdomain;
  return req.headers.get("x-tenant-id") ?? ""; // fallback for custom domains
}
```

## Subscription billing (Stripe)

### Products and prices

```ts
// Create product and price in Stripe
const product = await stripe.products.create({ name: "Pro Plan" });
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2900, // $29.00 in cents
  currency: "usd",
  recurring: { interval: "month" },
});
```

### Checkout flow

```ts
// Create checkout session
const session = await stripe.checkout.sessions.create({
  customer_email: user.email,
  payment_method_types: ["card"],
  line_items: [{ price: priceId, quantity: 1 }],
  mode: "subscription",
  success_url: `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  metadata: { userId: user.id },
});
return redirect(session.url);
```

### Webhook handling (always verify signature)

```ts
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await syncSubscription(event.data.object);
      break;
    case "customer.subscription.deleted":
      await cancelSubscription(event.data.object.customer);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailure(event.data.object);
      break;
  }
  res.json({ received: true });
});
```

## Feature flags

```ts
// Simple feature flag check
function isFeatureEnabled(feature: string, user: User): boolean {
  // Check: override table → plan features → percentage rollout
  const override = featureOverrides[user.id]?.[feature];
  if (override !== undefined) return override;

  const planFeatures = planConfig[user.subscription.plan];
  if (feature in planFeatures) return planFeatures[feature];

  return defaultFeatures[feature] ?? false;
}
```

For production: LaunchDarkly, Unleash (self-hosted), or Statsig.

## SaaS metrics to track

- MRR/ARR, MRR movements (new/expansion/contraction/churn)
- Churn rate (customer and revenue)
- NRR (Net Revenue Retention)
- CAC and LTV by acquisition channel
- Feature adoption rates
- Time to value (time from signup to first meaningful action)

Sources: Stripe documentation (stripe.com/docs — free), PGTune (for PostgreSQL config), Christoph Nakazawa SaaS patterns
