---
watermark: ORIRO
name: scope-estimation
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >







  Engineering scope estimation — breaking down work, estimating complexity, communicating uncertainty, and avoiding common estimation traps.




  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Engineering Scope Estimation

## Why estimation is hard

**Hofstadter's Law:** It always takes longer than you expect, even when you take into account Hofstadter's Law.
**Core problem:** You're estimating work that's never been done before. If it had been done before, you wouldn't need to estimate.
**Uncertainty types:** Technical uncertainty (how to build it), scope uncertainty (what exactly), dependency uncertainty (what else needs to happen).

## The three-point estimation method

Don't give a single number. Give a range.
**Optimistic (O):** Best case — everything goes right.
**Most Likely (M):** Normal case — some issues encountered.
**Pessimistic (P):** Worst case — major problems arise.

PERT estimate: (O + 4M + P) / 6
Standard deviation: (P - O) / 6

Example: Feature estimate
O = 3 days, M = 5 days, P = 12 days
PERT = (3 + 20 + 12) / 6 = 5.8 days ≈ 6 days
σ = (12 - 3) / 6 = 1.5 days
90% confidence interval: ~6 ± 2.5 days = 3.5 to 8.5 days

**Communicate the range:** "This will take 5-8 days, with 90% confidence."

## Breaking down work

**The 2-day rule:** No task should be estimated longer than 2 days. If it is, break it down further.
**Tasks must be verifiable:** "Implement auth" is not a task. "Implement JWT login endpoint that returns access and refresh tokens" is a task.

**Decomposition framework:**

1. Design/planning (often underestimated): ER diagram, API design, state machine.
2. Core implementation: The main feature work.
3. Error handling and edge cases (often 30% of total).
4. Tests: Unit, integration, E2E.
5. Documentation: Code comments, API docs, README updates.
6. Code review and feedback incorporation.
7. Deployment and verification.

**Missing from most estimates:**

- Integration work (connecting to other services)
- Security considerations (auth, input validation, rate limiting)
- Logging and observability
- Performance optimization to meet SLA
- Edge cases (what happens when X is null? When the network fails?)

## Common estimation traps

**The planning fallacy:** Optimism bias. People consistently underestimate time.
**Fix:** Reference class forecasting. How long did similar past tasks actually take?

**Anchoring:** First estimate mentioned becomes anchor. People adjust insufficiently from anchor.
**Fix:** Estimate independently before sharing. Reveal simultaneously (planning poker).

**Scope creep acceptance:** Saying yes to small additions without resetting estimate.
**Fix:** Any change to scope = new estimate or explicit acknowledgment of trade-offs.

**Integration tax:** Connecting two systems always takes longer than expected.
**Rule:** Add 30% to any estimate involving integration with external systems.

## Communicating estimates

**Confidence levels:**
High confidence (well-understood work): ±25%
Medium confidence (some unknowns): ±50%
Low confidence (significant unknowns): ±100%

**What to say:**
"Based on what I understand, this will take X days. My confidence level is [high/medium/low] because [reason]. The main unknowns are [X, Y, Z]. If we discover [major risk], the estimate could increase to [worst case]."

**What NOT to commit to:**
Exact dates when you have significant unknowns.
"We can definitely finish by [date]" when you're already behind.

Sources: McConnell "Software Estimation: Demystifying the Black Art" (principles), Steve McConnell cone of uncertainty, PERT estimation method (USAF, public domain), Kahneman planning fallacy research
