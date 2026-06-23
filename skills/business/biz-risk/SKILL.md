---
watermark: ORIRO
disable-model-invocation: true
name: biz-risk
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Business risk management — risk identification, assessment, mitigation, business
  continuity, and enterprise risk management. Activate for questions about
  business risks, risk assessment, contingency planning, business continuity,
  enterprise risk, or any risk management question. Sources: COSO ERM framework,
  ISO 31000, FEMA business continuity guidance.
---

# Business Risk Management

## Risk fundamentals

**Risk = Probability × Impact**
A high-probability, low-impact risk may be less important than a low-probability, catastrophic risk.
**Risk appetite:** How much risk the organization is willing to accept to achieve its objectives.
**Risk tolerance:** Acceptable variation around the risk appetite.

## Risk categories (COSO framework)

**Strategic:** Risks to achieving strategic objectives. Competition, technology disruption, market shifts.
**Operational:** Risks in day-to-day operations. Process failures, IT outages, key person dependency.
**Financial:** Market risk, credit risk, liquidity risk, currency risk.
**Compliance:** Regulatory violations, legal liability, ethical failures.
**Reputational:** Damage to brand and trust. Often downstream consequence of other risks.
**Cyber:** Data breaches, ransomware, system failures, insider threats.

## Risk assessment process

**Step 1 — Identify:** Brainstorm, interview, review historical incidents, examine industry data.
**Step 2 — Assess:** Rate probability (1-5) and impact (1-5). Plot on risk matrix.
**Step 3 — Respond:**
Avoid: Eliminate the risk by changing plans.
Mitigate: Reduce probability or impact. Most common response.
Transfer: Insurance, contracts, outsourcing.
Accept: Consciously accept the risk (appropriate for low score or when treatment cost exceeds risk cost).
**Step 4 — Monitor:** Track risks over time. New risks emerge; old risks change.

## Risk register

Document capturing all identified risks:
| Risk ID | Description | Category | Probability | Impact | Score | Owner | Response | Status |
Each risk has an owner who is accountable for monitoring and response.
Review monthly in fast-changing environments; quarterly otherwise.

## Business continuity planning (BCP)

**Business Impact Analysis (BIA):** Which processes are most critical? How long can each be interrupted?
RTO (Recovery Time Objective): How long can you be down?
RPO (Recovery Point Objective): How much data loss can you tolerate?
Tier 1 processes (< 4hr RTO): Core revenue-generating operations.
Tier 2 (< 24hr): Important but not immediately critical.
Tier 3 (< 72hr): Non-critical operations.

**Disaster recovery:** Specifically for IT/technology recovery.
Hot site: Fully equipped backup facility, near-immediate failover. Expensive.
Warm site: Equipment present, needs configuration. Hours to activate.
Cold site: Empty facility, bring your own equipment. Days to activate.
Cloud backup: Most modern approach — often better RTO/RPO than traditional methods.

**Business continuity plan components:**
Emergency contact lists (updated quarterly), evacuation procedures, communication plan (internal + external), critical process recovery procedures, alternate work locations, supplier backup options.

**Test your plan.** Untested plans fail when needed. Annual tabletop exercises minimum; live tests annually.

## Key person dependency

Single points of failure in human capital — common in small businesses.
Identify: Whose absence (planned or unplanned) would significantly disrupt operations?
Mitigate: Document critical processes, cross-train, succession planning, key-man insurance.

## Cyber risk (basics)

Phishing: #1 attack vector. Train employees. Email filtering. MFA on all accounts.
Ransomware: Offline backups not connected to network. Test restoration regularly.
Data breach: Encrypt sensitive data. Principle of least privilege. Incident response plan.
Vendor risk: Your vendors' security posture affects you. Review key vendors' security practices.

Sources: COSO ERM Framework (coso.org — free summaries), ISO 31000:2018 (principles),
FEMA Business Continuity Planning guide (free, ready.gov), NIST Cybersecurity Framework (free)
