---
watermark: ORIRO
disable-model-invocation: true
name: fintech-builder
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >





  Fintech development — payment processing, KYC/AML, PCI DSS, banking APIs, financial data, and compliance for financial applications.
  Sources: Stripe docs, Anthropic docs, Sanity/Contentful docs, industry-specific technical resources.
---

# Fintech Development

## Compliance fundamentals (US)

### KYC (Know Your Customer)

**Legal requirement for:** Banks, brokerages, money transmitters, crypto exchanges.
**Requirements:** Verify identity (name, DOB, address, SSN/TIN or government ID).
**CDD (Customer Due Diligence):** Understand nature of customer relationship, expected activity.
**EDD (Enhanced Due Diligence):** Higher-risk customers (PEPs, high-risk countries, large transactions).

### AML (Anti-Money Laundering)

**SAR (Suspicious Activity Report):** File with FinCEN for suspicious transactions.
**CTR (Currency Transaction Report):** File for cash transactions > $10,000.
**OFAC screening:** Check customers against sanctions lists before onboarding. Stripe Identity, Persona, or Jumio handle this.

### Money transmission licensing

If moving money between parties, likely a Money Services Business (MSB).
**FinCEN registration:** Required for MSBs.
**State MTLs (Money Transmitter Licenses):** Required in most states. Each state is separate. 50-state rollout = 1-3 years.
**Banking-as-a-service (BaaS) partner:** Use Unit.co, Increase, Column, Synapse to operate under a bank's charter while building.

## Payment rails

### Card payments (Stripe)

```ts
// Payment Intent for card payments
const paymentIntent = await stripe.paymentIntents.create({
  amount: 5000, // $50.00 in cents
  currency: "usd",
  automatic_payment_methods: { enabled: true },
  capture_method: "automatic", // or 'manual' for auth + capture split
  metadata: { orderId: order.id },
});

// Return client_secret to frontend for Stripe.js
```

### ACH transfers (US bank accounts)

```ts
// Stripe ACH (takes 2-5 business days)
const paymentIntent = await stripe.paymentIntents.create({
  amount: 100000, // $1,000.00
  currency: "usd",
  payment_method_types: ["us_bank_account"],
  payment_method_options: {
    us_bank_account: { financial_connections: { permissions: ["payment_method"] } },
  },
});
// Returns link to Plaid verification flow
```

### Real-time payments

**RTP (Real-Time Payments):** The Clearing House. Instant, 24/7.
**FedNow:** Federal Reserve's instant payment network (launched 2023).
Both require bank integration (directly or via BaaS partner).

## PCI DSS compliance

**Never handle raw card numbers** unless you have PCI DSS SAQ A-EP certification or higher.
Use Stripe.js / Stripe Elements → card data goes directly to Stripe, never touches your servers.
SAQ A: Redirect-only (Stripe Checkout). Simplest.
SAQ A-EP: JavaScript on your page. Stripe.js.
SAQ D: Full card data handled on your servers. Requires extensive audit.

## Financial data patterns

### Money storage

```ts
// ALWAYS store money as integers (cents/smallest unit)
// NEVER use floating point for money (0.1 + 0.2 = 0.30000000000000004)

const amount = 2999; // $29.99 in cents
const formatted = (amount / 100).toLocaleString("en-US", {
  style: "currency",
  currency: "USD",
}); // "$29.99"

// For complex calculations: use `dinero.js` or keep in cents
```

### Double-entry bookkeeping

```sql
-- Every financial transaction has equal debits and credits
-- Credits table tracks money flow
CREATE TABLE journal_entries (
  id         UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  amount     BIGINT NOT NULL,     -- Positive = credit, negative = debit
  currency   CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  entry_id   UUID NOT NULL        -- Groups related debits and credits
);
-- Sum of amount for any entry_id must always = 0
```

## Open Banking / Plaid integration

```ts
import { PlaidApi, Configuration } from "plaid";

const plaid = new PlaidApi(new Configuration({ basePath: PlaidEnvironments.sandbox }));

// Create link token for user to connect bank
const linkToken = await plaid.linkTokenCreate({
  user: { client_user_id: userId },
  client_name: "My App",
  products: ["transactions", "auth"],
  country_codes: ["US"],
  language: "en",
});

// Exchange public_token (from Plaid Link) for access_token
const { access_token } = await plaid.itemPublicTokenExchange({ public_token });
// Store access_token securely; use to fetch transactions
```

Sources: Stripe documentation (stripe.com/docs — free), Plaid documentation (plaid.com/docs — free), FinCEN guidance (fincen.gov — free), FFIEC AML examination manual (free), Unit.co documentation (free)
