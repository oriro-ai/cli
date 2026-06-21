---
name: eng-cryogenics
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Cryogenic engineering — low-temperature physics, cryogenic fluids (LOX, LH2,
  LNG, LN2), storage systems, insulation, safety, and transfer operations.
  Activate for cryogenic fuel handling, storage design, insulation selection,
  or any low-temperature engineering question.
  Sources: NIST Cryogenics (free), NASA cryogenic guidelines (public domain).
---

# Cryogenic Engineering

## What cryogenics covers

Cryogenics: Engineering below −150°C (123 K).
Critical to: Rocket propellants, MRI magnets, liquefied natural gas (LNG), particle accelerators, quantum computers.

## Key cryogenic fluids

| Fluid                 | Boiling point (atm) | Density (liquid) | Notes                                                                   |
| --------------------- | ------------------- | ---------------- | ----------------------------------------------------------------------- |
| Liquid nitrogen (LN2) | −196°C / 77 K       | 808 kg/m³        | Inert, cheap, widely used for cooling                                   |
| Liquid oxygen (LOX)   | −183°C / 90 K       | 1,141 kg/m³      | Rocket oxidizer, strong oxidizer, supports combustion                   |
| Liquid hydrogen (LH2) | −253°C / 20 K       | 70 kg/m³         | Highest Isp rocket fuel; extremely low density; wide flammability range |
| Liquid methane (LCH4) | −161°C / 112 K      | 424 kg/m³        | Rocket fuel; LNG transportation; ISRU candidate                         |
| Liquid helium (LHe)   | −269°C / 4 K        | 125 kg/m³        | MRI magnets, dilution refrigerators, superconductor cooling             |

## Thermodynamic behavior

### Boiling and flash vaporization

When pressure drops below saturation pressure, liquid flashes to vapor.
Transfer line pressure drop must account for flash vaporization.
Two-phase flow in transfer lines: avoid or account for — unpredictable pressure drops and potential water hammer.

### Ortho/para hydrogen

LH2 exists in two spin states: ortho-H₂ (75% at room temp) and para-H₂ (25% at room temp).
At 20 K: equilibrium is >99% para-H₂.
ortho→para conversion is exothermic. If not converted during liquefaction, conversion occurs during storage, releasing heat → boil-off.
Solution: Use catalysts (iron oxide, chromic oxide) during liquefaction to convert to para-H₂.

### Thermal stratification

In large cryogenic tanks, temperature gradients form. Top warmer → higher pressure.
"Rollover": Sudden mixing of stratified layers → rapid pressure rise → risk of relief valve opening and boil-off loss.
Mitigation: Mixing jets, pressure management systems.

## Insulation systems

### Vacuum jacket (Dewar flask)

Double-wall vessel with evacuated annular space.
Residual heat transfer: radiation + residual gas conduction.
Effective vacuum: < 10⁻³ Torr.

### Multi-layer insulation (MLI)

Alternating layers of aluminized Mylar (or double-aluminized Mylar) and fiberglass or silk net spacers.
Spacing critical — too tight = conduction dominant; too loose = radiation dominant.
Typical: 20-80 layers at 10-30 layers/cm.
Effective conductivity: 10⁻⁵ W/m·K (vs. 0.03 W/m·K for aerogel in air).
ONLY effective in vacuum. Worthless in air (gas conduction dominates).

### Foam insulation (external cryotanks)

Spray-on polyurethane foam. Primary function: prevents air liquefaction on tank surface.
At −253°C (LH2 tank), air liquefies on uninsulated surface → dangerous LOX accumulation.
Space Shuttle external tank foam: significant source of debris (Columbia).

### Vacuum powder insulation

Evacuated space filled with perlite (volcanic glass) powder.
Simpler than MLI. Less performance. Used for large storage tanks.

## Cryogenic materials

### Embrittlement

Many materials become brittle at cryogenic temperatures. NEVER use at cryogenic temps without verifying:

- Carbon steel: brittle below −30°C. DO NOT USE for cryogenic systems.
- Aluminum alloys (6061, 5083, 2219): maintain ductility to very low temps. Excellent for cryo.
- Austenitic stainless steel (304, 316): good at cryogenic temps.
- PTFE (Teflon): maintains sealing properties at cryo temps. Good for seals.
- Brass: acceptable. Used in valves.
- Copper: excellent. Used for heat exchangers.

### Thermal contraction

All materials contract when cooled. Differential contraction between dissimilar materials creates stress.
Design rule: Calculate ΔL = L₀ × α × ΔT for all joints and connections.
Aluminum α ≈ 23×10⁻⁶/K. From 20°C to −196°C: ΔL/L ≈ 0.5%.
Use flexible bellows or expansion loops in piping to absorb contraction.

## Storage system design

### Pressure-fed systems

Tank pressurized with helium or warm GH₂/GOX to push propellant to engine.
Simple. No pumps. Weight penalty from heavy pressure vessels.
Common for attitude control, upper stages.

### Tank pressurization

Prevent tank collapse during draining (ullage pressure).
Prevent two-phase flow to engine (keep liquid subcooled).
Pressurize with: warm autogenous gas (same propellant), or helium.
LOX tanks typically pressurized with GOX (autogenous).
LH₂ tanks: GH₂ or helium.

### Venting and safety

Cryogenic tanks must have pressure relief valves (PRVs). No exceptions.
Liquid expansion on warming: 700:1 volume ratio for LH₂ (liquid to gas). 860:1 for LOX.
A sealed tank warming from 20 K to 300 K will rupture catastrophically without venting.
**Never seal a cryogenic tank without a pressure relief path.**

### LOX safety rules

LOX supports and accelerates combustion of any organic material.
Never allow LOX contact with: petroleum products, organics, rubber (except specific LOX-compatible elastomers), contaminated surfaces.
LOX compatibility test: Impact test (Liquid Oxygen Compatibility Testing, ASTM D2512).
Stainless steel and aluminum are LOX-compatible. Copper and brass generally OK.
Teflon (PTFE): conditionally compatible — avoid in impact/pressure environments with LOX.
Clean rooms and LOX systems: particle-free (particles + LOX + impact = ignition risk).

### LH₂ safety rules

Flammability range: 4-75% in air (vs. natural gas 5-15%). Extremely wide.
Ignition energy: 0.017 mJ (vs. 0.29 mJ for methane). Very easily ignited.
Invisible flame: LH₂ burns with invisible flame in air. Use sensors, not visual inspection.
Embrittlement of certain materials: some high-strength steels susceptible to hydrogen embrittlement.
Leak detection: Thermal imaging, catalytic sensors.
Ventilation: LH₂ is lighter than air — vents must direct upward, away from ignition sources.

## Transfer operations

**Chill-down:** Must cool all lines, valves, and pumps before flowing cryogenic fluid.
Initial flow: Liquid flashes to vapor as it contacts warm surfaces → back pressure, flow interruption.
Chill-down time: Minutes to tens of minutes for large systems.
Transfer rate: Limited by chill-down heat load + allowable boil-off.
**Autogenous pressurization:** Vaporize small amount of propellant in heat exchanger → use to pressurize tank.

Sources: NIST Cryogenics (nvlpubs.nist.gov — free), NASA TM-2016-218560 (public domain),
NASA Cryogenic Fluid Management technology program (public domain),
Barron "Cryogenic Engineering" (principles), Scott "Cryogenic Engineering" (principles)
