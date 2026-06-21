---
name: biz-operations
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Operations management — process design, supply chain, capacity planning,
  inventory, quality systems, and operational efficiency. Activate for questions
  about running operations, process improvement, supply chain, inventory management,
  capacity planning, or any operations question. Sources: APICS, OpenStax Operations Management.
---

# Operations Management

## Process design

**Process flow diagram:** Map every step from input to output. Identify: activities, decision points, inputs, outputs, responsible parties.
**Cycle time:** Time to complete one unit through entire process.
**Throughput:** Units produced per unit time = 1/Cycle time.
**Bottleneck:** Slowest step in the process. Throughput limited by bottleneck capacity. Improving non-bottleneck steps doesn't improve throughput.
**Theory of Constraints (Goldratt):** Identify constraint → exploit it → subordinate everything else to it → elevate it → repeat.

## Capacity planning

**Capacity:** Maximum output rate of a facility or process.
**Utilization:** Actual output / Design capacity. Target 80-85% to handle variability without backlogs.
**Efficiency:** Actual output / Effective capacity.
**Capacity strategy:**
Lead strategy: Build capacity ahead of demand. Minimizes lost sales. Higher risk.
Lag strategy: Build capacity after demand materializes. Lower risk. May lose customers.
Match strategy: Add capacity in small increments as demand grows.

## Inventory management

**EOQ (Economic Order Quantity):** Minimizes total ordering + holding costs.
EOQ = √(2DS/H) — D = annual demand, S = order cost, H = annual holding cost per unit.

**ABC analysis:** Classify inventory by value.
A items: top 20% by value = 80% of total inventory value. Tight control, frequent counts.
B items: next 30% by value. Moderate control.
C items: remaining 50% by value. Low control, bulk ordering.

**Safety stock:** Buffer against demand/supply uncertainty.
Safety stock = Z × σ_LT (Z = service level factor, σ_LT = standard deviation of demand during lead time)

**Just-in-time (JIT):** Receive materials just before needed. Minimizes inventory. Requires reliable suppliers and stable demand.

**Inventory turns:** COGS / Average Inventory. Higher = better (but not at expense of stockouts).
Retail: 4-12×/year typical. Grocery: 20-30×. Automotive parts: 2-4×.

## Supply chain management

**Tiers:** Tier 1 = direct suppliers. Tier 2 = suppliers' suppliers. Visibility decreases with tier.
**Make vs. Buy:** Make if: core competency, sensitive IP, insufficient supply. Buy if: commodity, specialized supplier capability, flexibility needed.
**Supplier management:** Qualify, audit, develop. Concentration risk: > 50% from single supplier is fragile.
**Lead time reduction:** Source locally (shorter lead time, higher cost). Reduce supplier lead time. Maintain safety stock.

## Quality management systems

**ISO 9001:** International standard for quality management systems. Process-based approach. Not about product quality — about having processes that consistently produce quality.
**Key elements:** Customer focus, leadership, process approach, evidence-based decision making, continual improvement.
**PDCA (Plan-Do-Check-Act):** Continuous improvement cycle. Plan improvements → implement → measure results → standardize or adjust.
**Six Sigma DMAIC:** For breakthrough improvement projects (see manufacturing skill for detail).
**Root cause analysis:** 5 Whys — ask why 5 times to get to root cause. Fishbone/Ishikawa diagram — categories of causes (Man, Method, Machine, Material, Mother Nature, Measurement).

## KPIs for operations

OEE (Overall Equipment Effectiveness) = Availability × Performance × Quality. World-class: >85%.
OTIF (On-Time In-Full): % of orders delivered complete and on time. Target: >95%.
First Pass Yield: % of units meeting spec without rework.
Defects Per Million Opportunities (DPMO): Six Sigma metric.

Sources: APICS Body of Knowledge, OpenStax Operations Management (CC-BY), Goldratt "The Goal" principles, ISO 9001:2015 standard summary
