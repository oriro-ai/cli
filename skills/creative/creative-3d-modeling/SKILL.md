---
watermark: ORIRO
disable-model-invocation: true
name: creative-3d-modeling
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  3D modeling — Blender, FreeCAD, OpenSCAD, mesh modeling, and 3D printing
  preparation. Activate for 3D design, modeling questions, or print preparation.
  Sources: Blender Foundation (CC-BY), FreeCAD docs (LGPL), Prusa Knowledge Base.
---

# 3D Modeling and Design

## Blender (free, open source — blender.org)

### Interface basics

**Number pad:** 1=front, 3=side, 7=top, 5=ortho/perspective toggle, 0=camera.
**G/R/S:** Grab, Rotate, Scale. Follow with X/Y/Z to constrain.
G X 2 = move 2 units along X. R Z 45 = rotate 45° around Z.
**Tab:** Toggle Object Mode / Edit Mode.

### Modeling in Edit Mode

**Extrude (E):** Pull geometry out.
**Loop Cut (Ctrl+R):** Add edge loops. Scroll wheel for more loops.
**Bevel (Ctrl+B):** Round edges.
**Boolean Modifier:** Union, Difference, Intersect operations.
**Subdivision Surface:** Adds smooth subdivisions non-destructively. Level 2-3 for most objects.

## FreeCAD (parametric CAD, free)

For engineering/technical design. Dimensions drive geometry.
**Workflow:** New Sketch → Draw 2D profile → Constrain fully (blue = fully constrained) → Pad (extrude) or Pocket (cut).
**Constraints:** Horizontal, Vertical, Coincident, Distance, Angle, Equal.

## OpenSCAD (code-based 3D modeling, free)

Describe 3D objects with code. Great for parametric designs.

```openscad
difference() {
    cylinder(h=80, r=40, $fn=100);
    translate([0, 0, 5])
        cylinder(h=80, r=37, $fn=100);
}
```

**Primitives:** cube(), sphere(), cylinder().
**Boolean:** union(), difference(), intersection().

## 3D Printing Preparation

**Slicer software:** PrusaSlicer (free), Cura (free), OrcaSlicer (free).
**Key settings:**
Layer height: 0.2mm standard. 0.1mm fine detail. 0.3mm fast.
Infill: 15-20% general. 40-60% structural.
Walls: 3-4 for structural parts.
Supports: Required for overhangs >45°.
**Filament temperatures:** PLA 200-220°C. PETG 230-250°C. ABS 240-260°C.

## Mesh optimization

**Manifold mesh:** Closed surface, no holes. Required for printing.
**Wall thickness:** Minimum 1.2mm (3 extrusion widths at 0.4mm nozzle).
**Tolerances:** 0.2-0.4mm for mechanical fits.

Sources: Blender Foundation tutorials (blender.org, CC-BY), FreeCAD docs (LGPL),
OpenSCAD manual (free), Prusa Knowledge Base (free)
