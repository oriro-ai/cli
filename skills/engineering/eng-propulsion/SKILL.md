---
name: eng-propulsion
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Rocket propulsion — liquid and solid rocket engines, specific impulse, thrust,
  nozzle design, propellant chemistry, electric propulsion, and engine cycles.
  Activate for rocket engine design, propellant selection, thrust calculations,
  nozzle design, or any propulsion question.
  Sources: NASA SP-8120 (public domain), Sutton principles, MIT 16.50 OCW.
---

# Rocket Propulsion

## Fundamental performance parameters

### Specific impulse (Isp)

Isp = F / (ṁ × g₀) = Thrust / (mass flow rate × 9.81)
Units: seconds. The universal measure of propellant efficiency.
Higher Isp = more thrust per kg of propellant consumed.

**Isp comparison:**
Cold gas (N₂): ~70 s (attitude control only, very simple)
Solid rocket (APCP): 250-280 s
Liquid bipropellant (LOX/RP-1, kerosene): 300-350 s (sea level), 340-390 s (vacuum)
LOX/LH2 (liquid hydrogen): 380-455 s (vacuum) — highest chemical Isp
Ion thrusters (electric): 1,000-10,000 s (very low thrust, used for deep space)
Hall-effect thrusters: 1,500-2,500 s

### Thrust equation

F = ṁ × Ve + (Pe − Pa) × Ae
ṁ = mass flow rate (kg/s), Ve = exhaust velocity (m/s),
Pe = exit pressure, Pa = ambient pressure, Ae = nozzle exit area.
Optimum expansion: Pe = Pa. Overexpanded (Pe < Pa): shock in nozzle, efficiency loss. Underexpanded (Pe > Pa): plume shocks outside.

### De Laval (converging-diverging) nozzle

Flow accelerates to M=1 at throat, then continues to supersonic in diverging section.
Critical area ratio at throat controls mass flow.
Area ratio determines exit Mach number:
Ae/A\* = (1/M) × [(2/(γ+1)) × (1 + (γ-1)/2 × M²)]^((γ+1)/(2(γ-1)))
For LOX/LH2 at vacuum expansion ratio 77:1 → Ve ≈ 4,400 m/s → Isp ≈ 450 s.

## Liquid rocket engines

### Propellant combinations

**LOX/LH2 (liquid oxygen / liquid hydrogen):**
Isp vacuum ~455 s (Space Shuttle Main Engine, RS-25; RL-10B-2).
Advantage: Highest Isp of chemical propellants.
Disadvantage: LH2 density very low (70 kg/m³) — large tanks. LH2 at −253°C (20 K) — extreme cryogenic. Boil-off management critical.

**LOX/RP-1 (Kerosene):**
Isp vacuum ~350 s (Merlin, F-1, RD-180).
Advantage: High density. RP-1 storable at room temperature. Well-understood.
Disadvantage: Lower Isp than LH2. Coking (carbon deposits) in fuel-rich pre-burners.

**LOX/LCH4 (Liquid methane):**
Isp vacuum ~380 s (SpaceX Raptor, BE-4).
Advantage: Higher Isp than RP-1. Better coking resistance than RP-1. Producible on Mars (Sabatier reaction: CO₂ + H₂ → CH₄ + H₂O). In situ resource utilization (ISRU) possibility.

**NTO/UDMH (Nitrogen tetroxide / Unsymmetrical dimethylhydrazine):**
Isp ~340 s. Hypergolic (ignites on contact — no ignition system needed).
Storable at room temperature. Used for orbital maneuvers, spacecraft, missiles.
Disadvantage: Highly toxic.

**NTO/MMH:** Similar to NTO/UDMH. Used in Space Shuttle OMS/RCS, many spacecraft.

### Engine cycles

**Gas generator cycle (open cycle):**
Small fraction of propellant burned to drive turbopumps. Exhaust dumped overboard.
Efficiency loss from dumped exhaust. Simpler than staged combustion.
Examples: F-1, Merlin 1D.

**Staged combustion cycle (closed cycle):**
Turbopump exhaust fed into main combustion chamber. Higher efficiency.
Oxygen-rich: LOX drives turbopump → mixes with fuel in main chamber. (RD-180, RD-170 — very high Isp and chamber pressure)
Fuel-rich: Fuel drives turbopump (most US engines: RS-25, RL-10).
Full-flow staged combustion: Both fuel-rich AND oxidizer-rich pre-burners (Raptor). Maximum efficiency. Highest complexity.

**Expander cycle:**
Heat from nozzle/chamber regeneratively heats fuel → drives turbopump.
No pre-burner needed. Very clean, efficient. Limited thrust (heat transfer limits mass flow).
Examples: RL-10 (LH2 — works because H2 has excellent heat capacity).

### Chamber pressure

Higher Pc → higher expansion ratio possible → higher Isp.
RS-25 SSME: 207 bar (3,000 psi) chamber pressure.
SpaceX Raptor: 300+ bar (full-flow staged combustion).
Higher pressure = better performance but harder seals, higher structural requirements.

## Solid rocket motors

**Composition:** Oxidizer (ammonium perchlorate, AP ~70%) + fuel (aluminum powder ~16%) + binder (HTPB) + additives.
**Grain geometry:** Determines thrust vs. time profile.
Star, wagon wheel, finocyl grains: near-constant thrust (progressive then regressive).
End-burning: Very long, steady low thrust.
**Isp:** ~250-280 s typical.
**Advantages:** Simple (no pumps, valves). Storable. High reliability. Good for first stages.
**Disadvantages:** Cannot throttle or shut down once lit. Lower Isp than liquid.
Examples: Space Shuttle SRB, Ariane 5 P240, Minuteman III.

## Electric propulsion

### Ion thruster

Xenon ionized, accelerated by electrostatic grids. Isp 3,000-10,000 s.
Very low thrust (mN range). Excellent for deep space where time is available.
Dawn, Hayabusa, Starlink (Hall thrusters).

### Hall-effect thruster

Electrons trapped in magnetic field ionize propellant. Isp 1,500-2,500 s.
Higher thrust than ion engines. Widely used for satellite station-keeping and orbit raising.
Power required: 100W to 100+ kW.

### Trade: Chemical vs. electric

Chemical: High thrust, fast burn, short mission segments.
Electric: High Isp, very low thrust, long continuous burn. Ideal for deep space or satellite positioning.
For human Mars missions: Chemical for Earth departure and Mars landing; electric for long cruise (if power available).

Sources: NASA SP-8120 Solid Rocket Motor Metal Cases (public domain),
NASA SP-8125 Solid Rocket Motor Nozzles (public domain),
MIT OCW 16.50 Propulsion (CC-BY-NC-SA),
Sutton and Biblarz "Rocket Propulsion Elements" (9th ed. principles),
Huzel and Huang "Modern Engineering for Design of Liquid-Propellant Rocket Engines" (principles)
