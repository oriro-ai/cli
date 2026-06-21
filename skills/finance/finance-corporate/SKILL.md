---
name: finance-corporate
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Corporate finance — valuation, DCF analysis, capital structure, financial
  modeling, M&A, and corporate financial decision-making. Activate for questions
  about company valuation, DCF, WACC, capital structure, mergers, acquisitions,
  financial modeling, or any corporate finance topic. Sources: CFA Institute
  curriculum (principles), Damodaran NYU public lectures and textbooks, Berk & DeMarzo.
---

# Corporate Finance

## Valuation methods

### DCF (Discounted Cash Flow)

Most theoretically correct valuation method. Value = present value of all future cash flows.

**Free Cash Flow to Firm (FCFF):**
FCFF = EBIT × (1-tax rate) + D&A - ΔWorking Capital - CapEx

**Terminal value:**
Gordon Growth Model: TV = FCF × (1+g) / (WACC - g)
where g = sustainable long-term growth rate (typically GDP growth = 2-3%)

**Discount rate = WACC:**
WACC = (E/V × Re) + (D/V × Rd × (1-T))
E = market value of equity, D = market value of debt, V = E+D
Re = cost of equity (from CAPM), Rd = cost of debt, T = tax rate

**CAPM (Capital Asset Pricing Model):**
Re = Rf + β × (Rm - Rf)
Rf = risk-free rate (10-yr Treasury), β = systematic risk, Rm-Rf = equity risk premium (~5-7%)

**Enterprise Value:**
EV = NPV of all FCFFs = Equity value + Debt - Cash

### Comparable company analysis (Comps)

Value based on multiples of similar companies.
**EV/EBITDA:** Most common. Less affected by capital structure.
**P/E:** Price-to-earnings. Affected by capital structure and non-recurring items.
**EV/Revenue:** Used for high-growth companies not yet profitable.
**EV/EBIT:** Useful for capital-light businesses.

Process: Select comparable companies → Calculate their multiples → Apply to subject company

### Precedent transaction analysis

Similar to comps but uses acquisition multiples from past deals.
Includes control premium (20-30% above market) that comps don't.

## Capital structure

### Modigliani-Miller theorem

Proposition I (no taxes): Capital structure irrelevant to firm value.
Proposition II (no taxes): Cost of equity increases with leverage.
Real world: Taxes matter (debt creates tax shield). Distress costs matter.

**Optimal capital structure:** Balance tax shield from debt against expected bankruptcy costs.
Investment-grade companies: typically 20-40% debt.
High-growth companies: minimal debt (preserve flexibility).
Mature, stable cash flow businesses: can support high leverage (utilities, telecoms, LBOs).

### Cost of capital

**Debt financing:** Tax-deductible interest. Lower cost than equity. Creates financial risk.
**Equity financing:** No mandatory payments. More expensive than debt. No financial risk.

**Levered beta vs. unlevered beta:**
βL = βU × [1 + (1-T) × (D/E)]
To find unlevered beta of a business, remove the effect of leverage from comparable companies.

## Financial modeling best practices

**Separate inputs from calculations:** Blue cells = inputs/assumptions. Black cells = formulas.
**Consistent structure:** Every row is one item. Every column is one period.
**Forecast period:** Typically 5-10 years until terminal value.
**Sensitivity analysis:** Show how value changes with WACC and growth rate assumptions.
**Scenario analysis:** Base, bull, bear cases with different underlying assumptions.

## M&A fundamentals

**Acquisition premium:** Typically 20-40% over unaffected market price.
**Synergies:** Value justification for paying above standalone value.
Cost synergies: Headcount reduction, facility consolidation, procurement savings.
Revenue synergies: Cross-selling, market expansion. Harder to achieve.

**Accretion/Dilution analysis:**
Does the acquisition increase or decrease acquirer's EPS?
Accretive: Target P/E < Acquirer P/E (in stock deals) or synergies are large.
Dilutive: Must be justified by long-term strategic value or synergies.

**LBO (Leveraged Buyout):**
Acquire company using mostly debt. Returns driven by: cash flow paydown, multiple expansion, EBITDA growth.
Target IRR: 20-25%+. Hold period: 3-7 years.
Best LBO candidates: Stable cash flows, low existing debt, operational improvement potential, strong management.

Sources: Damodaran Online (pages.stern.nyu.edu/~adamodar — free), CFA Institute curriculum principles,
Berk & DeMarzo "Corporate Finance" (principles), Investopedia corporate finance content
