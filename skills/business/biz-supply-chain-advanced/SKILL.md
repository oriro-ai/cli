---
watermark: ORIRO
disable-model-invocation: true
name: biz-supply-chain-advanced
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Advanced supply chain — demand planning, inventory optimization, logistics,
  procurement strategy, risk management, and ERP systems. Sources: APICS CSCP
  (free summaries), MIT CTL OpenCourseWare (CC-BY).
---

# Advanced Supply Chain Management

## Demand planning

**Forecast methods:**
Moving average: Simple. Good for stable demand.
Exponential smoothing: Weights recent data more.
Seasonal decomposition: Isolates trend, seasonality, residual.

**MAPE (Mean Absolute Percentage Error):** Primary forecast accuracy metric.
MAPE < 10% = excellent. 10-20% = good. 20-50% = reasonable. >50% = poor.

**Demand sensing:** Use point-of-sale data (not orders) for short-term forecasts.

## Inventory optimization

**EOQ (Economic Order Quantity):** √(2DS/H)
D = annual demand, S = order cost, H = holding cost per unit per year.

**Safety stock:** z × σ_LT × √LT
z = service level factor (1.65 for 95%), σ_LT = demand standard deviation, LT = lead time.

**ABC analysis:** A items (20% SKUs, 80% value), B items (30% SKUs, 15% value), C items (50% SKUs, 5% value).
Apply tighter control to A items.

## Logistics and transportation

**Incoterms 2020:** Define buyer/seller responsibility split.
EXW = seller does nothing. DDP = seller does everything.
FOB = seller loads at origin port. CIF = seller pays freight and insurance.

**3PL vs 4PL:** 3PL provides logistics services. 4PL manages entire supply chain strategy.

## Procurement strategy

**Kraljic matrix:** Categorize spend by supply risk vs profit impact.
Strategic items (high risk, high profit): Partner deeply.
Leverage items (low risk, high profit): Competitive bidding.
Bottleneck items (high risk, low profit): Secure supply, multiple sources.
Routine items (low risk, low profit): Automate, simplify.

## Supply chain risk

**Disruption categories:** Single-source dependency, geographic concentration, natural disasters, geopolitical.
**Mitigation:** Dual sourcing, inventory buffers, geographic diversification, nearshoring.
**DDMRP (Demand-Driven MRP):** Position strategic buffers at decoupling points.

## ERP systems

SAP S/4HANA: Enterprise standard. Expensive. Deep functionality.
Oracle ERP: Strong finance integration.
NetSuite: Mid-market cloud. Good for growing businesses.
Odoo: Open source. Free community version.

Sources: APICS CSCP (apics.org — free introductory resources), MIT CTL OCW (CC-BY),
Council of Supply Chain Management Professionals (free frameworks)
