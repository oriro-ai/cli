---
watermark: ORIRO
name: auth-security
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Authentication, authorization, and web security — OWASP Top 10, JWT, OAuth,
  password hashing, HTTPS, CORS, CSP, and security best practices. Activate
  for questions about securing a web application, implementing auth, preventing
  attacks, or any security question. Sources: OWASP, NIST, security documentation.
---

# Authentication, Authorization, and Web Security

## OWASP Top 10 (2021) — most critical web risks

### A01 Broken Access Control

Most common vulnerability. Users can access data/functions they shouldn't.
**Prevention:** Deny by default. Check authorization on every request (not just the UI). Never trust client-supplied IDs for ownership.

```ts
// WRONG: Trust client's claimed userId
const data = await db.post.findUnique({ where: { id: req.params.postId } });

// CORRECT: Verify ownership
const data = await db.post.findUnique({
  where: { id: req.params.postId, userId: session.userId },
});
if (!data) return res.status(404).json({ error: "Not found" });
```

### A02 Cryptographic Failures

Sensitive data exposed due to weak/missing encryption.
**Prevention:** HTTPS everywhere. Encrypt sensitive data at rest. Use strong algorithms (AES-256, SHA-256+). Never MD5/SHA-1 for passwords.

### A03 Injection (SQL, Command, LDAP)

Attacker-controlled input executed as commands.
**Prevention:** Parameterized queries always. Never string-concatenate SQL.

```ts
// VULNERABLE:
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`);

// SAFE:
const user = await db.query("SELECT * FROM users WHERE email = $1", [email]);
// Or use ORM (Prisma, Drizzle) which always parameterizes
```

### A07 Identification and Authentication Failures

Weak authentication mechanisms.
**Prevention:** Multi-factor authentication. Secure password requirements. Rate limit login attempts. Secure session management.

## Password security

### Hashing (NEVER store plaintext passwords)

```ts
import bcrypt from "bcryptjs";

// Storing a password
const saltRounds = 12; // Higher = slower = more secure (10-14 typical)
const hash = await bcrypt.hash(password, saltRounds);

// Verifying
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

**Use bcrypt, Argon2, or scrypt.** Never MD5, SHA-1, or SHA-256 for passwords (too fast — easy to brute force).
**Argon2id** is the current best recommendation (winner of Password Hashing Competition).

### Password requirements (NIST SP 800-63B)

Minimum 8 characters. No complexity requirements (they reduce entropy). Block known breached passwords. Allow all Unicode.
Longer passphrases > complex short passwords.

## JWT security

### Common mistakes

```ts
// NEVER: Decode without verification
const payload = JSON.parse(atob(token.split(".")[1])); // NO! Not verified.

// CORRECT: Verify and decode
import jwt from "jsonwebtoken";
const payload = jwt.verify(token, process.env.JWT_SECRET); // Throws on invalid

// NEVER: Store sensitive data in JWT payload (it's base64 encoded, not encrypted)
// JWT payload is visible to anyone — don't put passwords, SSNs, etc.

// ALWAYS: Set reasonable expiry
const token = jwt.sign({ userId }, secret, { expiresIn: "15m" });
```

### Token storage

**Access token:** Memory (React state) or httpOnly cookie. NOT localStorage (XSS vulnerable).
**Refresh token:** httpOnly, Secure, SameSite=Strict cookie only.

## HTTPS and transport security

### TLS/HTTPS

**HSTS (HTTP Strict Transport Security):**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

Forces HTTPS. Prevents downgrade attacks.

**Certificate management:** Use Let's Encrypt (free) or cloud provider certificates. Auto-renew.

## Security headers

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**CSP:** Content Security Policy prevents XSS by controlling which scripts can execute.

## CORS (Cross-Origin Resource Sharing)

Browser security model. APIs must explicitly allow cross-origin requests.

```ts
// Express CORS
import cors from "cors";
app.use(
  cors({
    origin: ["https://myapp.com", "https://www.myapp.com"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  }),
);

// Never: origin: '*' with credentials: true
// Never: origin: '*' for APIs with sensitive data
```

## Authorization patterns

### RBAC (Role-Based Access Control)

Assign users to roles. Roles have permissions.

```ts
const permissions = {
  admin: ["read", "write", "delete", "manage_users"],
  editor: ["read", "write"],
  viewer: ["read"],
};

function can(user: User, action: string): boolean {
  return permissions[user.role]?.includes(action) ?? false;
}
```

### ABAC (Attribute-Based Access Control)

More granular. Decisions based on attributes of user, resource, and environment.

```ts
function canEditPost(user: User, post: Post): boolean {
  return post.authorId === user.id || user.role === "admin";
}
```

## Common attack prevention

### XSS (Cross-Site Scripting)

Never `innerHTML` with user content. Use framework's rendering (React auto-escapes).
Sanitize HTML if you must render it (use DOMPurify).
CSP headers as defense-in-depth.

### CSRF (Cross-Site Request Forgery)

SameSite=Strict or Lax cookies prevent most CSRF.
CSRF tokens for additional protection.

### Rate limiting

```ts
import rateLimit from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: "Too many login attempts" },
});
app.post("/auth/login", loginLimiter, loginHandler);
```

### SQL injection (parameterized queries — see above)

### Dependency security

`npm audit` regularly. Dependabot/Renovate for automated updates. Pin major versions.

Sources: OWASP Top 10 (owasp.org — free), NIST SP 800-63B (free), MDN Web Security (free), Auth0 security blog (free), Have I Been Pwned API (free for breach checking)
