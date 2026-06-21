---
name: email-marketing
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >


  Email marketing and transactional email — deliverability, templates, automation, list management, and tools.









  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Email Marketing and Transactional Email

## Deliverability foundations

### DNS records (critical)

```
# SPF: Authorize mail servers
TXT @ "v=spf1 include:sendgrid.net include:resend.com -all"

# DKIM: Cryptographic signing
TXT mail._domainkey "v=DKIM1; k=rsa; p=MIGfMA0GCSq..."

# DMARC: Policy for handling failures
TXT _dmarc "v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com"
```

Without SPF, DKIM, and DMARC: Emails land in spam. Gmail and Yahoo now require these.
DMARC `p=reject` is the strictest (and most trustworthy). Start with `p=none` to monitor.

### Sender reputation

Warm up new IP/domain slowly. Start with 100 emails/day, double each week.
Use dedicated domain for marketing (marketing.yourdomain.com) separate from transactional.
Remove bounced and unsubscribed addresses immediately.
Maintain list hygiene: Remove inactive subscribers every 6 months.

## Transactional email (Resend, SendGrid, Postmark)

### Resend implementation

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: "ORIRO <noreply@oriro.ai>",
  to: user.email,
  subject: "Verify your email",
  html: WelcomeEmailTemplate({ name: user.name, verifyUrl }),
  // Plain text fallback
  text: `Welcome ${user.name}! Verify your email: ${verifyUrl}`,
});
```

### React Email (templates)

```tsx
import { Html, Head, Body, Container, Text, Button, Link } from "@react-email/components";

export function WelcomeEmail({ name, verifyUrl }: { name: string; verifyUrl: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "Arial, sans-serif", backgroundColor: "#f9f9f9" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold" }}>Welcome, {name}!</Text>
          <Text>Click below to verify your email address.</Text>
          <Button
            href={verifyUrl}
            style={{
              backgroundColor: "#3b82f6",
              color: "white",
              padding: "12px 24px",
              borderRadius: "6px",
            }}
          >
            Verify Email
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

## Marketing email best practices

### Subject lines

**Opens are 70% decided by subject line.**
Working formulas:

- Question: "Are you making this mistake in your [area]?"
- Curiosity gap: "This one change increased signups by 47%"
- Personalization: "Hey [name], here's your weekly report"
- Urgency (use sparingly): "Last 24 hours: [offer]"
- Plain: "Quick update from [company]" (outperforms "clever" for many audiences)

**A/B test subject lines.** Send to 20% of list, winner gets 80%.

### Email structure

**Mobile first:** 50-60% of email opens are mobile. Single column. Large text (16px+ body). Large CTAs (min 44px tap target).
**One goal:** Each email has one CTA. Don't confuse with multiple asks.
**Above the fold:** Preview text (shows in inbox after subject) should support the subject. First 40 characters matter most.
**Preheader text:** Shows in inbox preview. Often ignored. Use it.

### List management

**Double opt-in:** Confirmation email before adding to list. Lower quantity, higher quality.
**Unsubscribe:** One-click unsubscribe required (CAN-SPAM, GDPR, Google/Yahoo 2024 requirements).
**Segmentation:** Send relevant content to relevant segments. Better open rates + lower unsubscribes.
**Re-engagement:** After 6 months inactivity, send re-engagement campaign. Remove non-openers after another 30 days.

Sources: Resend documentation (resend.com/docs — free), React Email documentation (react.email — free), Litmus email marketing research (free summaries), Really Good Emails (free inspiration)
