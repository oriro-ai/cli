---
watermark: ORIRO
disable-model-invocation: true
name: eng-electrical
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >

  Electrical engineering — circuits, power systems, electronics, digital systems, signal processing, and electromagnetic fundamentals.





  Sources: MIT OCW, ASME principles, OSHA, engineering textbook fundamentals.
  Consult a licensed professional engineer for safety-critical calculations.
---

# Electrical Engineering Fundamentals

## DC circuit fundamentals

**Ohm's Law:** V = IR (Voltage = Current × Resistance)
**Power:** P = VI = I²R = V²/R (Watts)
**Kirchhoff's Voltage Law (KVL):** Sum of voltages around any closed loop = 0.
**Kirchhoff's Current Law (KCL):** Sum of currents entering a node = sum leaving.
**Series resistors:** R_total = R₁ + R₂ + R₃...
**Parallel resistors:** 1/R_total = 1/R₁ + 1/R₂ + 1/R₃...

## AC circuits

**AC voltage:** v(t) = Vm·sin(ωt + φ). ω = 2πf (angular frequency)
**RMS:** V_rms = Vm/√2. P_avg = V_rms × I_rms × cos(φ)
**Impedance:** Z = R + jX. Magnitude |Z| = √(R² + X²).
**Inductor impedance:** Z_L = jωL (increases with frequency)
**Capacitor impedance:** Z_C = 1/(jωC) (decreases with frequency)
**Resonance:** Z is purely resistive. f₀ = 1/(2π√LC)

## Semiconductors and transistors

**Diode:** One-way current flow. Forward voltage ~0.7V (silicon). Rectification, protection, signal demodulation.
**MOSFET (most common):** Voltage-controlled switch/amplifier.
n-channel MOSFET: Gate voltage turns it ON. Used in most digital logic and power switching.
Gate-Source voltage (V_GS) > threshold voltage → channel conducts.
**BJT:** Current-controlled amplifier. β = I_C/I_B (typical 50-300).

## Digital logic

**Boolean algebra:** AND, OR, NOT, NAND, NOR, XOR.
NAND is universal gate — any logic can be built from NAND gates alone.
**Combinational logic:** Output depends only on current inputs. Adders, multiplexers, decoders.
**Sequential logic:** Output depends on inputs AND previous state. Flip-flops, registers, counters.
**D flip-flop:** Captures input D at clock edge. Foundation of digital memory and state machines.

## Power systems

**Three-phase power:** Most efficient for large power transmission. Three phases 120° apart.
P = √3 × V_L × I_L × cos(φ) (V_L = line-to-line voltage)
**Transformers:** Step voltage up/down. V₁/V₂ = N₁/N₂. Ideal: V₁I₁ = V₂I₂.
**Power factor:** cos(φ) = real power/apparent power. Low PF = inefficient, utility penalizes.

## PCB design basics

**Trace width:** Determine from current capacity and temperature rise. Online calculators essential.
**Ground planes:** Provide low-impedance return path. Reduce EMI.
**Bypass capacitors:** Place close to each IC power pin. 100nF ceramic standard.
**Differential pairs:** For high-speed signals. Keep traces matched in length.

Sources: MIT OCW 6.002 Circuits and Electronics, Sedra/Smith Microelectronic Circuits (principles),
Horowitz & Hill The Art of Electronics (principles), IEEE standards
