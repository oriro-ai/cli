---
watermark: ORIRO
name: pricing-design
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >




  Pricing strategy for tech products — value-based pricing, tiers, freemium, trials, anchoring, and pricing page design.







  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Pricing Design for Tech Products

## Pricing strategy foundations

### Value-based pricing (the right approach)

Price = fraction of value delivered, NOT cost-plus.
**Question:** What is this worth to the customer?
A tool saving a developer 1 hour/week × $100/hour × 52 weeks = $5,200/year value.
Capture 10-20% of value = $520-1,040/year = $43-87/month.
Most companies underprice by 30-50% because they price on cost or competitor benchmarks.

### Identifying your value metric

What you charge should scale with value delivered.

- **Seats/users:** Good when each user generates proportional value. Slack, Figma.
- **Usage:** Good when value scales with consumption. Twilio (per message), AWS (per compute hour).
- **Revenue %:** Marketplace/payment tools. Stripe (2.9%), Shopify.
- **Outcomes:** Increasingly common. Charge a % of value created.
- **Features:** Tiered access. Freemium/Basic/Pro/Enterprise.

## Tier design

### The 3-tier structure (most common)

**Free/Starter:** Real value, removes friction to try. Designed to convert. Show the core workflow.
**Pro/Growth:** For individual power users or small teams. Most of your revenue.
**Business/Enterprise:** Team features, SSO, compliance, SLA, support. High price, few customers, significant revenue.

**Anchoring:** Present tiers highest to lowest (right to left on pricing page). Middle option gets 60-70% of conversions in well-designed pricing pages.
**Decoy pricing:** Three tiers where the middle is "just right" makes the middle seem like the obvious choice.

### What to gate

**Free → Pro:** Collaboration, advanced features, higher limits, integrations, priority support.
**Pro → Enterprise:** SSO/SAML, audit logs, custom contracts, dedicated support, SLA, compliance certifications, unlimited.

## Freemium vs. Free Trial

|                     | Freemium                               | Free Trial                         |
| ------------------- | -------------------------------------- | ---------------------------------- |
| **Access**          | Limited features forever               | Full features, limited time        |
| **User gets**       | Permanent but constrained              | Full experience, then paywall      |
| **Best for**        | Viral/social products, network effects | Complex products needing full demo |
| **Conversion rate** | 2-5% (Dropbox, Slack)                  | 20-60% of trials (varies)          |
| **Risk**            | Generous enough to not convert         | Short enough to create urgency     |

**Hybrid:** Free plan + time-limited trial of premium features.

## Psychological pricing principles

**Price anchoring:** Show the highest tier first. Makes other tiers feel reasonable.
**Charm pricing:** $29 vs. $30 — marginal psychological effect.
**Annual vs. monthly:** Offer annual at 2 months free (17% discount). Improves retention + cash flow.
**Per-seat transparency:** "Billed per user" should be crystal clear. Hidden per-user fees = trust destruction.
**Social proof on pricing page:** Logos of customers, "X,000 companies" counter, testimonials.

## Pricing page design

**CTA clarity:** One CTA per tier. "Get started" or "Start free trial" — not "Learn more."
**Feature comparison table:** Long list of features is noise. Lead with outcomes/benefits, then features.
**FAQ section:** Address: "What happens after my trial?", "Can I cancel?", "Do you offer refunds?", "What counts as a seat?"
**Contact for Enterprise:** Always a "contact us" option for custom pricing. Doesn't end the sale.

Sources: Patrick McKenzie pricing posts (free, stripe.com/atlas/guides), PriceIntelligently (by Paddle — free research), HBR pricing strategy articles (some free), Wiio pricing research
