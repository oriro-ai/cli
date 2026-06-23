---
watermark: ORIRO
disable-model-invocation: true
name: eng-mechanical
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Mechanical engineering — thermodynamics, mechanics, machine design, fluid mechanics, heat transfer, materials, and manufacturing processes.






  Sources: MIT OCW, ASME principles, OSHA, engineering textbook fundamentals.
  Consult a licensed professional engineer for safety-critical calculations.
---

# Mechanical Engineering Fundamentals

## Statics — forces in equilibrium

**Conditions for static equilibrium:** Sum of all forces = 0; Sum of all moments = 0.
Free body diagram: Isolate the body, draw all forces acting on it.
Moment = Force × Perpendicular distance. Units: N·m or lb·ft.

## Thermodynamics

**First Law:** Energy cannot be created or destroyed; only converted.
Q - W = ΔU (Heat added - Work done = Change in internal energy)
**Second Law:** Heat flows spontaneously from hot to cold. Entropy of a closed system increases.
**Efficiency of heat engine:** η = W/Q_H = (T_H - T_C)/T_H (Carnot, ideal maximum)
**Key processes:** Isothermal (constant T), Adiabatic (no heat transfer), Isobaric (constant pressure), Isochoric (constant volume).

## Material mechanics

**Stress = Force/Area.** σ = F/A (Units: Pa or psi)
**Strain = Deformation/Original length.** ε = ΔL/L (dimensionless)
**Elastic modulus (Young's Modulus):** E = σ/ε (slope of linear stress-strain curve)
Steel: ~200 GPa. Aluminum: ~70 GPa. Concrete: ~30 GPa.
**Yield strength:** Stress at which permanent deformation begins.
**Factor of safety:** Yield strength / Working stress. Typical: 2-4 for static loads.

## Fluid mechanics

**Bernoulli's principle:** P + ½ρv² + ρgh = constant (along streamline, incompressible, inviscid)
Faster flow = lower pressure. Explains lift, atomizers, carburetors.
**Continuity equation:** A₁V₁ = A₂V₂ (conservation of mass in incompressible flow)
**Reynolds number:** Re = ρvD/μ. Re < 2,300: laminar. Re > 4,000: turbulent.

## Heat transfer

**Conduction:** Q = kA(ΔT)/Δx (k = thermal conductivity, A = area, ΔT = temp diff, Δx = thickness)
**Convection:** Q = hAΔT (h = convection coefficient)
**Radiation:** Q = εσAT⁴ (σ = Stefan-Boltzmann constant, ε = emissivity)
Thermal resistance analogy: Resistances in series add like electrical resistors.

## Machine design

**Shaft design:** Account for bending, torsion, and combined loading. Use von Mises criterion for combined stress.
**Fatigue:** Cyclic loading causes failure below yield strength. S-N curve shows stress vs. cycles to failure.
Endurance limit: Maximum stress for infinite life (~0.5 × ultimate tensile strength for steel).
**Bearings:** Rolling element (ball, roller) for high speed. Sleeve/journal for heavy loads, low speed.
**Gear design:** Pitch, module, pressure angle. Interference if too few teeth. Gear ratio = driven/driver teeth.

Sources: MIT OCW 2.001 Mechanics, Beer & Johnston Mechanics of Materials (principles), Cengel Thermodynamics (principles)
