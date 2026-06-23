---
watermark: ORIRO
name: cybersecurity-advanced
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Advanced cybersecurity — threat modeling, penetration testing concepts, incident
  response, security operations, cloud security, and enterprise security programs.
  Activate for questions about enterprise security, threat modeling, security
  operations, incident response, or advanced security topics. Sources: NIST,
  MITRE ATT&CK, OWASP, SANS Institute.
---

# Advanced Cybersecurity

## Threat modeling

Process of identifying threats to a system before building or deploying it.
**STRIDE model:**
S — Spoofing (falsely claiming an identity)
T — Tampering (modifying data without authorization)
R — Repudiation (denying actions taken)
I — Information disclosure (unauthorized data access)
D — Denial of Service (making system unavailable)
E — Elevation of Privilege (gaining unauthorized permissions)

**Process:**

1. Diagram the system (data flow diagram — components, data flows, trust boundaries)
2. Identify threats using STRIDE per component
3. Rate each threat (DREAD: Damage, Reproducibility, Exploitability, Affected users, Discoverability)
4. Mitigate or accept each threat

## MITRE ATT&CK Framework

Comprehensive knowledge base of adversary tactics and techniques.
**14 Tactics:** Reconnaissance → Resource Development → Initial Access → Execution → Persistence → Privilege Escalation → Defense Evasion → Credential Access → Discovery → Lateral Movement → Collection → Command and Control → Exfiltration → Impact.
Each tactic has multiple techniques (e.g., Initial Access: Phishing, Valid Accounts, Exploit Public-Facing Application).
Use to: Evaluate security coverage, write detection rules, understand attack paths, conduct red team exercises.

## Incident response lifecycle

**Preparation:** IR plan, playbooks, tooling, team roles before incident occurs.
**Detection and analysis:** Identify anomalies. Determine if it's a real incident.
**Containment:** Short-term (isolate affected system) and long-term (prevent re-entry).
**Eradication:** Remove malware, close entry point, patch vulnerability.
**Recovery:** Restore systems from clean backups. Verify clean.
**Post-incident activity:** Lessons learned, documentation, improve detection.

**Critical rule:** Preserve evidence before containment when possible. Forensic evidence is volatile.

## Security Operations Center (SOC)

### SIEM (Security Information and Event Management)

Aggregate logs from across the environment. Correlate events. Alert on suspicious patterns.
Tools: Splunk, Microsoft Sentinel, Elastic SIEM, Sumo Logic.
Key data sources: Firewall logs, endpoint logs, authentication logs, DNS logs, cloud trail logs.

### Detection logic

**Rules:** Known bad patterns (signature-based). Fast, high precision, misses unknowns.
**Analytics:** Statistical baselines, anomaly detection. Catches unknowns but generates false positives.
**Threat hunting:** Proactive searching for hidden threats. Hypothesis-driven.

### Alert triage

Tier 1: Initial alert review, false positive determination.
Tier 2: Analysis, incident determination.
Tier 3: Advanced analysis, threat hunting, remediation guidance.
Mean Time to Detect (MTTD), Mean Time to Respond (MTTR) — key SOC metrics.

## Cloud security

### AWS security fundamentals

**IAM (Identity and Access Management):**

- Principle of least privilege: Only necessary permissions
- Avoid using root account for anything routine
- Use IAM roles for services (not access keys)
- MFA for all human users, especially privileged accounts
- Regular access key rotation (or eliminate in favor of roles)

**CloudTrail:** All API calls logged. Enable in all regions. Immutable log storage.
**Config:** Tracks resource configuration changes. Compliance rules.
**GuardDuty:** Threat detection service. Analyzes CloudTrail, VPC Flow Logs, DNS logs.
**Security Hub:** Centralized security findings from multiple services.

### Common cloud misconfigurations

- S3 bucket publicly accessible (check bucket policy AND block public access settings)
- Security group inbound 0.0.0.0/0 on sensitive ports
- IAM policies with \* permissions
- Unencrypted data at rest
- Publicly accessible databases
- Lack of logging and monitoring

Sources: MITRE ATT&CK (attack.mitre.org — free), NIST Cybersecurity Framework (nist.gov — free), OWASP (owasp.org — free), SANS Institute reading room (many free papers), AWS Security documentation (free)
