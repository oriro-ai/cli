---
name: technical-writing
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >










  Technical writing — documentation, READMEs, API docs, tutorials, and communicating technical concepts clearly.

  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Technical Writing

## The fundamentals

### Reader first

Who is reading this? Developer integrating your API? Beginner learning a concept? Ops team deploying your app?
Write at the reader's level. Don't explain what a variable is to senior engineers. Do explain your unusual naming conventions.

**Docs debt is real.** Out-of-date docs are often worse than no docs — they mislead readers with confidence.

## README structure (for projects)

````markdown
# Project Name

One sentence: what this is and why it exists.

## Quick start (under 60 seconds to running example)

```bash
npm install my-package
```
````

```ts
import { MyPackage } from "my-package";
const result = MyPackage.doThing({ input: "example" });
console.log(result); // { success: true, output: 'processed' }
```

## Installation (detailed)

## Configuration

## Usage (common use cases with examples)

## API Reference

## Contributing

## License

````

**Rule:** If it takes more than 5 minutes to go from README to working example, the README has failed.

## API documentation (OpenAPI + prose)

### Document the why, not just the what
```markdown
## Authentication

All API requests require a Bearer token in the Authorization header.

**Why:** We use short-lived JWTs (15 min expiry) rather than API keys
to minimize exposure if a token is leaked in logs or network traffic.
Long-lived tokens should use the refresh flow instead of storing the
access token.

### Getting a token
POST /auth/token with your credentials...
````

### Annotate code examples

```ts
// Create a PaymentIntent with automatic_payment_methods enabled.
// This lets Stripe show the optimal payment options for the customer's
// location and saves card for future use if setup_future_usage is set.
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000, // Amount in smallest currency unit (cents for USD)
  currency: "usd",
  automatic_payment_methods: {
    enabled: true, // Required for Stripe's adaptive UI
  },
});

// Return only the client_secret — NEVER return the full paymentIntent object
// as it contains server-side only fields.
return { clientSecret: paymentIntent.client_secret };
```

## Tutorial writing (the Diátaxis framework)

Four types of documentation (different purposes, should not be mixed):
**Tutorials:** Learning-oriented. Step-by-step for beginners. "Build your first app in 15 minutes."
**How-to guides:** Task-oriented. Practical steps for specific goals. "How to set up SSO with Okta."
**Explanations:** Understanding-oriented. Conceptual depth. "How our caching works."
**Reference:** Information-oriented. Complete, accurate, dry. API reference, config options.

Mixing these creates docs that are bad at all of them.

## Writing style for technical docs

**Present tense:** "The function returns" not "The function will return."
**Active voice:** "Call the API" not "The API should be called."
**Imperative mood for instructions:** "Run the command" not "You should run the command."
**Concrete:** Show code. Examples are worth more than explanations.
**Short paragraphs:** Max 3-4 sentences. One idea per paragraph.
**Scannable:** Headers, lists, code blocks. Nobody reads technical docs linearly.

## Changelog writing

```markdown
## [2.1.0] - 2024-03-15

### Added

- Streaming support for long-running operations
- New `timeout` option for all API methods (default: 30s)

### Changed

- BREAKING: `deleteUser()` now requires `confirm: true` parameter to prevent accidents
- `createSession()` now returns a full session object instead of just the token

### Fixed

- Race condition in concurrent webhook processing
- Memory leak when connection pool is exhausted

### Deprecated

- `legacy_auth_endpoint` will be removed in v3.0. Use `/auth/v2` instead.
```

Sources: Google developer documentation style guide (free), Diátaxis framework (diataxis.fr — free), Write the Docs community (writethedocs.org — free), Stripe documentation (excellent example), Tailwind CSS docs (excellent example)
