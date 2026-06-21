---
name: finance-startup
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Startup finance — unit economics, burn rate, runway, revenue models, financial
  projections, fundraising metrics, and investor-ready financial analysis.
  Activate for questions about startup financial planning, unit economics,
  LTV/CAC, burn rate, runway, financial models, or any startup-specific
  financial question. Sources: Y Combinator library, First Round Capital
  guides, Andreessen Horowitz public content, SBA.
---

# Startup Finance

## The metrics that matter

### Burn rate and runway

**Gross burn:** Total monthly cash spent.
**Net burn:** Monthly cash spent minus monthly revenue.
**Runway:** Cash in bank ÷ Net monthly burn = months until out of money.

**Example:**
Cash: $500,000
Monthly revenue: $30,000
Monthly expenses: $80,000
Net burn: $80,000 - $30,000 = $50,000/month
Runway: $500,000 / $50,000 = 10 months

**Rule of thumb:** Raise when you have 6+ months runway. Start the process with 9-12 months.
Fundraising typically takes 3-6 months — never start when desperate.

**Default alive vs. default dead:**
If expenses and revenue stay constant, do you run out of money before reaching profitability?
Before taking new money, know which state you're in.

---

## Unit economics — the foundation of every business

Unit economics: revenue and cost associated with ONE unit of the business.
One subscription customer. One transaction. One delivered order.

### LTV (Lifetime Value)

Total expected revenue from one customer over their entire relationship.

**For subscription:**
LTV = ARPU × Gross Margin % × (1 / Monthly Churn Rate)

Example:
ARPU: $50/month
Gross margin: 70%
Monthly churn: 2%
LTV = $50 × 0.70 × (1/0.02) = $50 × 0.70 × 50 = $1,750

### CAC (Customer Acquisition Cost)

Total sales and marketing spend ÷ Number of new customers acquired.

Example:
Monthly marketing spend: $10,000
Monthly sales team cost: $5,000
New customers acquired: 30
CAC = $15,000 / 30 = $500

### LTV:CAC Ratio

The most important metric for SaaS businesses.
**LTV:CAC ≥ 3:1** = viable business model.
**LTV:CAC < 1:1** = you're paying more to acquire customers than they're worth.

From example above: LTV = $1,750 / CAC = $500 = 3.5:1. Healthy.

### CAC Payback Period

Months to recover CAC from gross profit.
= CAC / (ARPU × Gross Margin %)
= $500 / ($50 × 0.70) = $500 / $35 = 14.3 months

Best-in-class: < 12 months. Concerning: > 24 months.

---

## Revenue models

### SaaS (Software as a Service)

Recurring subscription revenue.
**Metrics:** MRR, ARR, churn, expansion MRR, NRR.
**Advantage:** Predictable revenue; multiple expansion levers.

### Marketplace

Take rate on transaction value.
**Metrics:** GMV (Gross Merchandise Value), take rate, take.
**Challenge:** Two-sided acquisition problem.

### Transactional

Revenue per transaction.
**Metrics:** Volume × average transaction value × margin.
**Example:** Payment processing, e-commerce.

### Advertising

Revenue from showing ads.
**Metrics:** DAU/MAU, CPM, fill rate, eCPM.
**Challenge:** Need massive scale for meaningful revenue.

### Consumption/Usage-Based

Pay per use (API calls, compute, seats).
**Advantage:** Aligns cost with value; natural land-and-expand.
**Challenge:** Revenue harder to predict.

---

## SaaS metrics deep dive

### MRR (Monthly Recurring Revenue)

Sum of all recurring monthly subscription revenue.

**MRR movements:**

- New MRR: from new customers
- Expansion MRR: existing customers upgrading
- Churned MRR: lost customers
- Contraction MRR: downgrades

**Net MRR Churn:** (Churned MRR - Expansion MRR) / Starting MRR
Negative churn = expansion exceeds churn = compounding growth even with flat new sales.

### ARR (Annual Recurring Revenue)

MRR × 12.
Standard for reporting to investors for annualized view.

### Churn

**Customer churn:** % of customers who cancel per month.
**Revenue churn:** % of MRR lost per month.
Revenue churn is more important (higher-value customers may churn more).

**Acceptable rates:**
Consumer SaaS: 3-5% monthly churn (high is normal)
SMB SaaS: 1-2% monthly churn
Enterprise: < 1% monthly churn (or annual contracts reduce monthly calc)

### NRR (Net Revenue Retention) / NDR

(Beginning ARR + Expansion - Contraction - Churn) / Beginning ARR

Best-in-class: > 120% (existing customers grow 20%+ annually even without new customers)
Good: 100-110%
Concerning: < 90%

### Rule of 40

Revenue growth rate % + Profit margin % ≥ 40.
Balances growth and profitability.
Example: 50% growth rate + -10% EBITDA margin = 40. Passes.
Example: 20% growth rate + 10% profit margin = 30. Fails.

---

## Financial projections

### Bottom-up model

Build from first principles:

- How many sales reps can you hire?
- What's average quota per rep?
- What's average sales cycle?
- What's the conversion rate?
  → Generates realistic revenue forecast

Don't start with "if we capture 1% of a $10B market."
Start with: "We can hire 3 sales reps in Q1, each closing 2 accounts/month at $2K ARR."

### Three-statement model

**Income Statement (P&L):** Revenue - Expenses = Net Income/Loss
**Balance Sheet:** Assets = Liabilities + Equity (snapshot of what you own and owe)
**Cash Flow Statement:** Operating + Investing + Financing cash flows

**For early startups:** Focus on cash flow statement. Accrual accounting P&L can show profit while you're running out of cash.

### Scenario modeling

Base case: Most likely.
Bull case: Everything goes right.
Bear case: Revenue takes 6 months longer; costs 20% higher.

Investors want to see you've thought through multiple scenarios.
Be honest about assumptions. Overly optimistic projections destroy credibility.

---

## Fundraising milestones

### Pre-seed ($0-$500K)

Stage: Idea/MVP
Use of funds: Prototype, validate, early team
Metrics: Nothing yet required; compelling story + team

### Seed ($500K-$3M)

Stage: Early traction
Use of funds: Hire first team, achieve product-market fit
Metrics: 5-10 paying customers or strong user growth; engagement data

### Series A ($3M-$15M)

Stage: Proven product-market fit
Use of funds: Scale go-to-market
Metrics: $1M+ ARR (or equivalent traction), clear retention, unit economics improving
Growth: 3× revenue YoY minimum competitive; 2× minimum to get meeting

### Series B ($15M-$50M)

Stage: Scaling
Metrics: $5M+ ARR, proven growth engine, improving efficiency

---

## SAFE and convertible note mechanics

See legal-startup skill for term details.

**Dilution calculation:**
SAFE with $1M cap, $100K invested.
New round at $4M pre-money valuation.
SAFE converts as if company were worth $1M cap.

New round: $4M pre-money + $2M investment = $6M post-money.
New investors own: $2M / $6M = 33.3%

SAFE conversion: $100K / $1M cap = 10% (based on cap valuation).
But this is calculated on post-money including SAFE:
After conversion and new investment, SAFE owns approximately 10%×($1M/$6M) ≈ 1.67%.

Use a cap table calculator (Carta, Pulley) for actual dilution — the math compounds quickly.

Sources: Y Combinator startup resources (ycombinator.com/library),
SBA financial guides (sba.gov), Andreessen Horowitz public essays on metrics,
OpenVC resources, Investopedia startup metrics definitions
