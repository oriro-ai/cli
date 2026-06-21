---
name: eng-chemical
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >


  Chemical engineering — reaction engineering, thermodynamics, transport phenomena, process design, safety, and scale-up.




  Sources: MIT OCW, ASME principles, OSHA, engineering textbook fundamentals.
  Consult a licensed professional engineer for safety-critical calculations.
---

# Chemical Engineering Fundamentals

## Material and energy balances

**Material balance:** Accumulation = In - Out + Generation - Consumption
Steady state: In = Out (+ Generation - Consumption for reactive systems)
**Energy balance:** Q - W_s = ΔH + ΔKE + ΔPE (steady-state, open system)

## Chemical kinetics

**Rate law:** r = k·[A]^m·[B]^n (where m,n = reaction orders determined experimentally)
**Arrhenius equation:** k = A·exp(-E_a/RT) (rate increases exponentially with temperature)
**Activation energy (E_a):** Energy barrier that reactants must overcome.

## Reactor design

**Batch reactor:** All reactants loaded; reaction proceeds until target conversion. Good for small-scale, specialty chemicals.
**CSTR (Continuous Stirred Tank Reactor):** Well-mixed. Concentration throughout = outlet concentration. Good for liquid phase, exothermic reactions (easy control).
**PFR (Plug Flow Reactor):** Concentration varies along length. More efficient than CSTR for high conversion.
**Design equations:**
CSTR: V = F_A0 · X / (-r_A)
PFR: V = F_A0 ∫₀ˣ dX/(-r_A)

## Thermodynamics

**Phase equilibrium:** Vapor-liquid equilibrium governs distillation.
Raoult's Law: p_i = x_i · P_i_sat (ideal behavior; vapor pressure weighted by mole fraction)
**Gibbs phase rule:** F = C - P + 2 (F = degrees of freedom, C = components, P = phases)

## Heat and mass transfer

**Fick's Law (diffusion):** J_A = -D_AB · dC_A/dz (flux proportional to concentration gradient)
**Heat exchanger design:** Q = U·A·ΔT_lm (U = overall heat transfer coefficient, ΔT_lm = log mean temperature difference)
Counter-current flow more efficient than co-current for heat exchangers.

## Process safety (HAZOP)

Hazard and Operability Study: Systematic review of process for hazards.
Guide words: None, More, Less, As well as, Part of, Reverse, Other than.
Applied to each process variable (flow, temperature, pressure, composition).
Layer of protection analysis (LOPA): Quantifies risk reduction from safety layers.
**NEVER scale up chemical processes without proper safety review.** Exotherms that are manageable at lab scale can be catastrophic at production scale.

Sources: Fogler "Elements of Chemical Reaction Engineering" (principles),
Perry's Chemical Engineers' Handbook (principles), AIChE safety guidelines
