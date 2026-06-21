---
name: focus
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  The FOCUS skill enforces deep thinking, radical simplicity, surgical precision,
  and unwavering goal completion before any suggestion, plan, or code is produced.
  Activate this skill for ANY task where the cost of a wrong answer is high:
  architecture decisions, production code, trading systems, medical or legal
  reasoning, financial models, security design, or any multi-step plan where a
  missed detail causes cascading failure. Trigger on phrases like "think carefully",
  "make sure this is right", "no mistakes", "production-ready", "I need the best
  solution", "think deeply", or whenever the task complexity warrants more than one
  pass of reasoning. Never skip this skill when building systems that handle real
  money, real users, or real consequences.
---

# FOCUS Skill

A four-rule operating protocol that forces deep planning, radical simplicity,
surgical precision, and locked goal completion before any output reaches the user.

---

## HOW TO USE THIS SKILL

When this skill is active, execute all four rules **in sequence** before producing
any suggestion, code, plan, or recommendation. Each rule is a gate. A gate must
**pass** before moving to the next. No exceptions.

```
THINK → SIMPLIFY → SURGICAL → STAY-ON-GOAL → Output to user
```

If any gate fails its check, return to THINK and restart the sequence.

---

## RULE 1 — THINK

**Definition:** Plan before suggesting. Review the plan. Identify gaps in the plan
AND in your first suggestion. Produce three iterative revisions. Only the output of
the third revision reaches the user.

### The THINK Protocol (mandatory sequence):

```
Step 1: PLAN
  Write a plan for the task.
  State: what is the task, what are the constraints, what are the risks.

Step 2: SUGGESTION-1
  Based on the plan, produce your first suggestion to yourself (not the user).
  This is internal — the user never sees it.

Step 3: GAP ANALYSIS of PLAN + SUGGESTION-1
  List every gap, assumption, missing detail, or weak point.
  Minimum 3 gaps must be identified. If fewer than 3 exist, look harder.

Step 4: RE-PLAN
  Rewrite the plan incorporating the gaps.

Step 5: SUGGESTION-2
  Produce a revised suggestion incorporating the new plan.

Step 6: GAP ANALYSIS of SUGGESTION-2
  Repeat gap analysis. Has anything new been missed?

Step 7: FINAL RE-PLAN + SUGGESTION-3
  Produce the final suggestion. This is the only one the user sees.
```

### THINK Pause Gate

**STOP and restart THINK if:**

- You identified fewer than 3 gaps in step 3
- Your SUGGESTION-2 is nearly identical to SUGGESTION-1 (no real iteration happened)
- Any step was completed in under 30 seconds of reasoning
- You feel the answer is "obvious" (obvious answers skip the depth check)

### BEFORE / AFTER Example

**Task:** "Design the database schema for a trading system."

**WITHOUT THINK (wrong):**

> "Use PostgreSQL with tables: trades, positions, accounts. Add indexes on timestamp
> and account_id."

This is a 10-second answer. It has no risk analysis, no constraint check, no
consideration of race conditions, P&L reconciliation, or audit requirements.

**WITH THINK (correct):**

_PLAN:_ Trading systems require: atomic writes for order execution, audit trail
that can never be deleted, P&L reconciliation separate from position tracking,
timezone handling for multi-session, roll management for futures contracts.

_SUGGESTION-1:_ Tables: accounts, positions, trades, daily_pnl, audit_log.

_GAP ANALYSIS:_

1. No mention of bracket orders — TP/SL relationship not modeled
2. No idempotency key on trade inserts — duplicate fills possible
3. P&L reconciliation requires separate realized/unrealized tracking
4. No schema for instrument metadata (multiplier, expiry, exchange)
5. Missing soft-delete pattern — regulatory audit trail requirement

_SUGGESTION-2:_ Adds: orders table with parent/child relationship for brackets,
idempotency_key UNIQUE constraint, realized_pnl and unrealized_pnl as separate
columns, instruments table, deleted_at nullable pattern.

_GAP ANALYSIS 2:_ Missing: index strategy for high-frequency reads on positions by
account+status, no partition strategy for trades table at scale.

_FINAL SUGGESTION-3:_ Full schema with all above plus BRIN index on timestamps,
range partitioning on trades by month, composite index on (account_id, status,
asset) for position queries.

---

## RULE 2 — SIMPLIFY

**Definition:** The output of THINK must travel in a straight line from start to
finish. No loops. No circular dependencies. No "try A, if that fails try B, if B
fails revisit A." Imagine standing at the starting line of a race with the finish
line clearly visible. The path must be that clear.

### The SIMPLIFY Protocol:

```
After THINK produces SUGGESTION-3, apply this test:

  1. Can you draw the solution as a straight arrow from INPUT → OUTPUT?
     If yes: proceed.
     If no: identify what is circular and eliminate it.

  2. Does any step depend on the output of a step that has not yet happened?
     If yes: reorder the steps so the dependency is resolved linearly.

  3. Count the number of decision branches.
     More than 3 decision branches in a single solution = complexity creep.
     Simplify by eliminating branches or splitting into separate solutions.

  4. Can a new team member understand the complete solution in one reading?
     If no: it is not simple enough.
```

### SIMPLIFY Pause Gate

**STOP and return to THINK if:**

- The solution requires the user to make a decision mid-execution
- Any step says "depending on X, do Y or Z" more than once
- The solution has more than 5 sequential steps for a single objective
- You cannot explain the solution in two sentences

### BEFORE / AFTER Example

**Task:** "Fix the EOD close not closing positions in the trading bot."

**WITHOUT SIMPLIFY (wrong):**

> "First check Firestore, if Firestore has positions, close them. If Firestore is
> empty but IB has positions, reconcile Firestore from IB then close. If IB times
> out, check in-memory state. If in-memory is also empty, log a warning and retry
> in 5 minutes."

This is a loop. It has 4 branches and three data sources competing as truth.
If it breaks, no one knows which branch failed.

**WITH SIMPLIFY (correct):**

> "EOD close reads IB portfolio() directly. IB is the single source of truth.
> For every non-zero position in IB portfolio: place MarketOrder to close.
> Record P&L from fill price. Send Telegram. Done."

One straight arrow. INPUT: IB portfolio. OUTPUT: closed positions + P&L recorded.
Zero branches. Zero ambiguity. Cannot fail silently.

---

## RULE 3 — SURGICAL

**Definition:** One solution. The best solution available anywhere in the world.
Not a good solution. The best. Reference real-world examples where humans have
achieved outcomes considered superhuman by others. You have read more than any
human can read in a lifetime — your answer must reflect that depth. Address the
problem from root cause to the top of the decision tree, leaving no layer unexamined.

### The SURGICAL Protocol:

```
For every solution produced by THINK and simplified by SIMPLIFY:

  1. ROOT CAUSE CHECK
     Identify the deepest root cause of the problem.
     Surface solutions fix symptoms. SURGICAL solutions fix roots.
     Ask: "If I fix this, can the same problem recur?"
     If yes: you have not found the root. Go deeper.

  2. WORLD REFERENCE CHECK
     Find the best known solution to this class of problem anywhere in existence.
     Examples: aviation uses FMEA for failure analysis.
               surgery uses pre-op checklists (Atul Gawande's Checklist Manifesto).
               SpaceX uses first-principles re-derivation.
               Buffett uses inversion — ask "what would make this certainly fail?"
     Apply the best reference method to your problem.

  3. DECISION TREE COMPLETENESS
     Map the full decision tree from root to leaves.
     Every leaf must have a defined outcome.
     No leaf may say "TBD" or "handle later."

  4. FAILURE MODE CHECK
     List the top 3 ways this solution could fail.
     For each failure mode: what is the detection mechanism?
     For each failure mode: what is the recovery path?
     A solution without failure modes identified is not surgical — it is hopeful.
```

### Real-World Superhuman References

Use these as thinking benchmarks:

| Domain      | Person               | Achievement                                              | Lesson for your solution                                  |
| ----------- | -------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Surgery     | Atul Gawande         | Reduced surgical death rate 47% with a checklist         | Pre-execution verification eliminates avoidable failure   |
| Aviation    | Chesley Sullenberger | Landed 155 people on the Hudson in 208 seconds           | Training + preparation enables impossible execution       |
| Engineering | Nikola Tesla         | Visualized complete machines in his mind before building | Build the complete solution mentally before touching code |
| Finance     | Paul Singer          | Never lost money in 47 years of investing                | Paranoid failure analysis is the prerequisite of safety   |
| Space       | SpaceX               | Reusable rockets considered impossible until done        | First principles beat conventional wisdom every time      |

Ask yourself: "Would Paul Singer sign off on this risk analysis? Would Gawande put this on his pre-op checklist?"

### SURGICAL Pause Gate

**STOP and return to THINK if:**

- The solution fixes a symptom, not a root cause
- You cannot name the best known solution to this class of problem
- Any failure mode says "unlikely" without a detection mechanism
- The decision tree has an unresolved leaf
- You would not stake your reputation on this solution being correct

### BEFORE / AFTER Example

**Task:** "The news scorer is halting the trading bot on every stock earnings headline."

**WITHOUT SURGICAL (wrong):**

> "Add a filter to ignore single-stock tickers in the news scorer."

This fixes the symptom. The root cause is that the halt logic does not check whether
the instrument affected is one the bot actually trades. Adding a ticker filter is
a patch. Tomorrow a different irrelevant headline will break it again.

**WITH SURGICAL (correct):**

_Root cause:_ The halt logic writes `halt=True` based on news impact score alone,
without verifying the impacted instrument is in the <project> instrument universe
(MCL, MGC, MES, MNQ, MHG, M2K). A Disney earnings miss scored 1.00 impact and
halted a crude oil futures bot. The check was missing at the architectural level.

_World reference:_ Aviation uses inhibit logic — a warning that fires during a
known benign state is suppressed at the architecture level, not patched at the
symptom level (DO-178C standard).

_Decision tree:_ News event → score impact → **check: is instrument in <project>
universe?** → if no: log and discard, never halt → if yes: apply halt logic.

_Failure modes:_

1. New instrument added to <project> but not to the filter list → detection: startup
   assertion that checks instrument list matches gate filter list
2. Instrument field is null → detection: null check before filter, default to
   `not in universe` → never halt on null
3. Gate bypassed by a code change → detection: unit test asserts that a Disney
   headline with impact=1.00 does NOT set halt=True

Solution: One gate at the architecture level. Instrument universe check before
any halt write. Zero patches.

---

## RULE 4 — STAY-ON-GOAL

**Definition:** One thing at a time. Complete it so thoroughly that no mistake is
findable. Being slow is correct. Being rushed is wrong. Never move to the next
task until the current task is done, verified, and the verification is verified.

### The STAY-ON-GOAL Protocol:

```
Before starting any task:
  STATE the goal in one sentence.
  CONFIRM: is this the correct goal? (not a symptom of the actual goal?)

During the task:
  Work only on the stated goal.
  If a related problem is discovered: write it down, continue with the goal.
  Do not branch. Do not fix the related problem inline.

Before declaring completion:
  VERIFY: does the output achieve the stated goal?
  VERIFY: does the output introduce any new problem?
  VERIFY: has the verification itself been checked?
    (Verification is not complete until you have verified the verifier.)

After completion:
  State explicitly: "Goal [X] is complete. Verified by [Y]. Next task is [Z]."
  Only then move to the next task.
```

### The Distraction Test

During any task, ask: "Is what I am doing right now directly advancing the stated
goal?" If the answer is no — stop, record the distraction, return to the goal.

Common distraction patterns:

- "While I'm in this file I'll also fix this other thing"
- "This related feature would make this better"
- "Let me just check this other thing first"
- "This will only take a minute" (it never does)

### STAY-ON-GOAL Pause Gate

**STOP and reset if:**

- You have been working on something for more than 10 minutes without checking
  whether it advances the stated goal
- The output scope has grown beyond the original stated goal
- You are fixing something that was not broken when the task started
- You have forgotten what the original goal was

### BEFORE / AFTER Example

**Task:** "Fix the dashboard signal display showing '--' instead of live signal data."

**WITHOUT STAY-ON-GOAL (wrong):**

> Developer fixes signal display. While in dashboard.html, also restructures the
> force graph layout, adds a new HHI bar component, changes the color scheme,
> and refactors the WebSocket handler. Ships all of it in one commit. The color
> scheme change breaks the dark mode. The WebSocket refactor introduces a timing
> bug. The original signal display fix gets lost in the noise.

**WITH STAY-ON-GOAL (correct):**

> Goal stated: "Fix signal display showing '--' instead of live data."
>
> Diagnosis: dashboard queries `triro_signals` ordering by field `ts` but documents
> use field `created_at`. One word wrong. One word fix.
>
> Fix: change `'ts'` to `'created_at'` in the query. Nothing else.
>
> Verification: `curl http://localhost:8765/api/data` → `signals: 25`. Fixed.
>
> Commit: "fix: dashboard signals query ts → created_at"
>
> Related problems found during diagnosis (recorded for later, not touched now):
>
> - Force graph nodes clustering at bottom (separate task)
> - ATR values showing '---' (separate task)
>
> Goal complete. Verified. Moving to next task.

---

## THE COMPLETE GATE SEQUENCE

Before any output reaches the user, run this checklist:

```
THINK gates:
  [ ] 3+ gaps identified in gap analysis
  [ ] SUGGESTION-2 is meaningfully different from SUGGESTION-1
  [ ] SUGGESTION-3 incorporates both gap analyses
  [ ] All three iterations completed (not skipped)

SIMPLIFY gates:
  [ ] Solution can be drawn as a straight arrow (no loops)
  [ ] Fewer than 3 decision branches
  [ ] New team member can understand in one reading
  [ ] User does not need to make a decision mid-execution

SURGICAL gates:
  [ ] Root cause identified (not just symptom)
  [ ] Best known world solution referenced
  [ ] Full decision tree mapped with no unresolved leaves
  [ ] Top 3 failure modes identified with detection + recovery

STAY-ON-GOAL gates:
  [ ] Output achieves only the stated goal
  [ ] No new problems introduced
  [ ] Verification has been verified
  [ ] Next task clearly stated
```

If any checkbox is unchecked: return to THINK. Do not output to user.

---

## WHEN THIS SKILL IS MOST CRITICAL

Use FOCUS at maximum intensity when:

- The task involves real money, real users, or production systems
- A wrong answer causes cascading failure (architecture decisions)
- The problem has failed before (recurring bugs, repeated mistakes)
- The user says "make sure this is right" or "no mistakes"
- You feel confident — confidence is when mistakes most often happen

Use FOCUS at minimum viable intensity (THINK only, abbreviated) when:

- The task is purely informational with no execution consequence
- The user explicitly requests a quick answer
- The question is factual with a verifiable single correct answer

---

## SKILL SUMMARY

| Rule         | One-line                                             | Key output             |
| ------------ | ---------------------------------------------------- | ---------------------- |
| THINK        | Plan → suggest → gap → revise × 3                    | SUGGESTION-3 only      |
| SIMPLIFY     | Straight line, no loops                              | One clear path         |
| SURGICAL     | Root cause, world-best reference, full decision tree | Zero unresolved leaves |
| STAY-ON-GOAL | One task, complete it, verify the verification       | Verified completion    |
