---
watermark: ORIRO
name: secrets-management
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >









  Secrets and configuration management — environment variables, secret stores, rotation, and security best practices for credentials.


  Sources: Google Search Central, GDPR text, AWS security documentation, Stripe API docs.
---

# Secrets and Configuration Management

## The non-negotiable rules

**Never commit secrets to version control.** Ever.
**Never log secrets.** Logs are often less secured than applications.
**Never put secrets in URLs.** They appear in server logs, browser history, Referer headers.
**Rotate secrets regularly.** Especially after any potential exposure.

### .gitignore baseline

```
.env
.env.local
.env.*.local
*.pem
*.key
service-account.json
*-credentials.json
```

## Environment variables (baseline)

### Local development

```bash
# .env.local (not committed)
DATABASE_URL="postgresql://localhost:5432/myapp_dev"
STRIPE_SECRET_KEY="sk_test_..."  # Always use test keys locally
ANTHROPIC_API_KEY="sk-ant-..."
JWT_SECRET="development-secret-change-in-production"
```

### Production environments

**Platform env vars:** Vercel, Railway, Render, Heroku — set in dashboard. Never exposed in code.
**Validate on startup:**

```ts
// lib/env.ts — fail fast if required secrets missing
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-"),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
// If any required variable missing: throws at startup with clear error
```

## Secret stores (for scale)

### HashiCorp Vault

Open source or cloud. Centralized secret storage with access control, rotation, audit logs.

```bash
# Store secret
vault kv put secret/myapp/prod stripe_key=sk_live_...

# Read secret
vault kv get -field=stripe_key secret/myapp/prod
```

### Cloud provider secret managers

**AWS Secrets Manager:** Native AWS. Auto-rotation. IAM-controlled access.
**GCP Secret Manager:** Native GCP. IAM-controlled. Versioned.
**Azure Key Vault:** Native Azure. Hardware security module option.

```ts
// GCP Secret Manager (example)
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const client = new SecretManagerServiceClient();

async function getSecret(secretName: string): Promise<string> {
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload!.data!.toString();
}
```

## Secret rotation

### Rotation strategy

1. Create new secret value.
2. Update secret store.
3. Redeploy application(s) reading the new value.
4. Verify new value works.
5. Revoke old value.

**For API keys:** Create new key in provider → deploy new key → verify → revoke old.
**For database passwords:** Most cloud databases support rotation without downtime via a rotation Lambda/function.

### When to rotate

- Immediately: Key exposed (committed to git, sent in Slack/email, logged).
- Regularly: Every 90 days for high-value secrets. Some compliance frameworks require this.
- On personnel change: When engineer with access leaves.

## Service accounts and access control

**Principle of least privilege:** Each service gets only the permissions it needs. Nothing more.
**Separate credentials per environment:** Production DB never uses same credentials as development.
**No shared credentials:** Each service has its own API key. If one is compromised, others aren't.
**Audit access:** Log who accessed what secret and when (built into Vault, AWS Secrets Manager, GCP Secret Manager).

Sources: HashiCorp Vault documentation (vaultproject.io — free), AWS Secrets Manager docs (free), GCP Secret Manager docs (free), OWASP Secrets Management Cheat Sheet (free)
