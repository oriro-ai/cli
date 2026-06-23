---
watermark: ORIRO
name: app-builder-guide
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Complete guide for building apps — written for people with no technical
  background who want to achieve technical goals using ORIRO.
  Activate for ANY request that starts with an idea, a business goal, or
  "I want to build X". Also activate for: "I want to sell online",
  "I need a website", "I want an app", "build me a tool", "I have an idea",
  "how do I make", "I want to start a business", "can you build me",
  "make me a platform", or any description of something the user wants to
  exist that does not yet exist. Always start with Chapter 1 for users
  who have not described their app clearly. Use this skill alongside
  zero-to-live (Skill A) for deployment guidance.
---

# Skill B — App Builder Guide

## From idea to live app. Written for humans, not engineers.

You do not need to know how to code.
You need to know what you want.
ORIRO handles everything else.

---

## Chapter 1 — Describing what you want to build

The most important step happens before any code is written.

**The three questions that unlock everything:**

1. Who uses your app? (You? Your customers? Your team?)
2. What do they do with it? (Buy things? Book appointments? Learn something?)
3. What happens when they do that? (They get a confirmation? You get notified?)

**The three-sentence brief:**
Before asking ORIRO to build anything, write three sentences:

- "My app is for [who]."
- "It lets them [do what]."
- "It solves [what problem] / makes money by [how]."

**Example (bad):** "Build me an app."

**Example (good):**
"My app is for personal trainers.
It lets their clients book and pay for sessions online.
It makes money by keeping 5% of each booking."

That brief is enough. ORIRO builds the complete product from it.

**What ORIRO translates for you:**
When you say this → ORIRO builds this:

| You say                   | ORIRO builds                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| "Book appointments"       | Calendar UI + time slot database + confirmation email + reminders |
| "Sell products"           | Product catalog + cart + Stripe checkout + order management       |
| "Members only content"    | Sign-in page + user accounts + protected pages                    |
| "Accept job applications" | Application form + admin dashboard + email notifications          |
| "Community forum"         | Posts + replies + user profiles + moderation tools                |
| "Track my inventory"      | Item list + quantities + low stock alerts                         |

---

## Chapter 2 — How apps are structured

Every app has three layers. You do not need to understand the code —
you need to understand what each layer does so you can describe what you want.

```
┌─────────────────────────────────────┐
│  FRONTEND — what people see         │
│  Screens, buttons, forms, pages     │
│  Runs in: the user's browser        │
└──────────────────┬──────────────────┘
                   │ sends and receives data
┌──────────────────▼──────────────────┐
│  BACKEND — the logic                │
│  Rules: who can do what             │
│  Calculations, emails, payments     │
│  Runs in: a server (Vercel/CF)      │
└──────────────────┬──────────────────┘
                   │ reads and writes data
┌──────────────────▼──────────────────┐
│  DATABASE — the memory              │
│  All stored information             │
│  Users, products, orders, messages  │
│  Lives in: Supabase (secure, free)  │
└─────────────────────────────────────┘
```

**The ORIRO loop:**
Describe → ORIRO builds all three layers → you see it → describe changes → repeat.
You never touch any of the three layers directly.

---

## Chapter 3 — Your first working page

**Start with one page. One action. One result.**

Tell ORIRO: "Build me a page where [someone] can [do one thing]."

Good first pages:

- "A page where someone can submit their email to join my waitlist."
- "A page that shows my products with prices and a Buy button."
- "A page where I can write a blog post and publish it."
- "A page where users can sign up and log in."

ORIRO builds it, deploys it, gives you a URL.
You click the URL. You see the page. You tell ORIRO what to change.

**What to say when reviewing your page:**

- "The button should be green with rounded corners."
- "Move the logo to the top left."
- "When they submit the form, show a thank you message."
- "Make it look more modern and professional."
- "Add my business name and logo at the top."
- "The font is too small on mobile."

You never need to say anything technical.
Describe what you see and what you want instead.

---

## Chapter 4 — Storing information

Every app that remembers anything needs a database.
Think of it as a very well-organized spreadsheet.

**Tell ORIRO what you need to store:**
"I need to store customer orders. Each order has:
customer name, email, list of items, total price, order date."

ORIRO creates the table automatically.

**Tell ORIRO the rules:**
"Only the customer who placed the order can see their orders."
"Anyone can browse products but only I can add or edit them."
"Admins can see all orders. Customers only see their own."

ORIRO sets up the security rules automatically.
Your data is private, secure, and automatically backed up.

**Tell ORIRO what to do when data changes:**
"When a new order is placed, email me and email the customer."
"When inventory drops below 5, send me a low stock alert."
"When a user signs up, add them to my mailing list."

---

## Chapter 5 — Going live (2 steps)

**Step 1 — GitHub (where your code lives):**
GitHub is like Google Drive for code.
ORIRO pushes your code there automatically.
You do not touch GitHub yourself.

**Step 2 — Vercel (where your app runs):**
Vercel watches GitHub. Every time ORIRO updates code,
Vercel rebuilds and redeploys your app in ~60 seconds.
Your URL stays the same. Changes appear automatically.

**Your app's address after first deploy:**
`https://your-app-name.vercel.app`
Share this link immediately. It is live.

**Your own domain (optional):**
Buy at cloudflare.com/registrar (~$10/year for .com)
Tell ORIRO: "Connect yourdomain.com to my app."
Takes 5 minutes. SSL is automatic and free.

**What "deploy" means:**
When ORIRO says "deploying" — it is sending your updated code
to Vercel which rebuilds and publishes it. Takes 60 seconds.
You do not do anything. ORIRO handles it.

---

## Chapter 6 — Taking payments

Stripe is the standard for online payments.
Accepts credit cards, Apple Pay, Google Pay, bank transfers.
Free to start — 2.9% + 30¢ per successful transaction.

**Three payment types:**

**One-time payment** (selling a product):
"When a customer clicks Buy, charge them $X and give them access."

**Subscription** (monthly/yearly billing):
"Charge customers $X/month. Cancel their access if they stop paying."

**Booking with deposit:**
"Charge 50% upfront when they book. Charge the rest after the appointment."

Tell ORIRO which type you need.
ORIRO integrates Stripe completely — you never write payment code.

**What you need from Stripe:**

1. Create a free account at stripe.com
2. Get your API keys (Settings → API keys)
3. Tell ORIRO your keys

Your money goes directly to your Stripe account.
ORIRO never handles your money.

---

## Chapter 7 — User accounts and sign-in

**Do you need accounts?**
Only if each user needs to see different information.

- Public blog → no accounts needed
- Online store → accounts optional (guest checkout works)
- Booking platform → accounts needed
- Membership site → accounts needed

**What ORIRO provides (all free):**

Sign in with email (magic link — no password):

1. User enters email
2. They get an email with a one-click link
3. They click it → logged in, no password to remember

Sign in with Google (one click)
Sign in with GitHub (for technical users)

**Security ORIRO sets up automatically:**

- Each user's data is separated from everyone else's
- Sessions stay active for 1 week by default
- Password reset is built-in if you use passwords
- Nobody can see another user's data

---

## Chapter 8 — Making it fast and secure

Cloudflare protects your app automatically.
You do not configure anything — ORIRO sets it up.

**What you get for free:**

- Fast loading everywhere in the world (CDN)
- DDoS protection (blocks attacks automatically)
- HTTPS / SSL certificate (required by browsers, automatic)
- Bot protection (stops spam and abuse)
- Basic traffic analytics

**One thing to do:**
If you buy a domain, buy it at cloudflare.com/registrar.
Not GoDaddy. Not Namecheap.
Cloudflare charges at-cost (~$10/year for .com)
and all security features are free.

---

## Chapter 9 — Your app is live. What now.

**Watching how people use it:**
ORIRO adds free analytics that show:

- How many people visit each day
- Which pages they spend time on
- Where they click and where they leave

Tell ORIRO: "Add analytics so I can see how people use my app."

**When something breaks:**
Something will eventually break. This is normal and always fixable.

1. Note exactly what you did and what you saw
2. Tell ORIRO: "Something broke. Here is what happened: [describe]."
3. ORIRO finds and fixes it.

**The fastest way to improve:**
Watch 5 real people use your app without helping them.
Notice every moment of confusion.
Tell ORIRO what to fix after each session.
Three rounds of this and your app will feel professional.

**Free tier capacity:**
The free stack handles thousands of users.
No upgrade needed until you are growing fast.

When you do need more:

- Vercel Pro: $20/month (millions of visitors)
- Supabase Pro: $25/month (8GB database, unlimited users)
  Everything else stays free.

**You own everything:**

- Code: in GitHub under your account
- Data: in Supabase under your account
- Domain: in Cloudflare under your account

If you stop using ORIRO tomorrow, your app still works.
Nothing is locked in. Everything is yours.

---

## Quick reference — how to ask ORIRO for changes

| What you want | What to say                                               |
| ------------- | --------------------------------------------------------- |
| New feature   | "Add [feature]. When [user does X], [Y should happen]."   |
| Design change | "Make [element] look [description]. Example: [URL]."      |
| Fix something | "When I [action], [problem]. It should [correct result]." |
| New page      | "Add a page that shows [content] to [who]."               |
| Email         | "When [event happens], email [person] saying [content]."  |
| Notification  | "When [event], send me a text / notification / alert."    |
| More users    | "Let users invite friends. Give both a reward."           |
| Better search | "Let users search [what] by [how]."                       |

**The golden rule:**
Say what you want to happen, not how to make it happen.

✅ "When a customer places an order, send me a text message."
❌ "Use Twilio to send an SMS via webhook integration."

Describe the outcome. ORIRO decides the implementation.
