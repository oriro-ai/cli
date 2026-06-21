---
name: eng-control-systems
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Control systems engineering — PID controllers, state space, transfer functions,
  stability analysis, Laplace transforms, frequency response, and GNC for
  aerospace. Activate for control system design, PID tuning, stability analysis,
  feedback loops, or any control engineering question.
  Sources: MIT 6.302 OCW, OpenStax Physics, Ogata Modern Control Engineering.
---

# Control Systems Engineering

## Feedback control fundamentals

### Open loop vs. closed loop

**Open loop:** No feedback. Output does not influence input. Simple, unreliable.
**Closed loop (feedback):** Output measured, compared to desired reference, error used to adjust input.
Error e(t) = r(t) − y(t) — reference minus actual output.

### Block diagram elements

**Plant (G):** System being controlled (motor, rocket, thermostat).
**Controller (C):** Generates control signal from error.
**Sensor (H):** Measures plant output.
**Closed-loop transfer function:** Y/R = GC/(1 + GCH)

## Laplace transform and transfer functions

s-domain representation converts differential equations to algebraic equations.
**Laplace pairs:**
d/dt → s × F(s) − f(0)
∫ → F(s)/s
Unit step: 1/s
Exponential e^(−at): 1/(s+a)

**Transfer function:** G(s) = Output(s)/Input(s) with zero initial conditions.
First-order system: G(s) = K/(τs + 1). Time constant τ = time to reach 63.2% of final value.
Second-order system: G(s) = ωn²/(s² + 2ζωnS + ωn²)
ωn = natural frequency, ζ = damping ratio.

### Damping ratio effects

ζ < 1: Underdamped (oscillatory response). Overshoot = e^(−πζ/√(1−ζ²)) × 100%.
ζ = 1: Critically damped (fastest non-oscillatory response).
ζ > 1: Overdamped (slow, no overshoot).
Target for most control systems: ζ ≈ 0.7 (moderate speed, ~5% overshoot).

## PID control

PID = Proportional-Integral-Derivative. Most widely used controller in industry.

u(t) = Kp·e(t) + Ki·∫e(t)dt + Kd·de(t)/dt

**Proportional (Kp):**
Increases with error. Reduces steady-state error but doesn't eliminate it.
Too high Kp → oscillations, instability.

**Integral (Ki):**
Eliminates steady-state error (integrates accumulated error).
Too high Ki → slow oscillations, windup.
Anti-windup: Clamp integrator when actuator saturated.

**Derivative (Kd):**
Predicts future error. Reduces overshoot, improves settling time.
Sensitive to noise. Often filtered: Kd·s/(τd·s + 1).

### PID tuning methods

**Ziegler-Nichols (step response method):**

1. From step response: measure dead time L and time constant T.
2. Kp = 1.2T/L, Ti = 2L, Td = 0.5L.

**Ziegler-Nichols (oscillation method):**

1. Increase Kp until sustained oscillations (ultimate gain Ku, period Pu).
2. PID: Kp = 0.6Ku, Ti = 0.5Pu, Td = 0.125Pu.

**Manual tuning rule of thumb:**
Start: Kp only. Increase until good tracking, some oscillation.
Add Ki: Small value, increases until steady-state error eliminated.
Add Kd: Increase until oscillations reduced.

## Stability analysis

### Routh-Hurwitz criterion

For polynomial characteristic equation: all coefficients must be positive AND Routh array conditions satisfied.
Quick check: Any negative or zero coefficients → unstable (necessary but not sufficient).

### Root locus

Plot of closed-loop poles as gain K varies from 0 to ∞.
Poles start at open-loop poles (K=0), end at open-loop zeros (K=∞).
Stable if all poles in left-half s-plane.
Unstable if any pole crosses to right-half plane.

### Bode plot (frequency response)

Log-magnitude vs. frequency + Phase vs. frequency.
**Gain margin (GM):** Additional gain at phase crossover (phase = −180°) before instability.
Requirement: GM > 6 dB typical.
**Phase margin (PM):** Additional phase at gain crossover (gain = 0 dB) before instability.
Requirement: PM > 45° typical.
Poor PM → oscillatory transient response.

### Nyquist criterion

For systems with time delay or right-half plane poles.
Encirclements of −1+j0 point determine stability.

## State space representation

x' = Ax + Bu (state equation)
y = Cx + Du (output equation)

A = system matrix, B = input matrix, C = output matrix, D = feedthrough.
n states fully describe system's dynamic behavior.

**Controllability:** All states can be driven to any value by input. rank(B AB A²B...) = n.
**Observability:** All states can be estimated from outputs. rank(C CA CA²...) = n.

### State feedback

u = −Kx (full state feedback).
K chosen to place closed-loop eigenvalues (poles) at desired locations.
LQR (Linear Quadratic Regulator): Optimal K minimizing ∫(x'Qx + u'Ru)dt.
Q = state cost matrix (how much deviation costs), R = control effort cost matrix.

## GNC for aerospace (Guidance, Navigation, Control)

**Navigation:** Determine vehicle state (position, velocity, attitude).
Sensors: IMU (accelerometers + gyroscopes), GPS, star trackers, sun sensors, radar altimeter.
**Extended Kalman Filter (EKF):** Fuse multiple sensor inputs, estimate state with uncertainty.

**Guidance:** Determine desired trajectory to reach target.
Proportional navigation (missiles), gravity turns (launch vehicles), Lambert targeting (orbital rendezvous).

**Control:** Track the guidance commands.
Launch vehicle: Thrust vector control (TVC) — gimbal engines ±7° for pitch/yaw.
Spacecraft: Reaction wheels (electric), CMGs (control moment gyros), RCS thrusters.
Attitude quaternion: 4-parameter representation, avoids gimbal lock.

### PID for attitude control

Error = quaternion error between desired and actual attitude.
Three separate PIDs: roll, pitch, yaw axes.
Cross-coupling between axes: must account for in design (gyroscopic effects).

Sources: MIT OCW 6.302 Feedback System Design (CC-BY-NC-SA),
Ogata "Modern Control Engineering" (principles),
Franklin, Powell, Emami-Naeini "Feedback Control of Dynamic Systems" (principles),
NASA GNC engineering standards (public domain)
