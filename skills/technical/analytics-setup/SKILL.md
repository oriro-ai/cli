---
name: analytics-setup
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >

  Analytics implementation — tracking setup, event design, funnel analysis, A/B testing, and data-driven product decisions.










  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Analytics Implementation

## Event tracking design

### Naming convention

```
Object Action: user_signed_up, post_published, payment_completed, button_clicked
```

Consistent naming from day one. Inconsistency = unusable data at scale.

### What to track

**Product events:**

- Acquisition: page_viewed (first session), signup_started, signup_completed, onboarding_step_completed
- Activation: first_key_action (varies by product — first post created, first file uploaded, first transaction)
- Retention: session_started, core_feature_used (daily/weekly)
- Revenue: plan_selected, trial_started, subscription_created, payment_failed
- Referral: share_clicked, invite_sent, referral_link_clicked

**Don't track everything.** Track actions that matter. Every event that's not used is noise.

## Implementation (Segment / Posthog)

### Segment

```ts
// Track event
analytics.track("post_published", {
  userId: user.id,
  postId: post.id,
  category: post.category,
  wordCount: post.wordCount,
  publishedAt: new Date().toISOString(),
});

// Identify user
analytics.identify(user.id, {
  email: user.email,
  plan: user.subscription.plan,
  createdAt: user.createdAt,
  company: user.company?.name,
});
```

### PostHog (self-hosted or cloud)

```ts
import posthog from "posthog-js";

// Initialize
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  loaded: (posthog) => {
    if (process.env.NODE_ENV === "development") posthog.opt_out_capturing();
  },
});

// Track
posthog.capture("post_published", { postId: post.id, category: post.category });

// Identify
posthog.identify(userId, { email, plan });
```

## Funnel analysis

```
Signup page view → Form submitted → Email verified → Onboarding started → Onboarding completed → Core action taken → Subscription
Step 1: 10,000 → Step 2: 5,000 (50%) → Step 3: 3,500 (70%) → Step 4: 2,800 (80%) → Step 5: 1,400 (50%) → Step 6: 840 (60%) → Step 7: 168 (20%)
```

Where is the biggest drop? That's where to focus.

## A/B testing

```ts
// PostHog feature flags for A/B tests
const variant = posthog.getFeatureFlag("checkout-cta-test");
// variant = 'control' or 'test'

// Show different UI based on variant
const ctaText = variant === "test" ? "Start free trial" : "Get started";
```

**Don't peek at results early** — statistical significance requires adequate sample size.
Calculate sample size before starting: need ~95% confidence, 80% power.

## Key metrics by product type

**SaaS:** DAU/WAU/MAU, DAU/MAU ratio (engagement), Activation rate, NRR.
**E-commerce:** Conversion rate, Cart abandonment, Average order value, Return rate.
**Content:** Page views, Time on page, Pages per session, Scroll depth, Return visitors.
**Marketplace:** Liquidity (listings → transactions), GMV, Take rate, NPS both sides.

## Data quality

**Source of truth:** Agree on ONE definition for each metric. "Active user" must mean the same thing everywhere.
**Validate tracking:** Use Segment debugger, PostHog event explorer, or browser console to verify events fire correctly.
**Data warehouse:** Segment → Snowflake/BigQuery/Redshift for complex analysis, not just dashboards.

Sources: Segment documentation (segment.com/docs — free), PostHog documentation (posthog.com/docs — free), Google Analytics 4 documentation (free)
