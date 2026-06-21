---
name: eng-civil
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Civil and structural engineering fundamentals — loads, materials, structural
  systems, construction, and infrastructure. Activate for questions about
  building structures, load calculations, material selection, construction
  methods, foundations, bridges, or civil infrastructure. Sources: MIT OCW
  Civil Engineering, ASCE standards summaries, OSHA construction safety,
  USGS, OpenStax Physics. Consult a licensed professional engineer for
  structural calculations on actual construction projects.
---

# Civil and Structural Engineering

## Fundamental concepts

### Forces and loads

**Dead load:** Weight of the structure itself (permanent).
Typical values:

- Concrete: 150 lbs/ft³ (2,400 kg/m³)
- Steel: 490 lbs/ft³ (7,850 kg/m³)
- Wood (structural): 35-50 lbs/ft³
- Brick masonry: 120-130 lbs/ft³

**Live load:** Occupancy loads (people, furniture, equipment). Variable.
Typical design values (ASCE 7):

- Office floor: 50 psf (pounds per square foot)
- Residential: 40 psf
- Retail: 75-100 psf
- Assembly (fixed seats): 60 psf
- Library stacks: 150 psf

**Environmental loads:**

- Wind: depends on location, height, exposure. 90-150 mph design wind in US.
- Snow: 0-100 psf depending on location.
- Seismic: based on seismic zone, building occupancy, soil type.
- Hydrostatic (water pressure): 62.4 pcf × depth

**Load path:** How forces travel from roof → floors → walls → columns → foundation → soil.
Every element in a structure must be able to carry its portion of the total load to the ground.

---

## Structural systems

### Beam and column (post and beam)

Most common for buildings.
Columns carry vertical loads. Beams span horizontal distances.
Rigid connections create moment frames (resist lateral loads).
Pinned connections require additional lateral system (bracing, shear walls).

### Shear walls

Vertical elements that resist lateral (horizontal) loads — wind and seismic.
Typically concrete or masonry walls, or wood-framed walls with structural sheathing.
Must be positioned symmetrically to avoid torsion.

### Trusses

Triangulated frameworks. Efficient for long spans.
All members carry axial loads only (tension or compression, no bending).
Triangle is the only stable geometric shape without rigid joints.

**Common truss types:**

- Pratt: vertical members in tension, diagonals in compression (common)
- Warren: no vertical members; alternating diagonal pattern
- Howe: diagonals in tension, verticals in compression

### Foundations

**Shallow foundations (spread footings):**
Used when adequate bearing capacity near surface.
Strip footing: under walls.
Spread footing: under columns.
Mat foundation: one continuous slab under entire building.

**Deep foundations:**
Used when surface soils are inadequate.
Piles: driven or drilled into competent bearing layer.
Drilled piers/caissons: large-diameter drilled shafts.

**Soil bearing capacity:**
Sandy soil: 2,000-3,000 psf typical
Clay: 1,000-2,000 psf
Rock: 40,000+ psf
Must verify with geotechnical investigation for real projects.

---

## Materials

### Concrete

**Composition:** Portland cement + water + fine aggregate + coarse aggregate.
Water-to-cement ratio: lower = stronger, denser, more durable.

**Compressive strength (f'c):** Typical structural concrete: 3,000-5,000 psi.
High-performance: 10,000+ psi.
**Tensile strength:** Only ~10% of compressive strength.
→ Reinforce with steel where tension occurs.

**Curing:** Concrete gains strength as it hydrates. Keep moist for 28 days.
At 28 days: ~100% design strength. At 7 days: ~70%.

**Reinforced concrete (RC):**
Steel rebar placed where tension expected.
Typical rebar sizes: #3 (3/8" diameter) through #11 (1-3/8").
Cover: 1.5"-3" of concrete over rebar (protects from corrosion and fire).

**Pre-stressed/post-tensioned concrete:**
Steel tendons tensioned to put concrete in compression.
Allows longer spans and thinner sections.

### Steel

**Wide-flange (W-shape) beams:** Most common structural steel.
Designation: W12×35 = 12" nominal depth × 35 lb/linear foot.

**Advantages over concrete:**
High strength-to-weight ratio. Ductile (bends before failing). Recyclable. Fast to erect.

**Disadvantages:**
Expensive. Requires fireproofing. Corrosion if not protected.

**Common grades:**
A36: Fy = 36 ksi (older, still common)
A572 Gr50: Fy = 50 ksi (more efficient, widely used)

**Connection types:**
Bolted: faster, field connections. A325 or A490 high-strength bolts.
Welded: stronger, more rigid. Requires inspection.

### Wood

**Sawn lumber:** 2×4, 2×6, etc. (actual dimensions smaller than nominal).
Species and grade affect strength significantly.
Douglas fir and Southern yellow pine most common for structural use.

**Engineered wood:**
LVL (Laminated Veneer Lumber): predictable, high-strength beams.
Glulam: glued laminated beams; very long spans.
CLT (Cross-Laminated Timber): mass timber panels; alternative to concrete slabs.
I-joists: floor and roof framing; engineered for efficiency.

---

## Soil and geotechnical basics

### Soil classification

Clay: fine-grained, plastic, compressible, low permeability.
Silt: fine-grained, low plasticity, frost-susceptible.
Sand: granular, non-plastic, permeable, good bearing.
Gravel: coarse, excellent bearing capacity, drains well.

**USCS (Unified Soil Classification System):**
GW = gravel, well-graded (excellent)
GP = gravel, poorly-graded (good)
SW = sand, well-graded (good)
SC = sandy clay (moderate)
CL = lean clay (moderate to poor)
CH = fat clay (poor; expansive)
OH = organic clay (avoid for foundations)

### Settlement

**Immediate settlement:** Occurs during loading. Mostly in sands and gravels.
**Consolidation settlement:** Slow drainage of water from clay. Can take years.
**Differential settlement:** Different settlement at different points. Most damaging to structures.

### Slope stability

Factor of Safety = Resisting forces / Driving forces
Minimum FS = 1.5 for most cuts and fills; higher for critical slopes.
Failures: slides, rotational failures, erosion.

---

## Construction fundamentals

### Critical path method (CPM)

Identify all project activities and dependencies.
Critical path: longest chain of dependent activities. Any delay here delays the whole project.
Float: time an activity can be delayed without delaying the project.

### Site safety (OSHA)

**Fall protection required** at heights of 6 feet in construction (4 feet in general industry).
Options: guardrails, safety nets, personal fall arrest systems.

**Excavation safety (OSHA 29 CFR 1926 Subpart P):**
Trenches 5+ feet: require protective system (sloping, shoring, trench box).
Trench rescue plan required.
Never enter an unprotected trench.

**Electrical:**
Maintain 10-foot clearance from overhead power lines.
GFCI protection required on all construction sites.

### Sustainability and LEED

Energy efficiency: insulation, high-performance windows, efficient HVAC.
Water efficiency: low-flow fixtures, rainwater harvesting, greywater.
Materials: recycled content, regional sourcing, FSC-certified wood.
Indoor air quality: low-VOC materials, ventilation.

LEED certification: Certified, Silver, Gold, Platinum based on points.

Sources: MIT OpenCourseWare Civil Engineering (ocw.mit.edu),
ASCE 7 (Minimum Design Loads for Buildings and Other Structures) principles,
OSHA Construction Safety Standards, USGS geological survey data,
ACI 318 (Concrete Code) principles, AISC Steel Design Guide principles
