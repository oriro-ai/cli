# DevOps Reference — Kubernetes, GitOps, Service Mesh, Observability

## KUBERNETES — PRODUCTION FUNDAMENTALS

### Core Object Hierarchy

```
Cluster → Namespace → Pod → Container
              ↓
         Deployment (manages ReplicaSets)
         StatefulSet (ordered pods, persistent storage)
         DaemonSet (one pod per node — logging, monitoring agents)
         Job / CronJob (batch workloads)
              ↓
         Service (stable DNS + load balancing for pods)
         Ingress (HTTP routing into cluster)
         ConfigMap (non-sensitive config)
         Secret (sensitive config — use External Secrets instead)
         PersistentVolumeClaim (storage)
```

### Production Deployment Template

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
  labels:
    app: api-service
    version: "1.2.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0 # Never reduce capacity during update
      maxSurge: 1 # One extra pod during rollout
  template:
    metadata:
      labels:
        app: api-service
    spec:
      serviceAccountName: api-service-sa # Dedicated SA, not default
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      containers:
        - name: api
          image: gcr.io/PROJECT/api:sha-abc123 # Use digest/SHA, not :latest
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials # From External Secrets Operator
                  key: url
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
      topologySpreadConstraints: # Spread pods across nodes/zones
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: api-service
```

### HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70 # Scale up when CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300 # 5 min before scaling down (prevent flapping)
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
```

### Network Policies (Zero Trust within Cluster)

```yaml
# Default deny all — start with nothing open
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {} # Matches all pods
  policyTypes:
    - Ingress
    - Egress
---
# Explicitly allow api-service → database
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-to-db
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api-service
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
```

---

## HELM — PACKAGE MANAGEMENT

### Chart Structure

```
my-service/
├── Chart.yaml          # Name, version, description
├── values.yaml         # Default values (overridden per environment)
├── values-staging.yaml # Staging overrides
├── values-prod.yaml    # Production overrides
└── templates/
    ├── _helpers.tpl    # Template helpers/functions
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── hpa.yaml
    ├── serviceaccount.yaml
    └── externalsecret.yaml
```

### Key Helm Commands

```bash
# Install/upgrade (idempotent — use always)
helm upgrade --install my-service ./charts/my-service \
  --namespace production \
  --values values-prod.yaml \
  --set image.tag=${GIT_SHA} \
  --wait \              # Wait for rollout to complete
  --timeout 5m \
  --atomic             # Rollback automatically on failure

# Rollback if needed
helm rollback my-service 1   # Roll back to previous release

# Diff before deploy (helm-diff plugin)
helm diff upgrade my-service ./charts/my-service \
  --values values-prod.yaml \
  --set image.tag=${GIT_SHA}

# List releases
helm list -n production
helm history my-service -n production
```

---

## GITOPS — DECLARATIVE DEPLOYMENTS

### GitOps Principles

```
1. Git is the single source of truth for all system state
2. Desired state (YAML) lives in Git — never manually apply kubectl
3. Automated agent (ArgoCD/Flux) syncs cluster to Git state continuously
4. Changes go through PRs — review, approve, merge → auto-deploys
5. Drift detection: if cluster diverges from Git → auto-correct or alert
```

### ArgoCD Setup

```yaml
# Application manifest — ArgoCD watches this Git path
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-service
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: main
    path: services/api-service/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true # Delete resources removed from Git
      selfHeal: true # Correct manual changes (drift)
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 5s
        maxDuration: 3m
```

### GitOps Repository Structure

```
k8s-manifests/
├── base/                    # Shared base manifests (Kustomize)
│   ├── deployment.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── staging/
│   │   ├── kustomization.yaml   # Staging-specific patches
│   │   └── patches/
│   └── production/
│       ├── kustomization.yaml
│       └── patches/
├── clusters/
│   ├── staging/             # ArgoCD Application manifests
│   └── production/
└── helm-releases/           # HelmRelease objects (Flux)
```

### Image Update Automation

```yaml
# Flux: auto-update image tag when new image pushed to registry
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: api-service
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: k8s-manifests
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: <email>
        name: Flux
      messageTemplate: "Auto-update api-service to {{.NewValue}}"
    push:
      branch: main
  update:
    path: ./overlays/production
    strategy: Setters # Updates image: field in YAML
```

---

## SERVICE MESH (ISTIO)

### When to Use a Service Mesh

```
Use Istio/Linkerd when you need:
  ✓ Mutual TLS between all services (zero trust network)
  ✓ Advanced traffic management (canary, A/B, circuit breaking)
  ✓ Distributed tracing without code changes
  ✓ Service-level metrics automatically
  ✓ Traffic policies without touching application code

Don't use when:
  ✗ <10 services (overhead not justified)
  ✗ Team unfamiliar with K8s (add complexity on top of complexity)
  ✗ Cloud Run / serverless (mesh is K8s-native)

Lighter alternative: Linkerd (simpler than Istio, less features, much easier ops)
```

### Key Istio Features

```yaml
# Traffic splitting — canary deployment
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: api-service
spec:
  hosts:
    - api-service
  http:
    - route:
        - destination:
            host: api-service
            subset: stable
          weight: 90
        - destination:
            host: api-service
            subset: canary
          weight: 10 # 10% to new version

---
# Circuit breaker
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: api-service
spec:
  host: api-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s # Eject unhealthy pod for 30s
      maxEjectionPercent: 50 # Never eject >50% of pool
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
```

---

## OBSERVABILITY — PRODUCTION STACK

### OpenTelemetry (Standard — Use This)

```typescript
// Single SDK, multiple backends (Jaeger, Tempo, Datadog, Honeycomb)
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

const sdk = new NodeSDK({
  serviceName: "api-service",
  traceExporter: new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 10000,
  }),
  instrumentations: [getNodeAutoInstrumentations()], // Auto-instrument HTTP, DB, etc.
});
sdk.start();

// Manual span for critical operations
const tracer = trace.getTracer("fraud-detection");
async function scoreTransaction(tx: Transaction) {
  const span = tracer.startSpan("fraud.score", {
    attributes: { "transaction.id": tx.id, "transaction.amount": tx.amount },
  });
  try {
    const score = await model.predict(tx);
    span.setAttribute("fraud.score", score);
    span.setStatus({ code: SpanStatusCode.OK });
    return score;
  } catch (err) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw err;
  } finally {
    span.end();
  }
}
```

### Grafana Stack (Open Source — Self-Hosted)

```
Grafana:     Dashboards, alerting, unified UI
Loki:        Log aggregation (like ELK but cheaper, K8s-native)
Tempo:       Distributed tracing (OpenTelemetry backend)
Mimir:       Prometheus-compatible metrics at scale
Pyroscope:   Continuous profiling (find CPU/memory hotspots)

Deploy via: grafana/lgtm Docker Compose for local dev
            kube-prometheus-stack Helm chart for K8s production
            Grafana Cloud (managed) — free tier surprisingly generous
```

### SLO / SLA Definition

```yaml
# SLO: Service Level Objective — internal target
# SLA: Service Level Agreement — contractual commitment to customers
# SLI: Service Level Indicator — the metric you measure

# Error budget = 100% - SLO
# If SLO = 99.9%, error budget = 0.1% = 43.8 min/month
# Spend error budget on risky deploys. Freeze deploys if budget exhausted.

SLOs to define for every service:
  Availability: 99.9% (3 nines) for B2B SaaS — uptime measured by synthetic probes
  Latency: 95% of requests complete in <300ms
  Error rate: <0.1% 5xx responses over rolling 7-day window

Alert on burn rate, not threshold:
  2% error budget burn in 1 hour → page immediately (burning too fast)
  5% budget consumed in 6 hours → warn (on track to exhaust)
  Budget > 50% consumed → release freeze until replenished
```

---

## CI/CD — ADVANCED PATTERNS

### GitHub Actions Production Pipeline

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Semgrep SAST
        uses: semgrep/semgrep-action@v1
        with:
          config: p/owasp-top-ten
      - name: Snyk dependency scan
        uses: snyk/actions/node@master
        with:
          args: --severity-threshold=high
      - name: Container scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: gcr.io/${{ vars.PROJECT_ID }}/api:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: "1"

  test:
    needs: security
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: test }
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run type-check
      - run: npm run test:unit -- --coverage
      - run: npm run test:integration
      - name: Upload coverage
        uses: codecov/codecov-action@v4

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build.outputs.image }}
    steps:
      - uses: actions/checkout@v4
      - name: Build and push
        id: build
        run: |
          IMAGE=gcr.io/${{ vars.PROJECT_ID }}/api:${{ github.sha }}
          docker build -t $IMAGE --target production .
          docker push $IMAGE
          echo "image=$IMAGE" >> $GITHUB_OUTPUT
      - name: Sign image
        run: cosign sign --yes ${{ steps.build.outputs.image }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: |
          helm upgrade --install api ./charts/api \
            --set image.tag=${{ github.sha }} \
            --values values-staging.yaml \
            --wait --atomic

  smoke-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - run: k6 run --env BASE_URL=${{ vars.STAGING_URL }} smoke-test.js

  deploy-production:
    needs: smoke-test
    runs-on: ubuntu-latest
    environment: production # Requires manual approval
    steps:
      - run: |
          helm upgrade --install api ./charts/api \
            --set image.tag=${{ github.sha }} \
            --values values-prod.yaml \
            --wait --atomic
      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text":"✅ Deployed api:${{ github.sha }} to production"}'
```
