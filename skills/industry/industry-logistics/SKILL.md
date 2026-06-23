---
watermark: ORIRO
disable-model-invocation: true
name: industry-logistics
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >


  Supply chain and logistics — freight, customs, warehousing, last-mile delivery, and supply chain optimization.







  Sources: Industry-specific trade associations, regulatory guidance, and publicly available resources.
---

# Supply Chain and Logistics

## Freight modes and trade-offs

| Mode            | Speed          | Cost            | Volume          | Best for                   |
| --------------- | -------------- | --------------- | --------------- | -------------------------- |
| Air freight     | Fastest (days) | Highest         | Low weight      | High-value, time-sensitive |
| Ocean (FCL)     | Weeks          | Lowest per unit | Large volume    | Bulk, non-urgent           |
| Ocean (LCL)     | Weeks +        | Low-medium      | Smaller volumes | When FCL not justified     |
| Rail            | Days-weeks     | Medium-low      | Large volume    | Inland, bulk               |
| Truck (FTL/LTL) | 1-5 days       | Medium          | Flexible        | Domestic, last leg         |

**FCL:** Full Container Load (20ft or 40ft container, one shipper).
**LCL:** Less than Container Load (shared container, consolidated).
**FTL:** Full Truckload. **LTL:** Less than Truckload.

## International shipping

### Incoterms 2020 (key ones)

**EXW (Ex Works):** Seller delivers at their facility. Buyer responsible for everything from there.
**FOB (Free on Board):** Seller loads onto vessel. Buyer responsible for ocean freight onward.
**CIF (Cost, Insurance, Freight):** Seller pays freight and insurance to destination port. Buyer handles customs and delivery.
**DDP (Delivered Duty Paid):** Seller delivers to buyer's door, fully cleared. Buyer has least responsibility.
**Most common for US imports:** FOB origin or CIF destination.

### Customs clearance

**HTS code (Harmonized Tariff Schedule):** 10-digit code classifying every product. Determines duty rate.
**Customs broker:** Licensed professional handles documentation, classification, duties. Required for most commercial imports.
**Key documents:** Commercial invoice, packing list, bill of lading, certificate of origin, customs declaration.
**Duties and tariffs:** Ad valorem (% of value), specific (per unit), or compound.
**Bonded warehouse:** Store goods before clearing customs (useful for managing cash flow on duties).

## Warehousing

### Layout and operations

**Receiving:** Inbound check-in, quality inspection, put-away.
**Storage:** Slotting strategy (fast movers near outbound; heavy items at floor level).
**Picking:** Order fulfillment. Batch picking, zone picking, wave picking.
**Packing and shipping:** Outbound.

**Key metrics:**
Order fill rate: % of orders fully filled. Target: 99%+.
On-time shipping: % of orders shipped on time.
Pick accuracy: % of lines picked correctly.
Inventory accuracy: Physical count vs. system record. Target: 99.9%+.
Cost per order shipped.

**Warehouse management system (WMS):** Tracks inventory location, directs picking, manages receiving.

## Last-mile delivery

Most expensive segment (~40-60% of total shipping cost).
**Options:** Parcel carriers (UPS, FedEx, USPS), regional carriers, gig economy (Amazon Flex, DoorDash), lockers/PUDO (pick-up drop-off) points, autonomous/drone delivery (emerging).

**Returns (reverse logistics):** E-commerce returns 15-40% of purchases. Restocking, inspection, disposition (resell, return to vendor, liquidate, dispose). Reverse logistics often costs as much as forward.

Sources: CSCMP Council of Supply Chain Management Professionals (cscmp.org — free resources), Incoterms 2020 summaries (iccwbo.org), US CBP customs guidance (cbp.gov — free)
