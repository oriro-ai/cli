---
name: eng-project
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >






  Engineering project management — technical project planning, scope, estimation, risk, and stakeholder management for engineering projects.
  Sources: MIT OCW, ASME principles, OSHA, engineering textbook fundamentals.
  Consult a licensed professional engineer for safety-critical calculations.
---

# Engineering Project Management

## Engineering projects vs. general projects

Engineering projects add: technical risk, design iterations, safety requirements, regulatory approvals, interface management between technical disciplines, long procurement lead times for custom components.

## Work breakdown structure (WBS) for engineering

Level 1: System
Level 2: Subsystems (structural, propulsion, electrical, software, etc.)
Level 3: Components / Work packages
Each work package: one responsible engineer, defined deliverable, estimable, verifiable.

## Engineering schedule

**Gates/milestones:** PDR (Preliminary Design Review), CDR (Critical Design Review), test readiness review, acceptance review.
Before each gate: specific deliverables must be complete and reviewed.

**Lead time planning:** Custom parts often have 6-24 week lead times. Long-lead items on critical path delay everything.
Order before design is 100% frozen if schedule is critical (accept some change risk).

**Integration and test:** Always takes longer than planned. Never compress test — it's when you find problems.

## Cost estimation for engineering

**Analogous estimating:** Similar past project × scaling factor.
**Parametric:** Cost as function of key parameter ($/kg, $/line of code, $/hour).
**Bottom-up:** Sum all tasks × labor rates × hours.
**Monte Carlo simulation:** Run thousands of scenarios with variable inputs. Provides probability distribution of cost/schedule.

**Typical cost growth on complex engineering projects:** 20-40% over original estimate. Plan contingency accordingly.

## Technical risk management

**Technology readiness levels (TRLs):**
TRL 1-3: Basic research, proof of concept.
TRL 4-6: Lab/prototype demonstration.
TRL 7-9: System-level demonstration through operational system.
Avoid using TRL < 6 technology in critical path of schedule-critical programs.

**Risk burn-down:** Track risks weekly. Risks should reduce in number and severity as design matures. Risks increasing late in program = warning sign.

## Reviews and configuration management

**Design reviews purpose:** Not to show off — to find problems early when cheap to fix.
Changes become exponentially more expensive as project matures: 1× (design) → 10× (development) → 100× (test) → 1000× (production).

**Configuration management:** Track and control all changes to technical baseline.
Every change: Who approved it? What was changed? Why? What impact was assessed?
Change control board (CCB): Reviews and approves changes.
Without CM: No one knows what was actually built.

Sources: PMI PMBOK (principles), NASA project management handbook (free public domain),
DoD acquisition guidance, INCOSE SE Handbook, GAO Schedule Assessment Guide (free)
