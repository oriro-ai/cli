# Legacy System Analysis & Modernization Reference

## LEGACY RISK SCORING FRAMEWORK

Score each dimension 1–5. Total determines strategy.

| Dimension              | 1 (Low Risk)    | 3 (Medium)       | 5 (Critical)           |
| ---------------------- | --------------- | ---------------- | ---------------------- |
| Codebase Age           | <2 years        | 5-10 years       | >15 years              |
| Test Coverage          | >80%            | 20-50%           | 0%                     |
| Dependency Health      | All current     | Some outdated    | EOL/abandoned          |
| Documentation          | Excellent       | Partial/stale    | None                   |
| Bus Factor             | Full team knows | 2-3 people       | 1 person (or gone)     |
| Runtime Risk           | Containerized   | VM, maintained   | Bare metal, no backups |
| Language Support       | Active LTS      | Maintenance mode | EOL                    |
| Business Logic Clarity | Well documented | Partially known  | Black box              |

**Score 8-14:** Targeted refactor (clean up, update deps, add tests)
**Score 15-22:** Phased modernization (strangler fig, module by module)
**Score 23-30:** Recommend full rewrite (with risk assessment and stakeholder buy-in)
**Score >30:** Emergency — assess business continuity risk immediately

---

## MODERNIZATION PATTERNS

### 1. Strangler Fig (Most Recommended)

Best for: Large, complex legacy systems still in active use.

```
[Legacy System]
      ↑
[Facade / API Gateway]  ← New traffic routed here
      ↓
[New Service]  ← New features built here

Steps:
1. Put proxy/facade in front of legacy system
2. Build new module in modern stack
3. Route ONE feature's traffic to new module
4. Test, validate, monitor
5. Repeat for next feature
6. When all traffic migrated → decommission legacy
```

### 2. Branch by Abstraction

Best for: Internal refactoring without external API changes.

```
1. Create abstraction layer (interface/protocol) over legacy component
2. Create new implementation behind abstraction
3. Add feature flag to switch between old/new
4. Test new implementation under flag
5. Flip flag for 100% → remove old implementation
```

### 3. Database-First Migration

Best for: Data model is the real asset, application is thin.

```
1. Map legacy data model completely (even undocumented fields)
2. Design new data model
3. Build ETL pipeline: legacy DB → new DB (with validation)
4. Run in parallel (dual-write) for 30 days
5. Validate parity
6. Cut over application to new DB
7. Keep ETL running for 30-day rollback window
```

### 4. Big Bang Rewrite

Best for: Risk score ≥ 23 AND team can absorb downtime AND business agrees.

**WARNING:** Big bang rewrites fail 60-70% of the time. Use ONLY when:

- System is truly unmaintainable
- Business can fund 6-18 months of parallel development
- All stakeholders understand the risk

```
Mitigation:
1. Comprehensive test suite on legacy BEFORE rewriting (golden master tests)
2. Feature parity list signed off by business stakeholders
3. Staged rollout with rollback plan at each stage
4. Never discard legacy until new system has 30+ days of production load
```

---

## LANGUAGE-SPECIFIC LEGACY PATTERNS

### COBOL Modernization

```
Approach: Never fully rewrite first pass.

Phase 1 (Month 1-3):
  - Map all COPYBOOKS (shared data structures)
  - Document all CALL trees (entry points and dependencies)
  - Identify all batch jobs, JCL scripts, VSAM files
  - Wrap critical programs in REST API facade (use IBM CICS/MF REST bridge)

Phase 2 (Month 3-9):
  - Extract business rules to documented specs
  - Rebuild rules in modern language (Java/Python)
  - Run COBOL and new system in parallel, compare outputs

Phase 3 (Month 9+):
  - Cut over transaction by transaction
  - VSAM → PostgreSQL data migration
  - Decommission COBOL programs as new code validated

Tools: Micro Focus Enterprise Developer, IBM Rational Developer, OpenCOBOL
```

### PHP Legacy (PHP 5.x / WordPress / Custom CMS)

```
Most common issues:
  - mysql_* functions (deprecated, removed PHP 7) → PDO
  - No namespaces → add PSR-4 autoloading
  - Global state everywhere → dependency injection
  - SQL injection via string concatenation → parameterized queries
  - md5/sha1 passwords → bcrypt/argon2

Modernization path:
  PHP 5 → PHP 7.4 → PHP 8.2 (step by step, run PHPStan at each step)
  Add Composer if missing
  Add PHPUnit tests for each module before refactoring
```

### jQuery / Vanilla JS Legacy (Pre-framework)

```
Issues:
  - Global namespace pollution
  - DOM manipulation spaghetti
  - No module system
  - $.ajax everywhere

Migration path:
  1. Add Vite build tool (zero config bundler)
  2. Convert to ES modules (import/export)
  3. Replace jQuery AJAX with fetch() or axios
  4. Componentize DOM sections into React/Vue (island architecture)
  5. Full framework migration last (not first)
```

### Java EE / Spring Legacy (Pre-Spring Boot)

```
Issues:
  - XML configuration (applicationContext.xml, web.xml)
  - EJBs / JEE container dependencies
  - Java 6/7 idioms (no lambdas, no streams)
  - WAR deployment to Tomcat/JBoss

Migration path:
  1. Upgrade Java version (6→8→11→17→21, each increment)
  2. Convert XML config to @Configuration classes
  3. Replace EJBs with Spring @Service beans
  4. Migrate from Spring MVC → Spring Boot (embedded Tomcat)
  5. Containerize (Dockerfile → Cloud Run / EKS)
```

### Oracle / PL/SQL Legacy → PostgreSQL

```
Key differences to handle:
  - ROWNUM → LIMIT/OFFSET
  - NVL() → COALESCE()
  - DECODE() → CASE WHEN
  - SYSDATE → NOW()
  - Sequences (Oracle) → SERIAL or GENERATED ALWAYS AS IDENTITY (PG)
  - PL/SQL stored procedures → PL/pgSQL or move logic to app layer
  - VARCHAR2 → VARCHAR
  - NUMBER → NUMERIC or INTEGER

Tools: ora2pg (automated conversion, handles most cases)
Always review: triggers, stored procedures, packages (manual conversion required)
```

---

## AUDIT FRAMEWORK FOR INHERITED CODEBASES

When handed an unfamiliar codebase, run this audit in order:

### Hour 1: Orient

```
1. README → understand what it does (if no README, that's a finding)
2. Directory structure → identify architectural pattern
3. package.json / pom.xml / requirements.txt → tech stack + dependency ages
4. Git log → "git log --oneline -50" → last 50 commits, understand activity level
5. "git shortlog -sn" → who wrote this code
```

### Hour 2: Find the Danger Zones

```
Search for:
  - Hardcoded credentials (grep -r "password\|secret\|api_key" --include="*.{js,py,java}")
  - TODO/FIXME comments (often mark known broken areas)
  - Commented-out code blocks (usually hiding complexity)
  - Files last modified >2 years ago that are still in hot path
  - Any file >1000 lines (god classes/functions)
```

### Hour 3: Run It

```
1. Get it running locally
2. Run existing tests (measure coverage)
3. Look for: build warnings, deprecation notices, failing tests ignored with skip
4. Check all environment variables needed — missing .env.example is a finding
```

### Deliverable: Technical Debt Register

```
| Item | Severity | Effort | Risk if Ignored | Owner | Sprint |
|------|----------|--------|-----------------|-------|--------|
| ...  | P0-P3    | S/M/L  | Low/Med/High    | ...   | ...    |
```

---

## DOCUMENTATION RECOVERY

When there's no documentation, create it in this order:

1. **Architecture Decision Records (ADRs):** Document WHY, not just what
2. **Data Dictionary:** Every table, every non-obvious column, what it means in business terms
3. **Runbook:** How to deploy, roll back, restart, debug the top 5 failure modes
4. **API Reference:** OpenAPI spec auto-generated from code (Swagger, FastAPI auto-docs)
5. **Onboarding Guide:** How to get a new developer productive in <1 day
