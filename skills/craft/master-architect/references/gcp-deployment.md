# GCP Deployment Playbook

This file covers the full provisioning and deployment sequence on Google Cloud Platform.

---

## GCP Services Used

| Service           | Purpose                                                |
| ----------------- | ------------------------------------------------------ |
| Cloud Run         | Host backend API / Next.js app (serverless containers) |
| Cloud SQL         | Managed PostgreSQL database                            |
| Artifact Registry | Store Docker images                                    |
| Secret Manager    | Store all secrets / env vars                           |
| Firebase Hosting  | Host static frontends (if separate from Next.js)       |
| Cloud Storage     | Static assets, file uploads                            |
| Cloud Build       | CI/CD (optional, recommended for handoff)              |
| Memorystore       | Redis for caching / sessions (if needed)               |
| IAM               | Service accounts and least-privilege roles             |

---

## Prerequisites (verify before provisioning)

```bash
# Check gcloud is installed
gcloud --version

# Check Docker is installed
docker --version

# Authenticate
gcloud auth login
gcloud auth configure-docker [REGION]-docker.pkg.dev
```

If `gcloud` is not installed, print the install link: https://cloud.google.com/sdk/docs/install
and wait for user to confirm installation before continuing.

---

## Phase 6 — Full Provisioning Sequence

### 6.1 — Project Setup

```bash
# Set project
gcloud config set project $GCP_PROJECT_ID
gcloud config set compute/region $GCP_REGION

# Enable all required APIs in one command
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com
```

### 6.2 — Artifact Registry

```bash
gcloud artifacts repositories create $APP_NAME \
  --repository-format=docker \
  --location=$GCP_REGION \
  --description="Docker images for $APP_NAME"
```

### 6.3 — Cloud SQL (PostgreSQL)

```bash
# Create instance (db-f1-micro for dev/small apps, db-g1-small for production)
gcloud sql instances create $APP_NAME-db \
  --database-version=POSTGRES_16 \
  --tier=db-g1-small \
  --region=$GCP_REGION \
  --storage-auto-increase \
  --backup-start-time=02:00

# Create database
gcloud sql databases create $APP_NAME --instance=$APP_NAME-db

# Set root password
gcloud sql users set-password postgres \
  --instance=$APP_NAME-db \
  --password=$DATABASE_PASSWORD
```

Connection string format:

```
postgresql://postgres:$DATABASE_PASSWORD@/$APP_NAME?host=/cloudsql/$GCP_PROJECT_ID:$GCP_REGION:$APP_NAME-db
```

### 6.4 — Secret Manager

Store every secret from `.env`:

```bash
# Example — repeat for each secret
echo -n "$DATABASE_URL" | \
  gcloud secrets create DATABASE_URL --data-file=- --replication-policy=automatic

echo -n "$NEXTAUTH_SECRET" | \
  gcloud secrets create NEXTAUTH_SECRET --data-file=- --replication-policy=automatic

# Add all other secrets similarly
```

### 6.5 — IAM Service Account

```bash
# Create service account
gcloud iam service-accounts create $APP_NAME-sa \
  --display-name="$APP_NAME Service Account"

SA_EMAIL="$APP_NAME-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com"

# Grant roles
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.objectAdmin"
```

---

## Phase 7 — Deployment Sequence

### 7.1 — Build & Push Docker Image

```bash
IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$APP_NAME/backend:latest"

docker build -t $IMAGE ./backend
docker push $IMAGE
```

### 7.2 — Run DB Migrations

```bash
# Via Cloud Run Job (one-time migration runner)
gcloud run jobs create migrate-$APP_NAME \
  --image=$IMAGE \
  --command="npx","prisma","migrate","deploy" \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest" \
  --add-cloudsql-instances=$GCP_PROJECT_ID:$GCP_REGION:$APP_NAME-db \
  --region=$GCP_REGION

gcloud run jobs execute migrate-$APP_NAME --region=$GCP_REGION --wait
```

### 7.3 — Deploy Backend to Cloud Run

```bash
gcloud run deploy $APP_NAME-backend \
  --image=$IMAGE \
  --region=$GCP_REGION \
  --platform=managed \
  --allow-unauthenticated \
  --service-account=$SA_EMAIL \
  --add-cloudsql-instances=$GCP_PROJECT_ID:$GCP_REGION:$APP_NAME-db \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,NEXTAUTH_SECRET=NEXTAUTH_SECRET:latest" \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1
```

### 7.4 — Deploy Frontend

**If Next.js (fullstack on one service):** Same as backend deploy — Next.js handles both.

**If separate static frontend (React/Vite/Astro):**

```bash
# Build
cd frontend && npm run build

# Deploy to Firebase Hosting
npm install -g firebase-tools
firebase login --no-localhost
firebase init hosting  # select existing project
firebase deploy --only hosting
```

Or deploy to Cloud Storage + CDN:

```bash
gsutil mb gs://$APP_NAME-frontend
gsutil web set -m index.html -e 404.html gs://$APP_NAME-frontend
gsutil -m cp -r dist/* gs://$APP_NAME-frontend
gsutil iam ch allUsers:objectViewer gs://$APP_NAME-frontend
```

---

## App-Type Deployment Variants

### Full-stack Next.js (most common)

- Single Docker image, single Cloud Run service
- Next.js handles frontend SSR + API routes
- Connect Cloud SQL via Unix socket

### Separate Frontend + Backend

- Two Cloud Run services (or Firebase Hosting + Cloud Run)
- Set `NEXT_PUBLIC_API_URL` / `VITE_API_URL` to backend Cloud Run URL at build time
- Enable CORS on backend for frontend domain

### API-only backend

- Single Cloud Run service
- No frontend deployment needed
- Document API with auto-generated OpenAPI/Swagger

### E-commerce

- Same as full-stack Next.js
- Add Stripe webhook endpoint: `POST /api/webhooks/stripe`
- Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Secret Manager

---

## Post-Deploy Checklist

- [ ] App loads at Cloud Run URL
- [ ] Auth flows work (login, OAuth callback, logout)
- [ ] DB migrations ran successfully
- [ ] All secrets accessible (no missing env var errors)
- [ ] HTTPS working (automatic on Cloud Run)
- [ ] Health check endpoint responds: `GET /api/health`

---

## Custom Domain (post-handoff step — mention in handoff)

```bash
gcloud beta run domain-mappings create \
  --service=$APP_NAME-backend \
  --domain=yourdomain.com \
  --region=$GCP_REGION
```

Then add the DNS records shown in the output to your domain registrar.

---

## Cost Estimates (for user awareness)

| Service                 | Estimated monthly cost |
| ----------------------- | ---------------------- |
| Cloud Run (low traffic) | $0–5 (scales to zero)  |
| Cloud SQL db-g1-small   | ~$25/month             |
| Artifact Registry       | ~$0.10/GB/month        |
| Secret Manager          | ~$0.06/10k accesses    |
| Firebase Hosting        | Free tier (10GB/month) |

**Total for small app: ~$25–35/month.** Inform user at handoff.
