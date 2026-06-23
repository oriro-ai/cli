---
watermark: ORIRO
name: zero-to-live
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Deploy any app to production for $0 using the ORIRO canonical free stack.
  Activate for ANY task involving deployment, hosting, going live, publishing,
  "how do I put this online", "make it accessible", "share the URL", "deploy",
  "host my app", "launch", "publish", or any question about infrastructure,
  cloud platforms, databases, or making something work on the internet.
  Also activate for: Vercel, Supabase, Cloudflare, Resend, Stripe setup,
  domain configuration, SSL, environment variables, or free tier questions.
  This skill contains exact commands — no assumed knowledge required.
  Always use this skill before recommending any paid hosting option.
---

# Skill A — Zero to Live

## Free deployment stack. Exact commands. No assumed knowledge.

**The ORIRO canonical free stack — total cost $0 at launch:**

| Layer                 | Service            | Free tier                    |
| --------------------- | ------------------ | ---------------------------- |
| Frontend / Full-stack | Vercel             | 100GB bandwidth/month        |
| Database + Auth       | Supabase           | 500MB, 50K users             |
| API / Serverless      | Cloudflare Workers | 100K requests/day            |
| Static sites          | Cloudflare Pages   | Unlimited bandwidth          |
| File storage          | Cloudflare R2      | 10GB, 10M reads/month        |
| Email                 | Resend             | 3,000 emails/month           |
| Domain + SSL          | Cloudflare         | Free, automatic              |
| Payments              | Stripe             | Free until first transaction |

---

## STEP 0 — Which platform for which app

```
What are you building?
│
├─ Full-stack web app (Next.js / React + backend)
│   └─ Vercel + Supabase
│
├─ Static site (HTML/CSS only, no server)
│   └─ Cloudflare Pages
│
├─ API only (no frontend)
│   └─ Cloudflare Workers
│
├─ Mobile app (React Native / Expo)
│   └─ Expo EAS (build) + Vercel (API) + Supabase (database)
│
├─ E-commerce
│   └─ Vercel + Supabase + Stripe Checkout
│
└─ Anything with user accounts
    └─ Vercel + Supabase Auth
```

---

## VERCEL — deploy in 3 commands

```bash
# 1. Install CLI
npm install -g vercel

# 2. Deploy (from project root)
vercel

# 3. Deploy to production
vercel --prod
```

**First deploy prompts:**

```
Set up and deploy? → Y
Which scope? → your-username
Link to existing project? → N
Project name? → your-app-name
Directory? → ./ (or apps/web for monorepo)
Override settings? → N
```

Your app is live at: `https://your-app-name.vercel.app`

**Connect GitHub (auto-deploy on every push):**
vercel.com → Import Project → Connect GitHub repo
Every push to main → automatic production deploy (~60 seconds)

**Environment variables:**

```bash
vercel env add SECRET_KEY production
vercel env add SECRET_KEY preview
vercel env pull .env.local        # pull to local
```

Never put secrets in code. Always in Vercel dashboard or CLI.

**Custom domain:**
vercel.com → Project → Settings → Domains → Add domain
For Cloudflare DNS: set CNAME to `cname.vercel-dns.com`, proxy OFF.

**vercel.json (monorepo only):**

```json
{ "rootDirectory": "apps/web" }
```

**Common Vercel errors:**

- `Cannot find module` → run `npm install` locally, commit lock file
- `Function exceeded maximum duration` → move heavy work to background
- `413 Request Entity Too Large` → use direct-to-R2 upload instead
- `Environment variable undefined` → variable set for Dev not Production

---

## SUPABASE — database + auth in 5 minutes

**Setup:**

1. supabase.com → New project → name, password, region
2. Wait ~2 min → Settings → API → copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY` (server only)

```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Client (browser):**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

**Server (API routes / Server Components):**

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookies().getAll(),
        setAll: (c) => c.forEach(({ name, value, options }) => cookies().set(name, value, options)),
      },
    },
  );
}
```

**Create a table (SQL editor in Supabase dashboard):**

```sql
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,      -- store cents, never floats for money
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own products"
  ON products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own products"
  ON products FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Query:**

```typescript
const { data, error } = await supabase
  .from("products")
  .select("*")
  .order("created_at", { ascending: false });
```

**Insert:**

```typescript
const { data, error } = await supabase
  .from("products")
  .insert({ name: "T-Shirt", price: 2999, user_id: user.id })
  .select()
  .single();
```

**Auth — email magic link:**

```typescript
await supabase.auth.signInWithOtp({
  email: "<email>",
  options: { emailRedirectTo: "https://yourapp.com/auth/callback" },
});
```

**Auth callback route:**

```typescript
// app/auth/callback/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) await createClient().auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL("/app", request.url));
}
```

**Get current user (server component):**

```typescript
const {
  data: { user },
} = await createClient().auth.getUser();
if (!user) redirect("/login");
```

**Supabase errors:**

- `relation does not exist` → table not created, check SQL editor
- `violates row-level security` → RLS policy missing for that operation
- `JWT expired` → call `supabase.auth.refreshSession()` or redirect to login
- `unique constraint violation` → duplicate in UNIQUE column, use upsert

---

## CLOUDFLARE WORKERS — serverless API

```bash
npm install -g wrangler
wrangler login
wrangler init my-api
cd my-api
wrangler deploy
```

**Basic worker:**

```typescript
// src/index.ts
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/hello") {
      return Response.json({ message: "Hello from ORIRO" });
    }

    return new Response("Not found", { status: 404 });
  },
};
```

**With CORS (required for browser requests):**

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
return Response.json(data, { headers: corsHeaders });
```

**wrangler.toml:**

```toml
name = "my-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "xxxx"
```

**Secrets:**

```bash
wrangler secret put API_KEY
wrangler secret put DATABASE_URL
```

---

## CLOUDFLARE PAGES — static sites

```bash
# From project folder
wrangler pages deploy ./dist --project-name my-site
```

Or connect GitHub: pages.cloudflare.com → Create project → Connect Git
Build command: `npm run build`
Build output: `dist` or `out` or `.next`

---

## RESEND — transactional email

```bash
npm install resend
```

```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "ORIRO <<email>>",
  to: ["<email>"],
  subject: "Welcome to the platform",
  html: '<p>You are in. <a href="...">Get started →</a></p>',
});
```

**Domain setup:** resend.com → Domains → Add domain → add DNS records in Cloudflare

---

## STRIPE — payments

```bash
npm install stripe @stripe/stripe-js
```

**One-time payment (Stripe Checkout):**

```typescript
// app/api/checkout/route.ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Your Product" },
          unit_amount: 2999, // $29.99 in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://yourapp.com/success",
    cancel_url: "https://yourapp.com/cancel",
  });
  return Response.json({ url: session.url });
}
```

**Webhook (confirm payment on your server):**

```typescript
// app/api/webhook/route.ts
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  if (event.type === "checkout.session.completed") {
    // payment confirmed — fulfill the order
    const session = event.data.object;
    await fulfillOrder(session);
  }
  return Response.json({ received: true });
}
```

**Keys:** stripe.com → Developers → API keys

- `STRIPE_SECRET_KEY` — server only, never expose
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — safe for client

---

## Environment variables — the complete pattern

**.env.local (never commit — add to .gitignore):**

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
RESEND_API_KEY=re_...
```

**.gitignore must include:**

```
.env
.env.local
.env*.local
```

Set the same variables in Vercel dashboard for production.
