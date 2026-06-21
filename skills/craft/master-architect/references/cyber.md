# Cybersecurity Intelligence Reference

# Covers: AppSec, NetSec, CloudSec, DevSecOps, Threat Intel, SIEM, Compliance, Fraud, Incident Response

## DEFENSE IN DEPTH MODEL

Never rely on a single control. Layer security at every level:

```
Layer 1 — Perimeter:      WAF, DDoS protection, CDN edge rules, geo-blocking
Layer 2 — Network:        Firewall rules, VPC isolation, private subnets, VPN, zero-trust network access
Layer 3 — Identity:       MFA, SSO, PAM, least privilege, just-in-time access
Layer 4 — Application:    Input validation, auth/authz, CSRF, rate limiting, API security
Layer 5 — Data:           Encryption at rest + transit, tokenization, masking, key management
Layer 6 — Endpoint:       EDR, patch management, container hardening, OS baselines
Layer 7 — Detection:      SIEM, anomaly detection, threat intel feeds, behavioral analytics
Layer 8 — Response:       IR playbooks, forensics capability, backup/restore tested weekly

Principle: Assume every layer will eventually be breached. Design so that one breach ≠ catastrophe.
```

---

## OWASP TOP 10 — WEB (2021) — Fix Every One

### A01: Broken Access Control (Most Common)

```
Attack:    Access /api/users/456 as user 123. Horizontal privilege escalation.
Fix:       Always verify ownership: WHERE id = $1 AND org_id = $current_org
           Row-Level Security in PostgreSQL enforces this at DB level.
           Never trust user-supplied IDs without authorization check.
Test:      Authenticated as User A, attempt all User B's resource endpoints.

Code fix:
// BAD:
const tx = await db.transaction.findUnique({ where: { id: req.params.id }})

// GOOD:
const tx = await db.transaction.findUnique({
  where: { id: req.params.id, userId: req.user.id }  // scope to authenticated user
})
if (!tx) throw new NotFoundError()  // same error whether missing or unauthorized
```

### A02: Cryptographic Failures

```
Attack:    Sensitive data in plaintext DB, MD5 passwords, HTTP traffic, weak keys.
Fix:       TLS 1.3 everywhere. AES-256-GCM for data at rest.
           Passwords: argon2id (winner of PHC). Never MD5/SHA1/bcrypt(cost<12).
           PII fields: encrypt at application layer (not just disk encryption).
           No secrets in logs. No PAN/SSN in URLs.

Password hashing:
import argon2 from 'argon2'
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64MB
  timeCost: 3,        // 3 iterations
  parallelism: 4      // 4 threads
})
```

### A03: Injection (SQL, NoSQL, LDAP, Command)

```
Attack:    User inputs: ' OR '1'='1 → dumps entire table.
Fix:       Parameterized queries. ALWAYS. No string concatenation in queries.
           ORM query builders (Prisma, SQLAlchemy) are safe by default.
           Command injection: never exec() user input. Use allowlists.

// NEVER:
db.query(`SELECT * FROM users WHERE email = '${email}'`)

// ALWAYS:
db.query('SELECT * FROM users WHERE email = $1', [email])
```

### A04: Insecure Design

```
Attack:    Business logic flaws — buy item for $0, skip payment step, replay coupons.
Fix:       Threat model every feature before coding.
           State machine validation — enforce valid state transitions server-side.
           Rate limit sensitive operations (password reset: 3/hour, not 1000/hour).
           Never trust client-side price/discount calculation.
```

### A05: Security Misconfiguration

```
Common:   Default credentials, directory listing, verbose error messages in prod,
          open S3 buckets, unrestricted CORS, unused ports open, debug mode on.
Fix:      Infrastructure as Code — configuration is reviewed, version-controlled.
          CSPM tool (Wiz, Prisma Cloud, or free: CloudSploit) scans continuously.
          Env diff check: prod config audited against security baseline weekly.
          Error responses: generic in prod, never stack traces to client.
```

### A06: Vulnerable and Outdated Components

```
Fix:      Renovate Bot or Dependabot — auto-PRs for dependency updates weekly.
          Snyk or OWASP Dependency-Check in CI — block on critical CVEs.
          Container base image scanning — Trivy on every Docker build.
          SBOM (Software Bill of Materials) generated on every release.
          Never use packages with 0 maintenance activity in past 12 months.
          Pin exact versions in lockfiles (package-lock.json, requirements.txt).
```

### A07: Identification and Authentication Failures

```
Attack:   Credential stuffing, brute force, session fixation, weak tokens.
Fix:      MFA mandatory for admin, recommended for all users.
          Account lockout: 5 failed attempts → 15min lockout + alert.
          Secure session: HttpOnly, Secure, SameSite=Strict cookies.
          Token storage: never localStorage (XSS), always HttpOnly cookies.
          Password policy: min 12 chars, check against HaveIBeenPwned API.
          JWT: RS256 (not HS256), short TTL (15min), rotate signing keys quarterly.
```

### A08: Software and Data Integrity Failures

```
Attack:   Tampered auto-updates, unsigned packages, CI/CD pipeline compromise.
Fix:      Verify checksums/signatures on all downloaded artifacts.
          Sigstore/Cosign for container image signing.
          SLSA framework for supply chain levels (target SLSA Level 3).
          CI/CD: separate credentials per environment, audit pipeline configs.
          npm: use --ignore-scripts flag, audit before install.
```

### A09: Security Logging and Monitoring Failures

```
Fix:      Log: every auth event, admin action, failed access, data mutation.
          Include: timestamp (UTC), user_id, org_id, IP, action, resource, result.
          Never log: passwords, tokens, PAN, SSN, CVV, full credit card.
          Alert within 15 minutes on: impossible travel, mass data export,
                                       admin privilege escalation, >10 auth failures.
          Log retention: 90 days hot, 1 year cold (PCI DSS requires 1 year).
          SIEM: ingest all logs, alert on patterns, not just individual events.
```

### A10: Server-Side Request Forgery (SSRF)

```
Attack:   User supplies URL → server fetches it → attacker reads internal metadata API.
          AWS: http://169.254.169.254/latest/meta-data/iam/security-credentials/
Fix:      Allowlist permitted URL destinations — never arbitrary user-supplied URLs.
          Block RFC 1918 addresses (10.x, 172.16.x, 192.168.x) and 169.254.x.
          Use DNS resolution + IP check BEFORE fetching.
          Disable HTTP redirects or validate redirect target against allowlist.
```

---

## OWASP API SECURITY TOP 10 (2023)

```
API1:  Broken Object Level Authorization  → Scope every query to authenticated user/org
API2:  Broken Authentication              → Short-lived tokens, rotate refresh tokens
API3:  Broken Object Property Auth        → Allowlist response fields, never return full DB row
API4:  Unrestricted Resource Consumption  → Rate limit, payload size limits, pagination required
API5:  Broken Function Level Auth         → Admin endpoints on separate auth check, not just UI hide
API6:  Unrestricted Access to Sensitive Business Flows → Bot detection, device fingerprinting
API7:  Server-Side Request Forgery        → Same as web SSRF above
API8:  Security Misconfiguration          → No CORS *, no debug headers, no default paths
API9:  Improper Inventory Management      → API versioning, decommission old versions with traffic
API10: Unsafe Consumption of APIs         → Validate all third-party API responses before use
```

---

## THREAT MODELING

### STRIDE Framework (Apply to Every Feature)

```
S — Spoofing:         Can an attacker impersonate a legitimate user or service?
                      Mitigate: Strong auth, mutual TLS, digital signatures

T — Tampering:        Can data be modified in transit or at rest without detection?
                      Mitigate: Integrity checks, signed tokens, audit logs, TLS

R — Repudiation:      Can someone deny performing an action?
                      Mitigate: Immutable audit logs, signed requests, non-repudiation tokens

I — Information Disclosure: Can sensitive data be exposed to unauthorized parties?
                      Mitigate: Least privilege, encryption, data classification, masking

D — Denial of Service: Can an attacker disrupt availability?
                      Mitigate: Rate limiting, auto-scaling, circuit breakers, DDoS protection

E — Elevation of Privilege: Can a user gain more access than they should have?
                      Mitigate: RBAC, least privilege, privilege validation server-side
```

### Threat Modeling Process (Per Feature)

```
Step 1: DECOMPOSE — Draw data flow diagram. Identify trust boundaries, entry points, data stores.
Step 2: THREATS — For each component, apply STRIDE. List all plausible attacks.
Step 3: RANK — Severity × Likelihood = Risk score (DREAD or CVSS)
Step 4: MITIGATE — For each threat: mitigate, transfer, accept, or avoid.
Step 5: VALIDATE — Write security test for each mitigated threat.
Step 6: REPEAT — Re-threat-model when architecture changes.

Time required: 2-4 hours per major feature. Non-negotiable for financial features.
```

---

## APPLICATION SECURITY (APPSEC) PIPELINE

### DevSecOps — Shift Left

```
Pre-commit:     git-secrets / detect-secrets / Gitleaks — block secret commits
                IDE plugins: Snyk IntelliJ, SonarLint VSCode (real-time SAST)

PR / CI:        SAST — Static analysis (Semgrep, SonarQube, CodeQL)
                SCA  — Dependency check (Snyk, OWASP DC, npm audit)
                Secrets scan — Gitleaks, TruffleHog
                IaC scan — Checkov, tfsec (Terraform misconfigs)
                Container scan — Trivy (image CVEs)

Pre-deploy:     DAST — Dynamic scan against staging (OWASP ZAP, Burp Suite)
                API fuzzing — Schemathesis, restler-fuzzer

Production:     RASP — Runtime application self-protection (contrast, sqreen)
                WAF — Cloudflare WAF / AWS WAF / Cloud Armor (rules updated weekly)
                Dependency monitor — Snyk monitor / Dependabot alerts
```

### SAST Tool Selection

```
Semgrep:        Fast, open source, custom rules, CI-native. Best first choice.
SonarQube:      Comprehensive, CI integration, tracks debt over time. Self-hosted or cloud.
CodeQL:         GitHub-native, deep semantic analysis, best for complex vulnerability patterns.
Checkmarx:      Enterprise, expensive, deep analysis.
Veracode:       Enterprise SaaS, compliance-oriented.

Run Semgrep + SonarQube minimum. CodeQL for GitHub repos (free for public).
```

### Penetration Testing Methodology

```
Phase 1 — Reconnaissance:
  Passive: Shodan, Censys, Google dorks, LinkedIn (OSINT)
  Active:  nmap port scan, service fingerprinting, SSL/TLS scan (testssl.sh)

Phase 2 — Enumeration:
  Web: Dirb/ffuf (directory brute-force), nikto (web scanner)
  API: Postman collection analysis, OpenAPI spec review, parameter fuzzing
  Auth: JWT inspection, session token analysis, OAuth flow review

Phase 3 — Exploitation:
  Automated: OWASP ZAP active scan, SQLmap (SQL injection), Nuclei templates
  Manual: Business logic testing, auth bypass, IDOR, race conditions

Phase 4 — Post-Exploitation:
  Lateral movement (if scoped), privilege escalation, persistence mechanisms

Phase 5 — Reporting:
  CVSS scores for each finding, reproduction steps, remediation guidance, risk rating

Cadence: Annual third-party pentest + quarterly internal. Before major releases.
Tools: Burp Suite Pro, OWASP ZAP, Metasploit, Nmap, Nikto, SQLmap, Nuclei, Amass
```

---

## ZERO TRUST ARCHITECTURE

```
Core Principles:
  1. Never trust, always verify — network location grants zero trust
  2. Least privilege access — time-limited, just enough, just-in-time
  3. Assume breach — segment everything, monitor everything, limit blast radius
  4. Verify explicitly — authenticate and authorize every request, every time

Implementation:
  Identity:      Every user + device verified before access (MFA + device health check)
  Device:        Managed devices only for admin access. MDM enrolled.
  Network:       Micro-segmentation. Services can't talk unless explicitly allowed.
                 Replace VPN with identity-aware proxy (Google BeyondCorp, Cloudflare Access)
  Application:   Each app verifies identity independently. No "trusted" internal networks.
  Data:          Classify data. Apply policy per classification. Encrypt in use.

GCP Implementation:
  Identity-Aware Proxy (IAP) → protects internal apps without VPN
  VPC Service Controls → data perimeter, prevents data exfil from GCP services
  Organization Policy → org-wide guardrails (no public IPs, require CMEK, etc.)
  Access Context Manager → attribute-based access (IP, device, user)
```

---

## CLOUD SECURITY (CSPM + CWPP)

### Cloud Security Posture Management (CSPM)

```
What it does:   Continuously scans cloud config for misconfigurations and compliance violations
Tools:
  Wiz:          Best coverage, agentless, fast. $15K+/yr
  Prisma Cloud: Palo Alto, comprehensive, expensive
  Lacework:     Behavioral analysis + CSPM combo
  CloudSploit:  Open source, GCP/AWS/Azure. Free.
  ScoutSuite:   Open source audit tool. Run quarterly.

Must-catch misconfigs:
  □ Public S3/GCS buckets
  □ Unrestricted security group rules (0.0.0.0/0 inbound)
  □ Unencrypted database instances
  □ MFA not enabled on root/admin accounts
  □ Logging disabled (CloudTrail/Cloud Audit Logs)
  □ Old IAM access keys (>90 days)
  □ Public SSH/RDP ports exposed (22, 3389)
  □ Default VPC in use for production
```

### Container & Kubernetes Security

```
Image security:
  □ Base image: use distroless or alpine (minimal attack surface)
  □ Never run as root (USER nobody in Dockerfile)
  □ No secrets in image layers (check with Trivy --secret)
  □ Sign images with Cosign (Sigstore)
  □ Image pull policy: Always (never cached stale images in prod)

Kubernetes:
  □ RBAC: no cluster-admin for workloads. Namespace-scoped roles only.
  □ Network Policies: default deny all, explicit allow per service pair
  □ Pod Security Standards: Restricted profile in production
  □ Secrets: use External Secrets Operator (GCP Secret Manager → K8s Secret)
  □ No privileged containers. No hostPID/hostNetwork.
  □ Resource limits on every container (prevents noisy neighbor + DoS)
  □ Admission controllers: OPA/Gatekeeper or Kyverno policy engine
  □ Runtime: Falco (detects anomalous container behavior in real-time)

Runtime security:
  Falco rules to alert on:
    - Shell spawned in container (exec into running container)
    - Unexpected outbound connections from container
    - Sensitive file read (/etc/shadow, /proc/*/mem)
    - Privilege escalation attempts
```

### GCP Security Hardening Checklist

```
Organization level:
  □ Organization Policy: Restrict public IPs on Cloud SQL
  □ Organization Policy: Require OS Login for Compute Engine
  □ Organization Policy: Restrict allowed APIs per project
  □ Cloud Audit Logs: DATA_READ + DATA_WRITE + ADMIN_WRITE on all services
  □ SCC (Security Command Center) Premium enabled

Project level:
  □ Default service accounts not used (create custom, least privilege)
  □ Service account keys: rotate quarterly or use Workload Identity instead
  □ Cloud SQL: private IP only, no public IP, SSL required
  □ GCS: uniform bucket-level access, no legacy ACLs
  □ Cloud Run: no unauthenticated invocations (except public endpoints)
  □ Secret Manager: audit access log enabled, rotation schedule set
  □ VPC: Private Google Access enabled, no default firewall rules
```

---

## SECURITY MONITORING & SIEM

### What to Log (Mandatory)

```
Authentication events:
  login_success, login_failure, logout, mfa_challenge, mfa_success, mfa_failure,
  password_reset_requested, password_changed, token_refreshed, token_revoked,
  session_expired, account_locked, account_unlocked

Authorization events:
  access_denied, privilege_escalation_attempt, role_assigned, role_revoked,
  admin_action (any), api_key_created, api_key_deleted

Data events:
  record_created, record_updated, record_deleted (with before/after for sensitive fields),
  bulk_export, bulk_delete, pii_accessed (who accessed whose data)

Infrastructure events:
  deploy_started, deploy_completed, deploy_failed, config_changed,
  secret_accessed (who, when, which secret), IAM_policy_changed

Format (every log line must have all fields):
{
  "timestamp": "2024-01-15T10:30:00.000Z",  // UTC always
  "trace_id": "abc-123",                     // correlate across services
  "user_id": "usr_xyz",                      // who did it
  "org_id": "org_abc",                       // tenant context
  "ip": "1.2.3.4",                           // source IP
  "user_agent": "...",                       // client context
  "action": "transaction.created",           // what happened
  "resource_id": "tx_123",                   // on what
  "result": "success",                       // success/failure/denied
  "duration_ms": 45                          // performance context
}
```

### SIEM Architecture

```
Sources:           App logs, Cloud Audit Logs, WAF logs, VPC Flow Logs, DNS logs
Ingestion:         Pub/Sub (GCP) or Kafka → log pipeline
Normalization:     Parse into common schema (CEF or ECS — Elastic Common Schema)
Storage:           BigQuery (GCP) or Elasticsearch — index for fast search
Correlation:       Detection rules — alert on patterns, not single events
Alerting:          PagerDuty / OpsGenie → on-call rotation
Response:          SOAR (Security Orchestration) — auto-remediate known patterns

Tools:
  Managed:        Google Chronicle, Microsoft Sentinel, Splunk, Sumo Logic
  Open source:    ELK Stack (Elasticsearch + Logstash + Kibana) + Sigma rules
  Lightweight:    Grafana + Loki + alert rules (good for small teams, low cost)
  GCP-native:     Chronicle SIEM (Google's) — best GCP log integration
```

### Detection Rules (Critical Alerts — PagerDuty Immediately)

```
Brute force:       >10 auth failures from same IP in 5 minutes
Credential stuffing: >5 failed logins across different accounts from same IP
Impossible travel: Login from country A, then country B within 2 hours
Mass data export:  Single user exports >1000 records in 10 minutes
Privilege escalation: Role change granting admin-level access
New admin account: Any new user assigned admin/owner role
Off-hours admin:   Admin action between 10PM-6AM (tune per org)
API key abuse:     Single API key >10,000 requests in 1 hour
Secret access:     Service accessing secrets it has never accessed before
Public resource:   Cloud storage bucket or DB made publicly accessible
New external IP:   Cloud Run service starts communicating with unknown external IP
```

### Threat Intelligence Integration

```
Feeds to consume:
  MITRE ATT&CK:   Adversary tactics, techniques, procedures (TTPs) — map detections to ATT&CK
  CISA KEV:       Known Exploited Vulnerabilities — patch these IMMEDIATELY (cisa.gov/kev)
  NVD CVE:        National Vulnerability Database — monitor for new critical CVEs
  AlienVault OTX: Open threat intelligence — IP/domain/hash reputation
  Shodan:         Monitor your own external attack surface
  PhishTank:      Phishing URL feeds

Integration pattern:
  Enrich every inbound IP in logs against threat intel feed (check reputation score)
  Block known-bad IPs at WAF level automatically
  Alert when traffic matches known malicious patterns (IoCs)

Tools: MISP (open source threat intel platform), OpenCTI, ThreatConnect
```

---

## CRYPTOGRAPHY STANDARDS

### What to Use (2024)

```
Symmetric encryption:  AES-256-GCM (authenticated encryption — integrity + confidentiality)
                       ChaCha20-Poly1305 (faster on mobile/embedded, same security)
                       Never: DES, 3DES, AES-ECB, RC4

Asymmetric:            RSA-4096 (key exchange/signing) — prefer Ed25519 for new systems
                       Ed25519 / ECDSA P-256 (digital signatures — faster, smaller keys)
                       ECDH P-256 (key agreement)
                       Never: RSA < 2048, DSA, MD5/SHA1 for signing

Hashing:               SHA-256 / SHA-3 for data integrity
                       BLAKE3 for performance-critical hashing
                       argon2id for password storage (never SHA/MD5 for passwords)
                       Never: MD5, SHA1 for security purposes

TLS:                   TLS 1.3 required. TLS 1.2 acceptable with restricted ciphers.
                       Never: SSL, TLS 1.0, TLS 1.1
                       Cipher suites: ECDHE + AES-128-GCM, ECDHE + AES-256-GCM, ECDHE + ChaCha20

Key management:        GCP Cloud KMS or AWS KMS or HashiCorp Vault
                       Rotate encryption keys annually
                       Key hierarchy: Master Key → Data Encryption Keys → Data
                       FIPS 140-2 Level 3 HSM for financial/regulated workloads

JWT signing:           RS256 (RSA) or ES256 (ECDSA) — never HS256 in multi-service arch
                       Key rotation: quarterly, with overlap period
```

### Envelope Encryption Pattern

```python
# Google Cloud KMS envelope encryption
from google.cloud import kms

def encrypt_sensitive_field(plaintext: str, key_name: str) -> dict:
    # 1. Generate a data encryption key (DEK) locally
    import os
    dek = os.urandom(32)  # 256-bit AES key

    # 2. Encrypt your data with the DEK
    ciphertext = aes_gcm_encrypt(plaintext.encode(), dek)

    # 3. Wrap (encrypt) the DEK with Cloud KMS master key
    kms_client = kms.KeyManagementServiceClient()
    wrapped_dek = kms_client.encrypt(name=key_name, plaintext=dek).ciphertext

    # 4. Store: ciphertext + wrapped DEK (KMS key never leaves KMS)
    return {"ciphertext": ciphertext.hex(), "wrapped_dek": wrapped_dek.hex()}
    # Decrypt: unwrap DEK via KMS → decrypt ciphertext with DEK
```

---

## IDENTITY & ACCESS MANAGEMENT

### Privileged Access Management (PAM)

```
Just-In-Time (JIT) access:
  Engineers request elevated access for specific task + timeframe
  Auto-approved for standard ops, human approval for sensitive data access
  Access expires automatically (1-8 hours, not permanent)
  All actions logged with business justification
  Tools: CyberArk, BeyondTrust, HashiCorp Boundary, GCP PAM (preview)

Service-to-service auth:
  GCP: Workload Identity Federation (no service account keys)
  AWS: IAM Roles for Service Accounts (IRSA)
  On-prem: SPIFFE/SPIRE for workload identity
  Never: long-lived service account keys stored in config

MFA Requirements (enforce in code, not just policy):
  Admin access: FIDO2/Passkeys or hardware token (YubiKey) — TOTP not sufficient
  Standard users: TOTP app minimum (Google Authenticator, Authy)
  API access: API keys + IP allowlist + request signing
  Never: SMS-based MFA for high-value accounts (SIM swap vulnerable)
```

### IAM Audit (Run Monthly)

```
Find over-privileged roles:
  GCP: gcloud projects get-iam-policy PROJECT --format=json | analyze
  AWS: IAM Access Analyzer + unused access findings

Check for:
  □ Roles with * on resources (over-broad)
  □ Service accounts with owner/editor (should be specific roles)
  □ IAM access keys older than 90 days
  □ Unused service accounts (no API activity >30 days → delete)
  □ Users with direct permissions (should be via groups/roles)
  □ Cross-account trust relationships (any unexpected?)
```

---

## INCIDENT RESPONSE

### Severity Classification

```
P0 — Critical:   Active breach, data exfil in progress, ransomware, service down
                 Response: 5min. War room immediately. CEO + Legal notified.

P1 — High:       Suspected breach, critical vuln exploited, auth system compromised
                 Response: 15min. Security lead + engineering lead.

P2 — Medium:     Anomalous behavior, failed exploitation attempt, compliance gap found
                 Response: 1 hour. Security team + affected service owner.

P3 — Low:        Policy violation, low-severity CVE, config drift
                 Response: Next business day. Assigned owner.
```

### NIST Incident Response Framework

```
1. PREPARE:
   □ IR plan documented + tested quarterly
   □ Contact list: security team, legal, PR, executives, regulators
   □ Forensic tools pre-installed (not scrambling to install during incident)
   □ Evidence preservation procedures known to all engineers
   □ Cyber insurance policy in place

2. IDENTIFY:
   □ What happened? When did it start? (look for earliest indicator)
   □ What systems are affected? (blast radius assessment)
   □ Is it still ongoing? (contain before investigating)
   □ Log preservation: export logs to isolated read-only bucket immediately

3. CONTAIN:
   Short-term: Block attacker (IP ban, revoke credentials, isolate instance)
   Long-term: Patch, fix configuration, rebuild if necessary
   Do NOT shut everything down immediately — preserve evidence first

4. ERADICATE:
   Remove all attacker persistence (backdoors, new user accounts, cron jobs)
   Scan ALL systems — attackers often pivot from initial compromise
   Reset all credentials that may have been exposed
   Rotate all secrets (assume all secrets compromised)

5. RECOVER:
   Restore from clean backups (verify backups are clean — attackers may have been in months)
   Deploy patched/clean systems
   Monitor intensively for 30 days post-recovery
   Gradual return to service — don't rush

6. LESSONS LEARNED:
   Blameless post-mortem within 72 hours
   Root cause analysis (5 Whys)
   Detection gap: why didn't we catch this sooner?
   Prevention: specific fixes with owners and deadlines
   Update runbooks + detection rules
```

### Breach Notification Requirements

```
GDPR:          72 hours to supervisory authority if personal data affected
CCPA:          Reasonable notice to affected California residents
PCI DSS:       Immediate notification to card brands (Visa, Mastercard) + acquiring bank
HIPAA:         60 days to HHS, affected individuals, and media (if >500 in a state)
India PDPB:    72 hours to Data Protection Board (when enacted)
SEC (US):      4 business days for material cybersecurity incidents (Rule 8-K)
RBI (India):   Immediate to RBI CSITE + NPCI for payment system incidents

Prepare breach notification templates in advance. Legal review annually.
```

---

## VULNERABILITY MANAGEMENT

### CVE Tracking & Patch SLAs

```
CVSS Score → Patch Timeline:
  Critical (9.0-10.0): Patch within 24 hours. Emergency change if needed.
  High (7.0-8.9):      Patch within 7 days.
  Medium (4.0-6.9):    Patch within 30 days.
  Low (0.1-3.9):       Patch within 90 days.

CISA KEV overrides: Patch within 2 weeks regardless of CVSS (these are actively exploited).

Automation:
  Renovate Bot:  Auto-PRs for dependency updates (better than Dependabot — more flexible)
  Trivy:         Scan container images in CI, block critical CVEs
  Snyk:          Monitor production containers + code continuously
  Grafeas:       Artifact metadata and attestation (GCP-native)
```

### SBOM (Software Bill of Materials)

```
Generate on every release:
  Node.js:  cyclonedx-node-npm --output-file sbom.json
  Python:   cyclonedx-py -p -e -o sbom.json
  Java:     CycloneDX Maven/Gradle plugin
  Docker:   syft image:tag -o cyclonedx-json=sbom.json

Store in artifact registry alongside each release.
Required by: US Executive Order 14028, EU Cyber Resilience Act, PCI DSS 4.0.
Enables: rapid "do we use Log4j?" type queries during zero-day events.
```

---

## COMPLIANCE FRAMEWORKS

### SOC 2 Type II (Most Important for SaaS)

```
Trust Services Criteria:
  Security:       CC6 — Logical access, CC7 — System operations, CC8 — Change management
  Availability:   Uptime SLAs, disaster recovery, capacity planning
  Confidentiality: Data classification, encryption, access controls
  Processing Integrity: Complete, accurate, timely processing
  Privacy:        GDPR/CCPA alignment, consent management

Controls required (sample):
  □ All access requires MFA
  □ Background checks for all employees with system access
  □ Annual security training for all staff
  □ Penetration test annually
  □ Business continuity plan tested annually
  □ Incident response tested quarterly
  □ Vendor security assessments for critical vendors
  □ Encryption at rest and in transit
  □ Change management process documented
  □ Vulnerability management program with SLAs

Tools:
  Vanta:   Best automated SOC2 prep (<user> already using). ~$15K/yr. Gets to audit-ready fastest.
  Drata:   Vanta competitor, good integrations.
  Secureframe: Strong for early-stage.
  Manual: Feasible but 10x more work.

Timeline: SOC2 Type I in 3 months (controls exist). Type II in 12 months (controls operated for period).
```

### PCI DSS 4.0 (If Handling Card Data)

```
Key requirements for SaaS (Level 4 — <20K transactions):
  □ Never store raw PANs, CVV, or full magnetic stripe
  □ Tokenize: use Stripe.js/Elements — card data never touches your server
  □ WAF protecting all web-facing systems
  □ Vulnerability scanning quarterly (ASV scan)
  □ Penetration test annually
  □ Maintain audit logs 12 months
  □ MFA for all non-consumer access
  □ Encrypt cardholder data in transit (TLS 1.2+)
  □ Self-Assessment Questionnaire (SAQ A or SAQ A-EP for most SaaS)

Best advice: Use Stripe.js + Stripe Elements. Never touch raw card data. Reduces scope to SAQ A.
```

### GDPR / Data Privacy

```
Core requirements:
  □ Lawful basis for processing (consent, contract, legitimate interest, etc.)
  □ Data subject rights: access, rectification, erasure ("right to be forgotten"), portability
  □ Privacy by design: collect minimum data, purpose limitation
  □ Data Processing Agreements (DPAs) with all sub-processors
  □ Records of Processing Activities (ROPA) — document what you process and why
  □ 72-hour breach notification to supervisory authority
  □ DPIA (Data Protection Impact Assessment) for high-risk processing
  □ Cookie consent — real consent, not dark patterns

Technical implementation:
  Data inventory:   Every field of every table — classify: PII / sensitive / public
  Erasure:          User delete → anonymize or delete all PII across all tables + backups
  Portability:      Export user data as machine-readable JSON/CSV on request
  Data residency:   EU personal data must stay in EU (or adequate third country)
  Consent logging:  Timestamp, IP, consent text version for every consent collected
```

---

## FRAUD DETECTION & FINANCIAL CRIME (<project>-Specific)

### Real-Time Fraud Signal Architecture

```
Transaction Event → Feature Extraction → Risk Scoring → Decision → Action
                          ↓                    ↓
                   [Feature Store]      [ML Model + Rules]
                          ↓
              velocity, device, IP, behavior, history

Signal categories:
  Velocity:      transactions per hour/day, amount per period, new payee frequency
  Device:        device fingerprint, new device, rooted/jailbroken, emulator detected
  Location:      IP geolocation, distance from last transaction, impossible travel
  Behavior:      typing speed, session duration, navigation pattern (vs baseline)
  Network:       VPN/proxy/Tor detected, datacenter IP, known fraud IP
  Identity:      name/address/phone mismatch, synthetic identity signals
  Transaction:   unusual amount (vs history), unusual merchant, round amounts, split transactions
```

### Fraud Rule Engine Design

```
Priority execution:
  P0 Hard Block:   Stolen card list, OFAC sanctions match, known fraud device → instant deny
  P1 Hard Block:   Velocity limit exceeded, impossible travel, known fraud IP → instant deny
  P2 Soft Block:   ML score > 0.9 → step-up auth (OTP required)
  P3 Review:       ML score 0.7-0.9 → human review queue
  P4 Monitor:      ML score 0.4-0.7 → flag for pattern analysis
  P5 Allow:        ML score < 0.4 → approve (standard risk)

Rule governance:
  Every rule: owner, creation date, last review date, hit rate, precision/recall
  Rules reviewed monthly — prune low-precision rules, add new patterns
  A/B test rule changes — never deploy blind
  False positive rate target: <0.5% (every false positive = lost revenue + angry customer)
```

### AML (Anti-Money Laundering) Technical Controls

```
Structuring detection:    Transactions just below reporting thresholds (e.g., $9,900)
                          Alert: 3+ transactions in 24h summing to >$10K per user

Layering detection:       Rapid fund movement across multiple accounts
                          Alert: Money in → out to different account within 1 hour

Round-tripping:           Funds leaving and returning to same source
                          Graph analysis: detect cycles in transaction graph

SAR filing:               Automated SAR (Suspicious Activity Report) generation
                          File with FinCEN within 30 days of detection (US requirement)
                          Store SAR data with 5-year retention

KYC integration:          Identity verification at onboarding (Jumio, Onfido, Persona)
                          Enhanced due diligence for high-risk users (PEPs, high-volume)
                          Ongoing monitoring: re-verify on behavior change triggers
```

---

## SECURITY METRICS (MEASURE THESE)

```
Detection:
  MTTD:          Mean Time to Detect — target <1 hour for critical events
  Alert fidelity: True positive rate of security alerts — target >30% (tune to reduce noise)
  Coverage:       % of attack surface with detection rules

Response:
  MTTR:          Mean Time to Respond — target <4 hours for P0/P1
  MTTC:          Mean Time to Contain — stop ongoing attack — target <30 min for P0

Prevention:
  Patch compliance: % of critical CVEs patched within SLA — target 100% for critical
  Vuln backlog:   Open vulnerabilities by severity — track weekly, trending down
  Security debt:  Security findings in code — track like technical debt

Posture:
  Cloud compliance score: CSPM findings — target 0 critical, <10 high
  Pen test findings:      Track findings year-over-year — should decrease
  Security training:      % staff completed annual training — target 100%

Report to leadership: Monthly 1-page security scorecard. Executives must see these numbers.
```
