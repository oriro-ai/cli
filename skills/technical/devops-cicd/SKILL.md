---
watermark: ORIRO
name: devops-cicd
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  DevOps and CI/CD — pipelines, automated testing, deployment, containerization, infrastructure as code, and DevOps practices.




  Sources: Technical documentation, public guidelines, industry best practices.
---

# DevOps and CI/CD

## CI/CD fundamentals

**Continuous Integration (CI):** Developers merge code frequently. Automated tests run on every merge. Catch bugs early when cheap to fix.
**Continuous Delivery (CD):** Every passing build is deployable. Release is a business decision, not a technical one.
**Continuous Deployment:** Every passing build is automatically deployed to production. No human gate.

## GitHub Actions (most common)

```yaml
# .github/workflows/ci.yml
name: CI
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci

      - run: npm run type-check

      - run: npm test

      - name: Build
        run: npm run build
```

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [test] # Only deploy if tests pass
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Docker

### Dockerfile best practices

```dockerfile
# Multi-stage build — smaller production image
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy only what's needed for production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .
USER node  # Never run as root
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**.dockerignore:**

```
node_modules
.git
.env*
*.log
dist
```

### Docker Compose (local development)

```yaml
# docker-compose.yml
version: "3.8"
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
    depends_on: [db, redis]
    volumes:
      - .:/app # Live reload in development
      - /app/node_modules

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes: [postgres_data:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine

volumes:
  postgres_data:
```

## Infrastructure as Code

### Terraform basics

```hcl
# main.tf
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "assets" {
  bucket = "my-app-assets-${var.environment}"

  tags = {
    Environment = var.environment
    Project     = "my-app"
  }
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.assets.bucket}"
  }
  enabled = true
  # ... more config
}
```

## Observability

**Logs:** Structured JSON logs. Include request ID for tracing across services. Centralized to CloudWatch, Datadog, or similar.
**Metrics:** Application metrics (request rate, error rate, latency). Infrastructure metrics (CPU, memory, disk). Business metrics (signups, revenue).
**Traces:** Distributed tracing (OpenTelemetry → Jaeger, Datadog, Honeycomb). Essential for microservices.
**Alerts:** P99 latency > threshold, error rate > X%, down monitoring. Page on-call when production broken.

Sources: GitHub Actions documentation (docs.github.com/actions — free), Docker documentation (docs.docker.com — free), Terraform documentation (developer.hashicorp.com/terraform — free)
