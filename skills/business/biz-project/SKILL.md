---
watermark: ORIRO
disable-model-invocation: true
name: biz-project
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Project management — Agile, Scrum, Kanban, waterfall, planning, estimation,
  risk management, and stakeholder communication. Activate for questions about
  managing projects, planning sprints, writing user stories, managing timelines,
  handling project risks, or any project management question. Sources: PMI PMBOK
  principles, Agile Manifesto, Scrum Guide (CC), OpenStax Management.
---

# Project Management

## Waterfall vs. Agile

|              | Waterfall                              | Agile                            |
| ------------ | -------------------------------------- | -------------------------------- |
| Requirements | Fixed upfront                          | Evolve through iterations        |
| Delivery     | Single large delivery at end           | Working software every 2-4 weeks |
| Changes      | Expensive and disruptive               | Expected and welcome             |
| Planning     | Detailed upfront                       | Continuous, just-in-time         |
| Best for     | Fixed-scope, well-defined requirements | Complex, evolving products       |

**Most software projects today use Agile.** Waterfall still common for construction, hardware, regulated industries.

---

## Scrum framework

**Roles:**
**Product Owner:** Defines what to build. Owns and prioritizes the backlog. Voice of the customer.
**Scrum Master:** Facilitates Scrum process. Removes impediments. NOT a project manager.
**Development Team:** Cross-functional team that builds the product. Self-organizing. 3-9 people.

**Artifacts:**
**Product Backlog:** Ordered list of everything that might be needed in the product. Product Owner owns it.
**Sprint Backlog:** Subset selected for the current sprint. Team owns it.
**Increment:** Working software produced each sprint.

**Events:**
**Sprint:** 1-4 week timebox (2 weeks is most common).
**Sprint Planning:** Team selects backlog items for the sprint. Creates Sprint Backlog.
**Daily Scrum (standup):** 15 minutes. Three questions:

- What did I do yesterday?
- What will I do today?
- Any blockers?
  **Sprint Review:** Demo working software to stakeholders. Get feedback.
  **Sprint Retrospective:** Team reflects. What went well? What to improve?

---

## User Stories

Format: **As a [user type], I want [feature/action] so that [benefit].**

Good user story:
"As a registered customer, I want to save my payment information so that I can checkout faster on future purchases."

**INVEST criteria for good user stories:**

- **I**ndependent: can be developed in any order
- **N**egotiable: not a contract, can be adjusted
- **V**aluable: delivers value to user or business
- **E**stimable: team can size it
- **S**mall: fits in one sprint
- **T**estable: acceptance criteria are clear

**Acceptance criteria:** Specific conditions that must be met for story to be "done."
Given [context] / When [action] / Then [result] (Gherkin format)

---

## Story points and estimation

Story points = relative measure of complexity, effort, and uncertainty. Not hours.

**Planning Poker:**
Each team member estimates using Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21.
Everyone reveals simultaneously. Discuss differences. Re-estimate if needed.

**Velocity:** Average story points completed per sprint.
Use for forecasting: 40 story points in backlog / 20 velocity = ~2 sprints.

**Reliable after:** 3-4 sprints of data.

---

## Kanban

Visual workflow management.
**Columns (minimum):** To Do → In Progress → Done
**Work in Progress (WIP) limits:** Maximum items in each column simultaneously.
Enforces flow; prevents bottlenecks from hiding.

**Kanban metrics:**
Lead time: Total time from request to delivery.
Cycle time: Time from start of work to delivery.
Throughput: Number of items completed per unit time.

**Kanban vs. Scrum:**
Kanban: Continuous flow, no sprints, less ceremony. Good for operations and support.
Scrum: Fixed iterations, defined ceremonies. Good for product development.

---

## Waterfall planning

### Work Breakdown Structure (WBS)

Hierarchical decomposition of all project work.
Level 1: Project
Level 2: Major deliverables
Level 3: Work packages
Level 4: Tasks

Every task should be:

- Assigned to one person
- Estimable in time
- Verifiable when complete

### Critical Path Method (CPM)

1. List all activities
2. Estimate durations
3. Identify dependencies
4. Calculate earliest/latest start and finish
5. Critical path: longest chain of dependent activities
6. Float: slack time for non-critical activities

Any delay on critical path = same delay in project completion.
Focus management attention on critical path.

### Gantt chart

Horizontal bar chart showing tasks over time.
Useful for communication; less useful for tracking complex dependencies.

---

## Risk management

**Risk register:** Document identifying and tracking all project risks.
For each risk:

- Description
- Probability (1-5 scale)
- Impact (1-5 scale)
- Risk score = Probability × Impact
- Response: Avoid, Mitigate, Transfer, Accept
- Owner
- Status

**Response strategies:**
**Avoid:** Change plan to eliminate risk entirely.
**Mitigate:** Reduce probability or impact (contingency plans).
**Transfer:** Shift risk to third party (insurance, contractor).
**Accept:** Acknowledge risk; no action taken (appropriate for low score).

---

## Stakeholder management

**Stakeholder matrix:**
High power, high interest → Manage closely
High power, low interest → Keep satisfied
Low power, high interest → Keep informed
Low power, low interest → Monitor

**Communication plan:**
For each key stakeholder: what information, how often, in what format.
Executive: Monthly summary dashboard.
Team: Daily standups + weekly status.
Customer: Sprint reviews + release notes.

**Status reports (weekly):**

- What was accomplished
- What is planned for next period
- Risks and issues
- Help needed

---

## Definition of Done (DoD)

Team-agreed checklist for what "done" means.
Typical DoD:

- [ ] Code reviewed by at least one other team member
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Documentation updated
- [ ] Deployed to staging environment
- [ ] Acceptance criteria met
- [ ] Product Owner accepted

Sources: Scrum Guide (scrumguides.org — CC-BY-SA), Agile Manifesto (agilemanifesto.org),
PMI PMBOK principles (pmi.org), OpenStax Principles of Management (CC-BY)
