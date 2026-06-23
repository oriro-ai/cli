---
watermark: ORIRO
disable-model-invocation: true
name: eng-aerospace
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Aerospace engineering — aerodynamics, orbital mechanics, spacecraft design,
  launch systems, re-entry, satellite systems, and space mission planning.
  Activate for spaceship design, rockets, satellites, orbital mechanics, or
  any aerospace question. Sources: NASA Technical Reports (public domain),
  MIT 16.001 OCW, ESA technical publications.
---

# Aerospace Engineering

## The four forces of flight

**Lift:** Perpendicular to velocity. Bernoulli pressure differential + Newton's 3rd law flow deflection.
**Drag:** Opposing motion. Parasitic drag (friction+pressure) + induced drag (from lift generation).
**Thrust:** Forward force from propulsion.
**Weight:** Gravitational force.
Level flight: Lift = Weight, Thrust = Drag.

## Aerodynamics

### Lift equation

L = ½ρV²S·CL
ρ = air density, V = velocity, S = wing area, CL = lift coefficient.
Sea level ρ = 1.225 kg/m³. At 35,000 ft: ρ ≈ 0.380 kg/m³ — must fly faster for same lift.

### Drag polar

CD = CD0 + CL²/(π·e·AR)
CD0 = zero-lift drag, e = Oswald efficiency (0.75-0.95), AR = aspect ratio.
High AR wings (gliders) = lower induced drag. Low AR (fighters) = better supersonic performance.

### Mach number regimes

Subsonic M < 0.8 — standard aerodynamics.
Transonic 0.8-1.2 — shock waves form, drag rise.
Supersonic M > 1.2 — oblique shocks dominate, wave drag.
Hypersonic M > 5 — aerodynamic heating critical, chemical dissociation of air.

### Normal shock relations (γ = 1.4, air)

Pressure ratio: p₂/p₁ = (7M₁² − 1)/6
At M=2: p₂/p₁ = 4.5, T₂/T₁ = 1.69
Total pressure always decreases across a shock — efficiency loss.

### Stagnation heating (hypersonic re-entry)

Q̇ = C·√ρ · V³ — heating proportional to V³.
Space Shuttle peak heating: ~1,650°C at M=25.
TPS: HRSI tiles (silica, 1,260°C), RCC (carbon-carbon, 1,650°C) on leading edges.

## Orbital mechanics

### Key equations

**Circular orbit velocity:** V = √(μ/r), μ = 3.986×10¹⁴ m³/s² (Earth)
LEO (400 km alt): V ≈ 7,784 m/s = 28,000 km/h, period ≈ 92 min
GEO (35,786 km): V = 3,075 m/s, period = 24 hours (geostationary)

**Orbital period:** T = 2π√(a³/μ)

**Escape velocity:** V_esc = √2 × V_circular = 11.2 km/s from Earth surface.

### Kepler's laws

1. Orbits are ellipses (Sun/planet at one focus).
2. Equal areas swept in equal times (faster at periapsis, slower at apoapsis).
3. T² ∝ a³ (period² proportional to semi-major axis³).

### Hohmann transfer

Most efficient two-burn transfer between circular orbits.
ΔV₁ at departure: raises apoapsis to target orbit altitude.
ΔV₂ at arrival: circularizes at target altitude.

### Tsiolkovsky rocket equation

ΔV = Isp × g₀ × ln(m₀/mf)
Isp = specific impulse (seconds), g₀ = 9.81 m/s².
This is the fundamental equation of spaceflight. Everything depends on it.

**ΔV budget for common missions:**
Earth surface to LEO: ~9,400 m/s (includes gravity and drag losses).
LEO to GEO: ~3,900 m/s.
LEO to Trans-Lunar Injection: ~3,150 m/s.
LEO to Moon surface: ~5,900 m/s total.
LEO to Mars (minimum energy): ~5,500 m/s.

## Spacecraft subsystems

**Structure:** Primary (launch loads) + secondary (equipment mounting). ~15-20% of dry mass.
**Propulsion:** Main ΔV engines + RCS attitude thrusters. See eng-propulsion skill.
**Power:** Solar arrays (size for worst case eclipse + margin) + batteries (eclipse duration).
**Thermal:** MLI blankets (multi-layer insulation) + coatings + heaters + radiators.
Space environment: −270°C shadow, +120°C direct sun.
Operating range for electronics: −40 to +85°C.
**ADCS:** Sun sensors, star trackers, IMU → reaction wheels, magnetorquers, thrusters.
**Comms:** High-gain parabolic antenna (data) + omni antenna (telemetry + command).
**C&DH:** Radiation-hardened flight computer. Redundant. Watchdog timers.

## Launch environment

Axial acceleration: 2-4g during ascent.
Acoustic loads: 140-150 dB at liftoff.
Vibration: Random + sinusoidal from engines.
Structural natural frequency requirement: First mode > 35 Hz lateral, > 90 Hz axial (typical requirement — verify with your launch vehicle).

Sources: NASA Technical Reports Server (ntrs.nasa.gov — public domain),
MIT OCW 16.001, 16.002, 16.003 Unified Engineering, MIT 16.50 Propulsion,
NASA SP-8058 Spacecraft Aerodynamic Torques (public domain),
Anderson "Introduction to Flight" (principles)
