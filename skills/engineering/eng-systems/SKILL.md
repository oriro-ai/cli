---
name: eng-systems
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >





  Systems engineering — requirements analysis, system architecture, integration, verification, and complex system design.

  Sources: MIT OCW, ASME principles, OSHA, engineering textbook fundamentals.
  Consult a licensed professional engineer for safety-critical calculations.
---

# Systems Engineering

## What systems engineering is

Systems engineering (SE) ensures that a complex system meets stakeholder needs through all phases of its life cycle.
Not just engineering the components — engineering the whole, including interfaces between components, and how the system fits its operational environment.
Critical for: aerospace, defense, large infrastructure, medical devices, complex software-hardware systems.

## The SE process

### Stakeholder needs analysis

Who are the stakeholders? Operators, maintainers, acquirers, regulatory bodies.
What do they need the system to DO (not what it IS)?
Operational concept: Narrative description of how system will be used.
ConOps (Concept of Operations): Formal document describing system operation from user perspective.

### Requirements engineering

**Stakeholder requirements → System requirements → Subsystem requirements**
Good requirement: "The system shall [perform function] [under conditions] [to performance level]."
**SMART requirements:** Specific, Measurable, Achievable, Relevant, Traceable.
**Requirement attributes:** Unique ID, statement, rationale, verification method, source.

**Common requirement errors:**
Ambiguous: "The system shall respond quickly" — define "quickly."
Non-verifiable: "The system shall be user-friendly" — no objective test.
Gold-plating: Requirements beyond actual stakeholder need.

### System architecture

**Functional decomposition:** Break system functions into sub-functions hierarchically.
**Physical decomposition:** Map functions to physical components/subsystems.
**Interface definition:** Define all interfaces between components. Interface Control Document (ICD).
**N-squared diagram:** Visualize interfaces between all system elements.

### Verification and Validation

**Verification:** "Did we build the system right?" Does it meet specifications?
Methods: Test (direct measurement), Analysis, Inspection, Demonstration.
**Validation:** "Did we build the right system?" Does it meet stakeholder needs?
Typically through operational testing with actual users.

**Requirements traceability matrix:** Maps each requirement to its verification method, test, and result.

## Reliability engineering

**Reliability:** Probability that a system performs its required function for a specified period under stated conditions.
**MTBF (Mean Time Between Failures):** λ = 1/MTBF (failure rate).
**System reliability (series):** R_system = R₁ × R₂ × R₃ (all must work)
**System reliability (parallel redundancy):** R_system = 1 - (1-R₁)(1-R₂) (either can work)

**FMEA (Failure Mode and Effects Analysis):**
For each component: What can fail? How can it fail? What's the effect? How severe? How likely? How detectable?
RPN = Severity × Occurrence × Detection (1-10 each). Prioritize high RPN items.

**Fault Tree Analysis (FTA):**
Top-down. Start with undesired event. Work backward to root causes.
AND gates: All inputs must occur. OR gates: Any input causes output.
Quantify probability of top event from component failure rates.

Sources: INCOSE Systems Engineering Handbook (incose.org — free summaries),
NASA Systems Engineering Handbook (free public domain), DAU SE Handbook, MIL-STD-882E safety standards
