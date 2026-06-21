---
name: finance-options-derivatives
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Options and derivatives — calls, puts, pricing models, Greeks, risk management
  strategies, and futures fundamentals. Sources: CME Group education (free),
  Options Industry Council (free).
---

# Options and Derivatives

## Options fundamentals

### Call options

**Right to BUY** underlying asset at strike price on or before expiry.
Buyer pays premium. Benefits from price increase.
**Max loss:** Premium paid. **Max gain:** Unlimited.
Profitable when: Underlying price > Strike price + Premium.

### Put options

**Right to SELL** underlying asset at strike price on or before expiry.
Buyer pays premium. Benefits from price decrease.
**Max loss:** Premium paid. **Max gain:** Strike price - Premium.
Profitable when: Underlying price < Strike price - Premium.

## Moneyness

**In the money (ITM):** Has intrinsic value. Call: current > strike. Put: current < strike.
**At the money (ATM):** Current price ≈ strike price.
**Out of the money (OTM):** No intrinsic value. Call: current < strike.

## Black-Scholes pricing model

C = S₀N(d₁) - Ke^(-rT)N(d₂)
d₁ = [ln(S₀/K) + (r + σ²/2)T] / (σ√T)
d₂ = d₁ - σ√T

Variables: S₀=current price, K=strike, r=risk-free rate, T=time, σ=volatility.

## The Greeks

**Delta (Δ):** Option price change per $1 move in underlying. Call: 0 to 1. Put: -1 to 0.
**Gamma (Γ):** Delta's rate of change. High near expiry, at-the-money.
**Theta (Θ):** Time decay. Options lose value as expiry approaches. Negative for buyers.
**Vega (V):** Sensitivity to volatility. Long options benefit from rising volatility (VIX).
**Rho (ρ):** Sensitivity to interest rates. Less important for short-term options.

## Common strategies

**Covered call:** Own stock + sell call. Generates income. Caps upside.
**Protective put:** Own stock + buy put. Portfolio insurance.
**Bull call spread:** Buy lower call + sell higher call. Reduces cost. Caps gain.
**Iron condor:** Sell call spread + sell put spread. Benefits from low volatility.
**Straddle:** Buy call + put at same strike. Profits from large move either direction.

## Futures vs Options

Futures: Obligation to buy/sell at future date. Margin required.
Options: Right (not obligation). Premium paid upfront.
Futures mark-to-market daily. Options premium paid once.

Sources: CME Group Education (cmegroup.com/education — free), Options Industry Council
(theocc.com/resources — free), Investopedia (free)
