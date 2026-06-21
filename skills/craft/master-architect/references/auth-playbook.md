# Auth Playbook

The agent selects auth providers and implementation strategy based on the project type and
current best practice. This file is the authoritative guide.

---

## Provider Selection Logic

### Always evaluate at runtime:

The agent should check what the most current, widely-adopted auth libraries and providers are
at build time. The defaults below are strong starting points but should be updated if a clearly
superior option has emerged.

### Provider selection by app type

| App Type                        | Recommended Providers                    | Reasoning                  |
| ------------------------------- | ---------------------------------------- | -------------------------- |
| Consumer SaaS / public-facing   | Google OAuth + Email/Password            | Widest adoption            |
| Developer tool / technical SaaS | GitHub OAuth + Email/Password            | Devs prefer GitHub login   |
| E-commerce                      | Google OAuth + Email/Password            | Familiar to shoppers       |
| Enterprise / B2B SaaS           | Email/Password + SAML/SSO (if requested) | Corporate IT requirements  |
| Social / community app          | Google + GitHub + Facebook/Meta          | Social identity fits       |
| Internal admin tool             | Email/Password only                      | Simpler, controlled access |

**Multi-client / white-label SaaS rule:** When the app will be deployed for multiple end
clients (i.e., client A and client B each get their own login), implement:

- Per-tenant OAuth app credentials (each client registers their own OAuth app)
- OR a shared OAuth app with tenant routing via `state` parameter
- Tenant isolation at the session level (`tenant_id` on every session/token)

---

## Implementation Stack

### Primary recommendation: Auth.js (NextAuth.js v5)

Use for all Next.js projects. It supports all major OAuth providers, credentials (email/password),
JWT and database sessions, and has first-class GCP/Prisma adapters.

```typescript
// auth.ts — example setup
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google,
    GitHub,
    Facebook,
    Credentials({
      async authorize(credentials) {
        // validate email + bcrypt password hash
      },
    }),
  ],
  session: { strategy: "database" }, // use "jwt" for stateless/API
});
```

### For non-Next.js backends: Passport.js (Node) or FastAPI + python-jose (Python)

---

## Required DB Schema (Prisma example)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  passwordHash  String?   // null if OAuth-only user
  tenantId      String?   // for multi-tenant SaaS
  role          Role      @default(USER)
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String  // "google" | "github" | "facebook" | "credentials"
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum Role {
  USER
  ADMIN
  SUPERADMIN
}
```

---

## OAuth App Setup (what credentials to request from user)

### Google OAuth

- Go to: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID (Web application)
- Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`
- Credentials needed: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### GitHub OAuth

- Go to: https://github.com/settings/developers > OAuth Apps > New OAuth App
- Set callback URL: `https://yourdomain.com/api/auth/callback/github`
- Credentials needed: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

### Facebook / Meta

- Go to: https://developers.facebook.com/apps
- Create app > Add Facebook Login product
- Set redirect URI: `https://yourdomain.com/api/auth/callback/facebook`
- Credentials needed: `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`

### Email / Password

- No external credentials needed
- Requires: bcrypt for password hashing, email sending for verification
- Email provider: **Resend** (recommended) or SendGrid
- Credentials needed: `EMAIL_FROM`, `RESEND_API_KEY`

---

## Multi-Tenant Auth (White-label / Client Deployments)

When building a SaaS where each client (tenant) gets their own branded login:

### Option A — Shared OAuth app, tenant routing via subdomain

```
client-a.yourapp.com → tenant_id = "client-a"
client-b.yourapp.com → tenant_id = "client-b"
```

- Single OAuth app
- Middleware reads subdomain, injects `tenant_id` into session
- All data filtered by `tenant_id`

### Option B — Per-tenant OAuth credentials (enterprise)

- Each tenant registers their own OAuth app
- Store per-tenant `client_id` / `client_secret` in DB (encrypted)
- Auth.js `providers` array built dynamically from DB at runtime

### Option C — SAML / SSO (enterprise B2B)

- Use **BoxyHQ SAML** or **WorkOS** as the SAML proxy
- Tenant provides their IdP metadata
- Agent should implement this only if explicitly requested

**Default for new SaaS projects:** Option A (subdomain routing). Mention Options B and C in
the handoff as upgrade paths.

---

## Security Checklist

The agent must verify all of these before deploying:

- [ ] Passwords hashed with bcrypt (cost factor ≥ 12)
- [ ] `.env` in `.gitignore`
- [ ] All secrets in GCP Secret Manager (not hardcoded)
- [ ] CSRF protection enabled (Auth.js handles this)
- [ ] HTTPS enforced (Cloud Run does this)
- [ ] Email verification flow for email/password signups
- [ ] Rate limiting on auth endpoints (use `rate-limiter-flexible` or equivalent)
- [ ] Session expiry configured (default: 30 days, adjust per app sensitivity)
- [ ] OAuth redirect URIs locked to production domain only
