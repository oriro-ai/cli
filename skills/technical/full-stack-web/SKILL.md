---
watermark: ORIRO
name: full-stack-web
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Full-stack web development — frontend, backend, databases, APIs, deployment,
  and the modern web stack. Activate for questions about building web applications,
  choosing technologies, React, Next.js, Node.js, databases, or any full-stack
  development question. Sources: MDN Web Docs, React docs, Vercel documentation.
---

# Full-Stack Web Development

## The modern stack (2024-2025)

### Frontend

**React:** Dominant UI library. Component-based. Virtual DOM. Hooks (useState, useEffect, useContext, useMemo, useCallback, useRef).
**Next.js:** React meta-framework. Server-side rendering, static generation, app router (v13+), API routes, Image optimization, file-based routing.
**TypeScript:** JavaScript with static types. Catches errors at compile time. Industry standard for all serious projects.
**Tailwind CSS:** Utility-first CSS. Rapid UI development. No naming classes. Works perfectly with component libraries.
**Shadcn/ui:** High-quality accessible components built on Radix UI and Tailwind. Copy-paste into your project.

### Backend

**Node.js + Express:** Most common combination. JavaScript on server. Huge ecosystem.
**Next.js API routes / Route Handlers:** Full-stack in one framework. Serverless-ready.
**tRPC:** End-to-end typesafe APIs. No code generation. Uses TypeScript inference across client/server.
**Python + FastAPI:** Excellent for data-heavy applications, ML pipelines.

### Database

**PostgreSQL:** Best relational database. JSON support. Full text search. Extensible. Use for most applications.
**Prisma:** TypeScript ORM for PostgreSQL/MySQL/SQLite. Type-safe queries. Migration system.
**Drizzle:** Lighter ORM alternative. Closer to SQL. Better performance for simple queries.
**Redis:** Caching, sessions, rate limiting, real-time pub/sub.
**SQLite:** Zero-setup. Perfect for development and lightweight apps. Turso for edge deployment.

### Infrastructure

**Vercel:** Best for Next.js. Serverless functions, edge network, preview deployments, analytics.
**Railway/Render:** Full backend deployment with databases. Easier than AWS for most apps.
**AWS/GCP/Azure:** For scale, compliance requirements, or complex architectures.
**Cloudflare:** Edge computing (Workers), DNS, CDN, DDoS protection.

## React patterns

### Component design

```tsx
// Function component with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ label, onClick, variant = "primary", disabled = false }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded ${variant === "primary" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}
    >
      {label}
    </button>
  );
}
```

### State management

**Local state:** useState for component-level state.
**Server state:** TanStack Query (React Query) for fetching, caching, and syncing server data.
**Global client state:** Zustand (lightweight) or Jotai (atomic) or Redux Toolkit (complex apps).
**Form state:** React Hook Form + Zod for validation.

### Data fetching patterns (Next.js App Router)

```tsx
// Server Component — runs on server, no useEffect needed
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return <div>{user?.name}</div>;
}

// Client Component — for interactivity
("use client");
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

## Backend patterns

### REST API design

```
GET    /api/users          → List users
POST   /api/users          → Create user
GET    /api/users/:id      → Get user
PUT    /api/users/:id      → Replace user
PATCH  /api/users/:id      → Update user fields
DELETE /api/users/:id      → Delete user
```

### Database (Prisma example)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### API route (Next.js)

```ts
// app/api/users/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const users = await db.user.findMany({ select: { id: true, name: true, email: true } });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const body = await req.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

## Authentication

**NextAuth.js / Auth.js:** Standard for Next.js authentication. Supports 50+ providers. Session management. JWT or database sessions.
**Clerk:** Managed auth service. Faster to implement. Costs money at scale.
**JWT (JSON Web Tokens):** Stateless authentication. Header.Payload.Signature. Verify with secret or public key.
**Sessions:** Store state server-side. Session ID in cookie. Better for security-sensitive apps.

## Environment and configuration

```bash
# .env.local (never commit to git)
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="random-secret"
NEXTAUTH_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_..."
```

Always: `.env.local` in `.gitignore`. Use environment-specific files. Validate env vars at startup.

## Performance fundamentals

**Core Web Vitals:**
LCP (Largest Contentful Paint): < 2.5s. Optimize: image loading, server response time, critical CSS.
FID/INP (Interaction to Next Paint): < 200ms. Optimize: JavaScript execution, event handlers.
CLS (Cumulative Layout Shift): < 0.1. Optimize: image dimensions, dynamic content insertion.

**Caching strategy:**
Static assets: Long cache (1 year) + content hash in filename.
API responses: Stale-while-revalidate for non-critical data.
Database queries: Redis cache for expensive, frequently-accessed queries.

Sources: MDN Web Docs (developer.mozilla.org — free), React docs (react.dev — free), Next.js docs (nextjs.org/docs — free), Prisma docs (prisma.io/docs — free), TypeScript docs (typescriptlang.org — free)
