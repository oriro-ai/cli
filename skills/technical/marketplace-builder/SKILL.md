---
watermark: ORIRO
disable-model-invocation: true
name: marketplace-builder
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >


  Marketplace platforms — two-sided marketplaces, trust and safety, payments split, seller/buyer flows, and marketplace mechanics.



  Sources: Stripe docs, Anthropic docs, Sanity/Contentful docs, industry-specific technical resources.
---

# Marketplace Platform Development

## Two-sided marketplace fundamentals

### The chicken-and-egg problem

Most critical challenge: need supply to attract demand, need demand to attract supply.
**Strategies:**

- Single-side first: Build supply first (often cheaper/easier), then demand.
- Fake it until real: Manually fulfill early orders (DoorDash founders delivered themselves).
- Subsidy: Pay one side to participate initially.
- Niche focus: Dominate a narrow niche completely before expanding.

### Trust and safety

Both sides must trust each other and the platform.
**Verification:** Identity verification (driver's license, ID), professional licenses where needed, background checks.
**Ratings and reviews:** Both sides rate each other. Fraud detection for fake reviews.
**Escrow:** Hold buyer's payment until service/product delivered. Dispute resolution mechanism.
**Insurance:** Platform liability coverage. Many marketplace gig workers need coverage.

## Payment architecture

### Connected accounts (Stripe Connect)

```ts
// Create seller account
const account = await stripe.accounts.create({
  type: "express", // or 'standard', 'custom'
  country: "US",
  email: seller.email,
  capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
});

// Save account.id to seller profile
await db.seller.update({ where: { id: sellerId }, data: { stripeAccountId: account.id } });

// Create onboarding link
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/sellers/connect/refresh`,
  return_url: `${baseUrl}/sellers/connect/complete`,
  type: "account_onboarding",
});
return redirect(accountLink.url);
```

### Payment split (platform fee)

```ts
// Charge buyer; split payment to seller minus platform fee
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount,
  currency: "usd",
  // Platform takes 20%
  application_fee_amount: Math.round(totalAmount * 0.2),
  transfer_data: {
    destination: seller.stripeAccountId, // Seller receives 80%
  },
});
```

## Dispute resolution

**Pre-dispute:** Clear expectations set before transaction (photos, descriptions, terms).
**During dispute:** Message system captures all communication. Evidence submission.
**Resolution:** Automated rules for clear cases. Human review for complex cases.
**Escalation:** Clear escalation path. SLA for resolution.
**Chargebacks:** Platform liability policy. Seller protection terms.

## Key metrics for marketplaces

**GMV (Gross Merchandise Value):** Total transaction value. Top-line for marketplaces.
**Take rate:** Platform fee / GMV. Sustainable take rate by vertical: delivery ~15-30%, gig services ~15-25%, rental ~10-15%.
**Liquidity:** % of listings that result in transactions. Low liquidity = supply-demand mismatch.
**NPS by buyer and seller separately:** Two audiences, different needs.
**Repeat transaction rate:** % of buyers/sellers who transact again. Key retention signal.

## Trust signals

- Verification badges (ID, background check, professional license)
- Review scores with volume (100 reviews + 4.8 stars > 5 reviews + 5.0 stars)
- Response time indicator
- "Member since" duration
- Transaction count
- Verified payment method

Sources: a16z marketplace guides (free), Andreessen Horowitz marketplace content (free), Stripe Connect documentation (stripe.com/docs/connect — free), Platform Revolution (Parker/Van Alstyne — principles)
