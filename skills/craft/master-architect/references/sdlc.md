# SDLC & Delivery Reference

## FASTEST PATH FRAMEWORK (Idea → Live)

### Phase 0: Validate Before You Build (1-3 days)

Do NOT skip this. 80% of startup time is wasted on unvalidated assumptions.

```
Validation Checklist:
  □ Can you describe the problem in 1 sentence? (If not, not ready to build)
  □ Have you talked to 5 potential users? (Not friends. Real target users.)
  □ Does a solution already exist? (Look for competitors seriously)
  □ What's the ONE metric that tells you this is working?
  □ What's the smallest thing you can put in front of a user this week?
```

### Phase 1: MVP (Weeks 1-4)

Ruthless scope cutting. The MVP is NOT the beta. It tests ONE hypothesis.

```
Sprint 1 (Days 1-7):   Core data model + API skeleton + auth
Sprint 2 (Days 8-14):  One complete user journey, end-to-end
Sprint 3 (Days 15-21): Error handling, basic logging, deploy to staging
Sprint 4 (Days 22-28): Polish the one journey, load test, ship to first users

MVP Launch Gate:
  ✓ 1 user journey works end-to-end without bugs
  ✓ Auth works and is secure
  ✓ Error tracking running (Sentry)
  ✓ Uptime monitoring on
  ✓ Can support 10x current user count
```

### Phase 2: Product-Market Fit Iteration (Months 2-6)

```
Weekly cycle:
  Monday:   Review metrics + user feedback from prior week
  Tuesday:  Prioritize top 3 improvements
  Wed-Fri:  Build, test, ship
  Friday:   Deploy + watch error rates

Key signals:
  PMF indicator: 40%+ of users say "very disappointed" if product disappeared
  Retention: Users returning week 3+ without prompting
  NPS: >40 = good, >60 = excellent
```

### Phase 3: Scale (Month 6+)

Only scale what's proven to work. Scale kills products that haven't found PMF.

```
Scaling triggers:
  Performance:    p95 latency >500ms on core endpoints
  Availability:   >2 incidents/month impacting users
  DB:             Query times >100ms regularly, or CPU >70%
  Cost:           Cloud cost >20% of MRR
```

---

## CI/CD PIPELINE STANDARDS

### Minimum Viable Pipeline

```yaml
# Every PR triggers:
1. Lint        (ESLint/Pylint/Spotless) — <30s
2. Type check  (tsc --noEmit / mypy)   — <60s
3. Unit tests  (Jest/pytest/JUnit)     — <3min
4. Build       (docker build)           — <5min

# Main branch merge triggers:
5. Integration tests                   — <10min
6. Security scan (Snyk/Trivy)         — <5min
7. Deploy to staging                   — <3min
8. Smoke tests on staging             — <2min
9. Deploy to production               — <3min (auto or manual gate)
```

### Deployment Strategies

| Strategy       | Zero Downtime | Rollback Speed           | Complexity |
| -------------- | ------------- | ------------------------ | ---------- |
| Recreate       | ❌            | Fast (redeploy old)      | Low        |
| Rolling Update | ✓             | Medium                   | Medium     |
| Blue/Green     | ✓             | Instant (switch traffic) | Medium     |
| Canary         | ✓             | Fast (reduce canary %)   | High       |

**Default:** Rolling update (Cloud Run handles this automatically).
**For risky releases:** Blue/Green with traffic splitting.

### Rollback Protocol

```
P0 Incident → Rollback decision within 5 minutes
  Option 1: Cloud Run: gcloud run services update-traffic --to-revisions=PREV=100
  Option 2: Feature flag: flip kill switch
  Option 3: DB rollback: only if schema change, requires pre-planned migration

Rollback success criteria:
  Error rate back to baseline within 10 minutes
  No data loss
  Post-mortem scheduled within 24 hours
```

---

## TESTING STRATEGY

### Test Pyramid (Enforce This)

```
         /\
        /E2E\        10% — Playwright/Cypress — Critical paths only
       /------\
      / Integ  \     20% — API tests, DB tests, service boundaries
     /----------\
    /   Unit     \   70% — Jest/pytest/JUnit — All business logic
   /--------------\
```

### Unit Testing Principles

- Test behavior, not implementation
- One assertion per test (ideally)
- Use descriptive names: `should_return_404_when_user_not_found`
- Mock external dependencies (HTTP, DB, time, random)
- Run in <1 second each

### Integration Testing Principles

- Use real database (Testcontainers spins up Docker PostgreSQL)
- Test actual SQL queries
- Test API contracts (request/response shapes)
- Test auth middleware
- Run in <10 seconds each

### E2E Testing Principles

- Only the 5-10 most critical user journeys
- Run against staging environment
- Must pass before production deploy
- Acceptable to be slow (<5 minutes total)
- Tools: Playwright (recommended), Cypress (solid alternative)

### Security Testing

```
Before every release:
  npm audit / pip audit / mvn dependency-check    → dependency CVEs
  Snyk or Trivy container scan                    → image vulnerabilities
  OWASP ZAP or Burp Suite (quarterly)             → DAST scan
  Secrets scan (Gitleaks or TruffleHog)           → no secrets in code
```

---

## ENVIRONMENT MANAGEMENT

### Standard Environments

```
Local Dev   → Developer machine, docker-compose for dependencies
Staging     → Production mirror, 10% of prod resources, shared by team
Production  → Real users, full resources, no test data
```

### Configuration Management

```
NEVER:  Hardcode any config or secret
NEVER:  Different code branches per environment

ALWAYS: 12-factor app approach (all config via environment variables)
ALWAYS: Secret Manager / Vault for secrets (not .env files in repos)
ALWAYS: Separate databases per environment
ALWAYS: Feature flags for environment-specific behavior (not if/else on ENV var)
```

### Database Migration Safety Rules

```
Safe migrations (run with zero downtime):
  ✓ Add new column (nullable or with DEFAULT)
  ✓ Add new table
  ✓ Add new index (CONCURRENTLY in PostgreSQL)
  ✓ Add new foreign key (NOT VALID first, then VALIDATE CONSTRAINT separately)

Dangerous migrations (require maintenance window or multi-step):
  ✗ Drop column → Add NOT EXISTS check, deprecate first, remove after 2 deploys
  ✗ Rename column → Add new column, dual-write, migrate, remove old
  ✗ Change column type → New column strategy, never ALTER COLUMN on live data
  ✗ Add NOT NULL to existing column → Add with DEFAULT first, backfill, then NOT NULL
```

---

## PERFORMANCE ENGINEERING

### Performance Budget (Set Before Build)

```
Core Web Vitals (frontend):
  LCP (Largest Contentful Paint): <2.5s
  FID (First Input Delay): <100ms
  CLS (Cumulative Layout Shift): <0.1
  TTFB (Time to First Byte): <800ms

API Performance:
  p50 latency: <100ms
  p95 latency: <300ms
  p99 latency: <1000ms
  Error rate: <0.1%
```

### Common Performance Fixes (Prioritized)

```
1. Database: Missing indexes (check EXPLAIN ANALYZE, fix N+1 queries)
2. Caching: Add Redis for repeated expensive queries
3. CDN: Static assets behind Cloudflare (images, JS, CSS)
4. Connection pooling: PgBouncer or built-in pool (never >100 DB connections)
5. Async: Move slow operations to background jobs
6. Pagination: Never return unbounded lists
7. Compression: Gzip/Brotli on all API responses
8. Image optimization: WebP, lazy loading, responsive sizes
```

### Load Testing Protocol

```
Before every major launch:
  Tool: k6 (recommended), Locust (Python), Gatling (JVM)

  Smoke test:  5 users × 1 min → baseline passes
  Load test:   Expected peak users × 5 min → p95 <300ms, error rate <0.1%
  Stress test: 2× expected peak × 10 min → find breaking point
  Soak test:   Normal load × 1 hour → detect memory leaks
```

---

## INCIDENT RESPONSE

### Severity Levels

```
P0: Total outage, all users affected → Respond in 5 min, resolve in 60 min
P1: Major feature broken, >50% users affected → 15 min / 4 hours
P2: Feature degraded, <50% users affected → 1 hour / 24 hours
P3: Minor issue, workaround exists → Next sprint
```

### Incident Response Process

```
1. DETECT:    Monitoring alert fires (or user reports)
2. TRIAGE:    Reproduce → Confirm scope → Set severity
3. MITIGATE:  Rollback or quick fix to stop the bleeding
4. RESOLVE:   Proper fix deployed and validated
5. LEARN:     Blameless post-mortem within 24 hours

Post-mortem template:
  What happened (timeline)
  Impact (users affected, duration, revenue lost)
  Root cause
  Contributing factors
  What we did to resolve
  What we're doing to prevent recurrence (with owners + dates)
```

---

## TRUNK-BASED DEVELOPMENT

The fastest, cleanest delivery model for high-performing teams.

```
Rules:
  1. Everyone commits to main (trunk) at least once per day
  2. Branches last ≤2 days — long-lived branches = integration debt
  3. All code behind feature flags — deploy without releasing
  4. Every commit must pass CI before merge — no exceptions
  5. Fix the build in <10 minutes or revert — never leave red CI

Benefits vs GitFlow:
  - Eliminates merge conflicts from long-lived feature branches
  - Forces smaller, safer commits
  - Continuous integration is actually continuous
  - Faster feedback loops

Feature flag workflow:
  1. Add flag: const isEnabled = await flags.get('new-fraud-model', { userId })
  2. Commit code behind flag (flag off = old behavior)
  3. Deploy (no impact on users)
  4. Enable flag for 1% of traffic → watch metrics
  5. Ramp to 10% → 50% → 100%
  6. Remove flag after full rollout
```

---

## CHAOS ENGINEERING

Deliberately inject failures to validate resilience. Run quarterly minimum.

```
Game Day Process:
  1. Define steady state: error rate <0.1%, p95 <300ms, no data loss
  2. Hypothesize: "If database replica fails, app degrades gracefully"
  3. Inject: Kill replica, slow a dependency, exhaust connection pool
  4. Observe: Does system behave as hypothesized?
  5. Improve: Fix gaps, update runbooks
  6. Document: Add test to regression suite

Common failure injections:
  Network:    latency +200ms, packet loss 5%, DNS failure
  Compute:    Kill 50% of pods, CPU spike to 100%, memory leak
  Database:   Read replica failure, connection pool exhaustion, slow queries
  Dependency: Third-party API timeout (Stripe, Twilio, Resend)
  Data:       Corrupt cache, stale data served

Tools:
  Chaos Monkey (Netflix, AWS)
  LitmusChaos (Kubernetes-native, open source)
  Gremlin (managed, easiest)
  Manual (Cloud Run: reduce instances to 0, inject via code)
```

---

## DEVELOPER EXPERIENCE (DX) STANDARDS

Fast DX = faster shipping = competitive advantage.

```
Local setup:       New dev productive in <30 minutes. Measure it. Fix it if longer.
Hot reload:        <1s code change → browser update for frontend
Test speed:        Unit test suite <60 seconds. Integration <5 minutes.
CI feedback:       PR status check result in <10 minutes
Staging deploys:   <5 minutes from merge to staging
One-command start: docker compose up → everything running
Consistent env:    devcontainer.json or Nix flake — eliminate "works on my machine"
Commit hooks:      pre-commit: lint + format + type check (but fast — <10s)
```
