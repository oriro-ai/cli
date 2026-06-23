---
watermark: ORIRO
disable-model-invocation: true
name: legal-startup
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Startup legal fundamentals — term sheets, equity, SAFE notes, cap tables,
  investor rights, board governance, convertible instruments, and venture
  financing. Activate for questions about raising money, term sheets, dilution,
  cap tables, SAFEs, convertible notes, investor rights, or any startup
  funding legal question. Sources: NVCA model documents, Y Combinator SAFE
  documentation, Cornell LII, Cooley LLP public guides.
---

# Startup Legal — Funding and Equity

## The fundraising instruments

### SAFE (Simple Agreement for Future Equity)

Created by Y Combinator. Now the standard early-stage instrument.
Investor gives money today → receives equity at the next priced round.

**Not debt:** No maturity date, no interest, no repayment obligation.
**Better for founders:** Clean cap table, no debt overhang.
**Risk for investors:** No guaranteed return if no future round occurs.

**Key SAFE terms:**
**Valuation cap:** Maximum company valuation at which SAFE converts.
Example: $5M cap. Company raises at $10M valuation. SAFE converts as if valuation = $5M.
→ SAFE investor gets 2× the ownership percentage compared to new investors.

**Discount:** SAFE converts at a discount to the next round price.
Example: 20% discount. New round price = $1.00/share. SAFE converts at $0.80/share.
→ More shares for SAFE investor than new investors paying full price.

**MFN (Most Favored Nation):** If future SAFEs have better terms, this SAFE gets updated too.
Common in pre-money SAFEs with no cap.

**Post-money vs. Pre-money SAFE:**
Y Combinator shifted to post-money SAFE in 2018.
Post-money: valuation cap calculated AFTER the SAFE investment.
More founder-friendly: ownership easier to predict.

### Convertible Notes

Debt that converts to equity at a future priced round.
Unlike SAFEs: has maturity date (typically 18-24 months) and interest rate (typically 5-8%).

**Why SAFEs now dominate:** No maturity date pressure, simpler, no interest accrual.
Convertible notes remain common outside Silicon Valley.

---

## Term sheets

Non-binding summary of investment terms. Negotiating a term sheet is the critical moment.

### Economics terms

**Pre-money valuation:** Company value before the investment.
**Post-money valuation:** Pre-money + investment amount.
**Ownership percentage:** Investment / Post-money valuation.

Example:
Pre-money: $10M
Investment: $2M
Post-money: $12M
Investor ownership: $2M / $12M = 16.7%

**Option pool:** Shares reserved for future employee equity.
Term sheets often require option pool to be created BEFORE the investment (dilutes founders, not investors).
Negotiate: create option pool from the post-money total if possible.

**Liquidation preference:**
In a sale, investors get paid before common shareholders.
1× non-participating: get 1× investment back, then done.
1× participating: get 1× back PLUS share in remaining proceeds.
2× or higher: increasingly founder-unfriendly.

Standard in current market: 1× non-participating preferred.

**Anti-dilution protection:**
Broad-based weighted average: most common, most founder-friendly.
Ratchet: most investor-friendly, now rare.
Protects investors if you raise at a lower valuation (down round).

### Control terms

**Board composition:**
Pre-Series A: often no board, or 3 seats (2 founders, 1 investor).
Series A: typically 5 seats (2 founders, 2 investors, 1 independent).
Board controls major company decisions.

**Protective provisions (investor veto rights):**
Common for investors to require consent for:

- Selling the company
- Issuing new equity
- Taking on significant debt
- Changing investor rights
- Dividends

Negotiate: keep list narrow. Broad protective provisions limit operational freedom.

**Pro rata rights:** Right to invest in future rounds to maintain ownership percentage.
Standard request. Reasonable to grant.

**Information rights:** Right to receive financial statements.
Standard. Typically quarterly unaudited, annual audited.

**Right of first refusal (ROFR):** Right to buy shares before founder/employee sells to third party.
Standard. Reasonable.

**Co-sale right (tag-along):** Right to sell pro-rata shares alongside founders.
Standard. Reasonable.

---

## Cap table

Track from day one. Every equity issuance, every round, every option grant.

**Fully diluted:** Includes all potential shares — issued, options granted, warrants, SAFEs.
All ownership percentages should be calculated on fully diluted basis.

**Example Series A cap table:**

```
Founder 1:          1,000,000 shares   36.4%
Founder 2:            800,000 shares   29.1%
Employee option pool:  300,000 shares   10.9%
Seed SAFE (converted):  200,000 shares    7.3%
Series A investor:      450,000 shares   16.4%
Total:               2,750,000 shares  100.0%
```

**Tools:** AngelList's Carta, Pulley, or simple spreadsheet early on.

---

## 83(b) Election

**Critical for founders with vesting.** Must file within 30 days of receiving restricted stock.

**Without 83(b):** Pay ordinary income tax on the value of shares as they vest.
If company is worth $10M when shares vest, you owe tax on that value.

**With 83(b):** Pay tax on the (usually tiny) value at time of grant.
At grant: company worth $0 or very little → tax is minimal or zero.
All future appreciation is capital gains (lower rate) when you sell.

File Form 83(b) with IRS within 30 days. Send a copy to your company. Keep a copy.
Missing the deadline cannot be fixed. This is a time-sensitive action.

---

## Key documents to have from day one

**Founders' Agreement / Co-Founder Agreement:**

- Ownership splits
- Roles and responsibilities
- Vesting schedules
- What happens if a co-founder leaves
- IP assignment (each founder assigns all prior work to the company)
- Decision-making authority

**Proprietary Information and Invention Assignment (PIIA / CIIAA):**
Every employee and contractor must sign.
Assigns all IP created for the company to the company.
Without this: employees may claim ownership of their work product.

**Stock option plan:**
Board-approved plan governing all option grants.
Typically 409A valuation updated annually.

Sources: Y Combinator SAFE documentation (ycombinator.com/documents),
NVCA Model Venture Capital Financing Documents (nvca.org),
Cooley GO resources (cooleygo.com), Gunderson Dettmer startup guides,
IRS Form 83(b) instructions, Cornell LII securities law
