---
name: gdpr-basics
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >








  GDPR implementation guide — technical requirements, data mapping, consent management, privacy by design, and compliance for developers.



  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# GDPR Technical Implementation

## Technical requirements for GDPR compliance

### Consent management

```ts
// Store consent records — you must be able to prove consent
interface ConsentRecord {
  userId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  consentVersion: string; // Version of your privacy policy
  purposes: {
    analytics: boolean;
    marketing: boolean;
    functional: boolean; // Usually pre-ticked if truly necessary
  };
}

// Save to DB on consent
await db.consentRecord.create({
  data: {
    userId: session.userId,
    timestamp: new Date(),
    ip: getClientIp(req),
    userAgent: req.headers["user-agent"],
    consentVersion: CURRENT_CONSENT_VERSION,
    purposes: { analytics: true, marketing: false, functional: true },
  },
});
```

### Cookie consent banner requirements

- Must present BEFORE setting non-essential cookies.
- "Accept all" and "Reject all" buttons equally prominent.
- Granular control must be available.
- Pre-selected checkboxes for non-essential cookies = not valid consent.
- Easy to withdraw consent (same ease as giving it).

### Data subject rights implementation

```ts
// Data access request (must respond within 30 days)
async function handleAccessRequest(userId: string) {
  const userData = {
    account: await db.user.findUnique({ where: { id: userId } }),
    posts: await db.post.findMany({ where: { userId } }),
    purchases: await db.order.findMany({ where: { userId } }),
    consentHistory: await db.consentRecord.findMany({ where: { userId } }),
    // Include all personal data you hold
  };
  return userData; // Send to user
}

// Deletion request (right to be forgotten)
async function handleDeletionRequest(userId: string) {
  // 1. Check if any legal obligation to retain (contracts, tax records — 7 years)
  // 2. Anonymize or delete where no legal basis for retention
  await db.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId}@deleted.invalid`,
      name: "Deleted User",
      phone: null,
      deletedAt: new Date(),
    },
  });
  // 3. Request deletion from third-party processors (analytics, email, CRM)
  await analytics.deleteUser(userId);
  await emailService.deleteContact(userId);
}
```

## Data minimization

Only collect what you actually use. Review forms — remove unnecessary fields.

```ts
// BAD: Collect everything
const { name, email, phone, dob, address, employer, salary } = body;

// GOOD: Collect only what you need for this service
const { name, email } = body;
```

## Vendor management (Data Processing Agreements)

Every vendor who processes personal data on your behalf needs a DPA.

- Analytics (Mixpanel, Amplitude, PostHog)
- Email (Mailchimp, SendGrid, Resend)
- Cloud hosting (AWS, GCP, Vercel)
- Support tools (Intercom, Zendesk)
- Error tracking (Sentry)

Most reputable vendors have standard DPAs (often in their terms or a self-serve portal).

## Data breach response procedure

```
Hour 0-1: Identify and contain breach.
Hour 1-4: Assess scope (what data, how many people, risk level).
Hour 4-24: Internal notification chain. Legal counsel. DPO if you have one.
Hour 24-72: Report to supervisory authority IF breach poses risk to individuals.
           (In EU: your lead supervisory authority. UK ICO, CNIL France, BfDI Germany, etc.)
Post-72h: If high risk to individuals: Notify affected individuals "without undue delay."
```

## Practical developer checklist

- [ ] Privacy policy linked from all data collection points
- [ ] Cookie consent before analytics/marketing cookies
- [ ] Consent records stored with timestamp, version, IP
- [ ] Access request process documented and tested
- [ ] Deletion/anonymization process implemented
- [ ] Data retention policy defined and enforced (auto-delete after X months)
- [ ] All vendors have DPAs signed
- [ ] Encryption at rest and in transit
- [ ] Access controls and logging for personal data

Sources: GDPR text (eur-lex.europa.eu — free), ICO guidance (ico.org.uk — free, best plain-language GDPR guides), EDPB guidelines (edpb.europa.eu — free)
