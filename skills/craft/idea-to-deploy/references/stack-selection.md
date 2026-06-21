# Stack Selection Guide

The agent selects the best stack per project. Use this guide to make that decision.

## Decision Tree

### Step 1 — Identify App Type

| Signal in idea                                             | App Type                |
| ---------------------------------------------------------- | ----------------------- |
| "landing page", "portfolio", "blog", "marketing site"      | Frontend-only           |
| "API", "webhook", "microservice", "data pipeline"          | API/backend-only        |
| "dashboard", "admin panel", "internal tool"                | Full-stack (data-heavy) |
| "SaaS", "subscription", "multi-tenant", "client accounts"  | Full-stack SaaS         |
| "shop", "store", "product catalog", "checkout", "payments" | E-commerce full-stack   |
| "mobile app backend", "React Native", "Flutter"            | API-only backend        |

### Step 2 — Pick Frontend

| Situation                              | Choice                               | Reason                              |
| -------------------------------------- | ------------------------------------ | ----------------------------------- |
| SaaS / complex UI / real-time features | **Next.js** (React)                  | SSR, routing, API routes, ecosystem |
| Simple marketing / static site         | **Astro** or **plain HTML+Tailwind** | Speed, no JS overhead               |
| Admin dashboard                        | **Next.js** + shadcn/ui              | Component library fits perfectly    |
| E-commerce                             | **Next.js**                          | SEO via SSR, Stripe integration     |
| High interactivity / single-page app   | **React (Vite)**                     | Faster dev server, simpler setup    |

### Step 3 — Pick Backend

| Situation                         | Choice                                          | Reason                             |
| --------------------------------- | ----------------------------------------------- | ---------------------------------- |
| JavaScript/TypeScript frontend    | **Node.js + Express** or **Next.js API routes** | Unified language                   |
| ML features, data processing      | **Python + FastAPI**                            | Ecosystem fit                      |
| High-throughput API               | **Go + Gin**                                    | Performance                        |
| Rapid prototype / CRUD heavy      | **Node.js + Fastify**                           | Fast to write                      |
| Full Next.js app (simple backend) | **Next.js API routes**                          | No separate backend service needed |

### Step 4 — Pick Database

| Situation                      | Choice                     | Reason                    |
| ------------------------------ | -------------------------- | ------------------------- |
| Relational data, transactions  | **PostgreSQL** (Cloud SQL) | Gold standard, GCP native |
| Document data, flexible schema | **Firestore**              | GCP native, serverless    |
| Caching / sessions             | **Redis** (Memorystore)    | Speed                     |
| Simple key-value               | **Firestore**              | Serverless, no management |
| Analytics / time-series        | **BigQuery**               | GCP native, powerful      |

Default to **PostgreSQL on Cloud SQL** unless the data is clearly document-oriented.

### Step 5 — Pick ORM / Query Layer

| Backend              | ORM                                     |
| -------------------- | --------------------------------------- |
| Node.js / TypeScript | **Prisma** (preferred) or Drizzle       |
| Python               | **SQLAlchemy** + Alembic for migrations |
| Go                   | **sqlc** or GORM                        |

---

## E-commerce Specifics

Always include:

- **Stripe** for payments (Stripe Checkout or Elements)
- Product catalog, cart, orders data model
- Webhook handler for Stripe events (`payment_intent.succeeded`, etc.)
- Admin dashboard for order management

Do NOT build a custom payment processor. Always use Stripe.

---

## SaaS Specifics

Always include:

- Multi-tenancy: each client (tenant) has isolated data (row-level via `tenant_id` FK)
- Subscription billing via **Stripe Billing** (plans, usage, invoices)
- Tenant onboarding flow (invite by email or self-serve signup)
- Admin superuser panel separate from tenant-facing UI
- API key management if the SaaS exposes an API to tenants

---

## Monorepo Structure (default)

```
/
├── frontend/          # UI project
├── backend/           # API / server
├── shared/            # Shared types, utilities (TypeScript projects)
├── infra/             # Deployment scripts / Terraform
├── docker-compose.yml # Local dev
├── .env.example       # All env vars, values blank
└── README.md
```

Use **Turborepo** for JavaScript monorepos. Use a simple Makefile for Python/mixed monorepos.

---

## Current Best-Practice Defaults (update periodically)

| Layer     | Current best choice                     | Notes                                              |
| --------- | --------------------------------------- | -------------------------------------------------- |
| Frontend  | Next.js 14+ (App Router)                | Use Server Components where possible               |
| Styling   | Tailwind CSS + shadcn/ui                | Fastest to build polished UI                       |
| Backend   | Node.js + Fastify or Next.js API routes | TypeScript throughout                              |
| ORM       | Prisma                                  | Best DX, great GCP/PostgreSQL support              |
| Auth      | NextAuth.js v5 (Auth.js)                | See auth-playbook.md                               |
| Payments  | Stripe                                  | Industry standard                                  |
| DB        | PostgreSQL 16 on Cloud SQL              | Reliable, GCP native                               |
| Container | Docker + Cloud Run                      | Serverless, scales to zero                         |
| IaC       | gcloud CLI scripts                      | Simple enough; Terraform for complex multi-service |

The agent should stay current. If a clearly superior technology has emerged since this guide
was written, use it and note the deviation in the blueprint.
