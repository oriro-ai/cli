---
watermark: ORIRO
disable-model-invocation: true
name: eng-manufacturing
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >




  Manufacturing engineering — process planning, quality control, lean manufacturing, tolerances, production systems, and operations.


  Sources: MIT OCW, ASME principles, OSHA, engineering textbook fundamentals.
  Consult a licensed professional engineer for safety-critical calculations.
---

# Manufacturing Engineering

## Manufacturing processes

### Machining (subtractive)

**Turning (lathe):** Rotates workpiece against stationary cutting tool. Creates cylindrical shapes.
**Milling:** Rotating cutter removes material from stationary workpiece. Creates flat surfaces, slots, complex shapes.
**Drilling:** Creates holes. Twist drill most common.
**Grinding:** Abrasive wheel removes material. Final finish operations. Tight tolerances.
**Key parameters:** Cutting speed (surface speed), feed rate, depth of cut. Optimize for: tool life, surface finish, material removal rate.

### Forming processes

**Forging:** Compressive force shapes metal. Grain flow follows shape — strong parts.
**Casting:** Molten metal poured into mold. Complex shapes. Sand casting (rough) vs. die casting (precise, high volume).
**Stamping/sheet metal forming:** Punching, bending, drawing, roll forming.
**Injection molding:** Plastic injected into mold under high pressure. High volume, precise.
**Additive manufacturing (3D printing):** FDM (fused deposition modeling), SLS (laser sintering), SLA (stereolithography).

## Tolerances and fits (GD&T)

**Tolerance:** Allowable variation from nominal dimension.
Unilateral: 25.00 +0.00/-0.05. Bilateral: 25.00 ±0.025.
**Clearance fit:** Shaft always smaller than hole. For rotating or sliding parts.
**Interference fit:** Shaft always larger than hole. Assembly requires press or heat. For permanent assemblies.
**Transition fit:** Either clearance or interference depending on actual dimensions.

## Lean manufacturing (Toyota Production System)

**Seven wastes (TIMWOOD):**
T - Transportation (unnecessary movement of material)
I - Inventory (excess stock)
M - Motion (unnecessary worker movement)
W - Waiting (idle time)
O - Overproduction (making more than needed)
O - Over-processing (more work than required)
D - Defects (rework and scrap)

**5S methodology:** Sort, Set in order, Shine, Standardize, Sustain. Workplace organization.
**Kanban:** Visual signal-driven pull system. Production authorized only when signal received.
**Kaizen:** Continuous improvement. Small, incremental changes from all workers.
**Poka-yoke:** Error-proofing. Design prevents mistakes from becoming defects.

## Quality control

**SPC (Statistical Process Control):** Control charts track process variation over time.
X̄-bar chart: Monitors process mean. R-chart: Monitors range (variation).
Control limits: Mean ± 3σ. Points outside = special cause variation requiring investigation.

**Six Sigma:** Target of 3.4 defects per million opportunities.
DMAIC: Define, Measure, Analyze, Improve, Control.
Cpk (process capability): How well process fits within specifications. Cpk > 1.33 = capable process.

**Measurement system analysis (Gauge R&R):**
Verify measurement system before collecting data.
% R&R < 10%: acceptable. 10-30%: marginal. >30%: unacceptable.

Sources: Groover "Fundamentals of Modern Manufacturing" (principles), Toyota Production System documentation,
Juran Quality Handbook (principles), ASME GD&T standards, ASQ quality body of knowledge
