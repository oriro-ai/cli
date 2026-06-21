# Cloud Architecture Reference — All Platforms

## PLATFORM SELECTION GUIDE

| Criteria                    | Choose GCP               | Choose AWS           | Choose Azure        |
| --------------------------- | ------------------------ | -------------------- | ------------------- |
| AI/ML workloads             | ✓ Best (Vertex AI, TPUs) | ✓ Strong (SageMaker) | ✓ Strong (Azure ML) |
| Kubernetes                  | ✓ (GKE — K8s birthplace) | ✓ (EKS)              | ✓ (AKS)             |
| Serverless                  | ✓ Cloud Run              | ✓ Lambda             | ✓ Functions         |
| Enterprise sales            | Neutral                  | ✓ Best ecosystem     | ✓ Microsoft shops   |
| Data/Analytics              | ✓ BigQuery is best       | ✓ Redshift           | ✓ Synapse           |
| Market share                | 3rd                      | 1st                  | 2nd                 |
| Free tier / startup credits | ✓ $300 credit            | ✓ Strong free tier   | ✓ MSDN credits      |

**<user>'s default: GCP** (existing <project> infra, Cloud Run + Cloud SQL + Secret Manager)

---

## GCP — SERVICE REFERENCE

### Compute

```
Cloud Run         → Containerized apps, serverless scaling (default choice)
Cloud Functions   → Event-triggered functions, <9 min runtime
GKE               → Full Kubernetes, large-scale, complex workloads
Compute Engine    → VMs, lift-and-shift, custom OS requirements
App Engine        → PaaS, legacy, avoid for new projects
```

### Database

```
Cloud SQL         → Managed PostgreSQL/MySQL/MSSQL (default)
Cloud Spanner     → Globally distributed, strong consistency, expensive
Firestore         → Document DB, mobile/web SDKs, serverless
Bigtable          → Massive scale time-series, analytics (HBase compatible)
Memorystore       → Managed Redis or Memcached
AlloyDB           → PostgreSQL-compatible, 4x faster, high-scale OLTP
```

### Networking

```
Cloud Load Balancing  → Global HTTP(S) LB with anycast IPs
Cloud Armor           → WAF, DDoS protection, IP allowlisting
VPC                   → Virtual Private Cloud, subnets, firewall rules
Cloud CDN             → Cache static assets at edge
Cloud DNS             → Managed DNS (use Cloudflare for extra features)
Private Service Connect → Private connectivity to managed services
```

### Messaging

```
Pub/Sub           → Managed message queue (default, scales massively)
Cloud Tasks       → Task queue with scheduling and retry logic
Eventarc          → Route events between GCP services
```

### AI/ML

```
Vertex AI         → Managed ML platform, model training + serving
Gemini API        → Google's LLM (via AI Studio or Vertex)
Vision AI         → Image classification, OCR, object detection
Speech-to-Text    → Audio transcription
Natural Language  → Sentiment, entity, syntax analysis
Document AI       → Structured data extraction from PDFs/forms
```

### DevOps

```
Cloud Build       → CI/CD pipelines (yaml-based)
Artifact Registry → Container registry (replace Container Registry)
Cloud Deploy      → Continuous delivery to GKE/Cloud Run
Source Repositories → Private Git hosting (or use GitHub)
```

### GCP Cost Optimization

```
Cloud Run:        → Set min-instances=0 for dev, min=1 for prod (cold start tradeoff)
Cloud SQL:        → Use shared-core for dev ($7/mo), upgrade for prod
Committed Use:    → 1-year commit = 37% discount, 3-year = 55%
Preemptible VMs:  → 80% cheaper, for batch workloads only
BigQuery:         → Partition tables by date, cluster on filter columns, use slots carefully
Budget Alerts:    → Always set at 50/80/100% of expected monthly spend
```

---

## AWS — SERVICE REFERENCE

### Compute

```
Lambda            → Serverless functions (15 min max runtime)
ECS + Fargate     → Containers, serverless (similar to Cloud Run)
EKS               → Managed Kubernetes
EC2               → VMs (full control, more ops burden)
App Runner        → Simplified container deployment (like Cloud Run, simpler)
```

### Database

```
RDS               → Managed PostgreSQL/MySQL/MSSQL/Oracle
Aurora            → MySQL/PostgreSQL compatible, 5x faster than RDS, serverless option
DynamoDB          → NoSQL, key-value/document, serverless, millisecond latency
ElastiCache       → Managed Redis/Memcached
Redshift          → Data warehouse (SQL-based analytics)
DocumentDB        → MongoDB compatible (not actual MongoDB)
Timestream        → Time-series database
```

### Storage

```
S3                → Object storage (industry standard, 99.999999999% durability)
EFS               → Managed NFS for shared file access
EBS               → Block storage for EC2
Glacier           → Archival storage (very cheap, slow retrieval)
```

### Networking

```
ALB               → Application Load Balancer (HTTP/HTTPS, path-based routing)
NLB               → Network Load Balancer (TCP/UDP, ultra-low latency)
API Gateway       → Managed API gateway with auth, throttling, caching
CloudFront        → CDN (190+ edge locations)
Route 53          → DNS + health checking + traffic routing
WAF               → Web Application Firewall
Shield            → DDoS protection
```

### AWS Cost Optimization

```
Reserved Instances:  → 1-year commit = 40% discount
Savings Plans:       → Flexible commit, applies to Lambda + Fargate too
Spot Instances:      → 70-90% cheaper, interruptible (good for batch)
Right-sizing:        → AWS Cost Explorer + Compute Optimizer recommendations
S3 Lifecycle:        → Move old data to Glacier automatically
Trusted Advisor:     → Free cost optimization recommendations
```

---

## AZURE — SERVICE REFERENCE

### Compute

```
Azure Container Apps  → Serverless containers (Kubernetes under the hood)
Azure Functions       → Serverless functions
AKS                   → Managed Kubernetes
App Service           → PaaS for web apps (.NET/Java/Node/Python/PHP)
Azure VMs             → IaaS virtual machines
```

### Database

```
Azure SQL Database    → Managed SQL Server
Azure Cosmos DB       → Multi-model NoSQL (document, graph, key-value, table)
Azure Database for PostgreSQL → Managed PostgreSQL
Azure Cache for Redis → Managed Redis
Azure Synapse         → Analytics + data warehousing
```

### Azure-Specific Strengths

```
Active Directory B2C  → Enterprise identity, SSO, social login (best in class)
Azure DevOps          → CI/CD pipelines, boards, repos (popular in enterprise)
Power BI              → Business intelligence, embedded analytics
Teams integration     → Bot framework, notifications (Microsoft ecosystem lock-in)
Hybrid               → Azure Arc for managing on-premise + cloud together
```

---

## MULTI-CLOUD STRATEGY

### When Multi-Cloud Makes Sense

- Regulatory: Data must stay in specific regions where one provider is absent
- Risk: Avoid vendor lock-in for mission-critical systems
- Best-of-breed: GCP for ML/BigQuery + AWS for market reach

### When Multi-Cloud Is Usually Wrong

- Complexity cost is enormous (2x ops, 2x IAM, 2x networking)
- For a startup: Single cloud, master it deeply, multi-cloud later if needed

### Portability Principles (If Multi-Cloud Is Needed)

```
Containers:     Docker — runs anywhere, abstracts cloud compute
IaC:            Terraform — multi-cloud, one tool
Kubernetes:     Provider-agnostic workloads (via Helm charts)
Object storage: MinIO-compatible API works on GCS/S3/Azure Blob
Databases:      PostgreSQL on any cloud (avoid cloud-specific features if portability needed)
Avoid:          Cloud-proprietary services with no multi-cloud equiv (Spanner, DynamoDB, Cosmos)
```

---

## INFRASTRUCTURE AS CODE

### Terraform (Recommended — Cloud Agnostic)

```hcl
# Standard project structure
infra/
├── main.tf          # Provider config, backend
├── variables.tf     # Input variables
├── outputs.tf       # Output values
├── modules/
│   ├── cloud-run/   # Cloud Run service module
│   ├── cloud-sql/   # Database module
│   └── networking/  # VPC, LB, DNS module
└── environments/
    ├── staging.tfvars
    └── production.tfvars

# Always:
terraform init
terraform plan -var-file=production.tfvars  # review BEFORE apply
terraform apply -var-file=production.tfvars
```

### State Management

```
GCP backend:  gs://your-tf-state-bucket/terraform.tfstate
AWS backend:  s3://your-tf-state-bucket/terraform.tfstate + DynamoDB lock table
Azure:        azurerm backend in Azure Blob Storage

NEVER commit terraform.tfstate to git
ALWAYS enable state locking (prevents concurrent modifications)
ALWAYS enable versioning on state bucket
```

### Alternatives

- **Pulumi:** Terraform with real programming languages (Python/TypeScript/Go) — great for complex logic
- **CDK (AWS):** TypeScript/Python for AWS-specific infra — excellent DX within AWS
- **GCP Deployment Manager:** Native GCP, YAML-based, less powerful than Terraform
- **Ansible:** Configuration management, not ideal for cloud infra (use Terraform instead)

---

## FINOPS — CLOUD COST ENGINEERING

### Cost Visibility (Build This First)

```
Label everything:  Every resource tagged: env, team, service, cost-center
Budget alerts:     50% / 80% / 100% of monthly budget → PagerDuty
Cost dashboards:   GCP Billing → BigQuery export → Looker/Grafana dashboard
Anomaly detection: Enable built-in cost anomaly detection on all platforms
Weekly review:     30-min cost review every Monday — catch spikes early
```

### Top 10 Cloud Cost Killers (and Fixes)

```
1. Idle resources:        → Auto-delete dev environments nightly. Cloud Scheduler + scripts.
2. Over-provisioned VMs:  → Right-size with Cost Explorer (AWS) / Recommender (GCP) weekly
3. Uncompressed storage:  → Enable compression on GCS/S3. Lifecycle rules to Nearline/Glacier.
4. NAT Gateway egress:    → Route internal traffic privately. VPC peering > NAT.
5. Data transfer costs:   → Keep services in same region. Avoid cross-region calls.
6. Unused Load Balancers: → Audit monthly. Delete stale LBs immediately.
7. Log volume:            → Sample debug logs at 10%. Filter noise at source.
8. BigQuery full scans:   → Partition + cluster tables. Use preview, not SELECT *.
9. On-demand pricing:     → Committed Use (GCP) / Reserved Instances (AWS) — 40-55% savings
10. Dev = Prod size:      → Dev: shared-core SQL, min Cloud Run instances. Prod: appropriately sized.
```

### Unit Economics Framework

```
Cost per user:       Total cloud cost ÷ active users → track monthly
Cost per request:    Total cost ÷ total API calls → catch expensive endpoints
Cost per feature:    Tag resources by feature → identify cost centers
Gross margin target: SaaS target ≥ 70% gross margin. Cloud cost > 15% of revenue = problem.

Formula: Gross Margin = (Revenue - COGS) / Revenue
         COGS = cloud + support + hosting + third-party APIs
```

### GCP-Specific Optimizations

```
Cloud Run:
  min-instances: 0 for non-prod, 1 for prod (eliminates cold start)
  cpu-throttling: off if latency-sensitive (saves 50% on cold starts)
  request-timeout: set to actual max, not default 300s
  concurrency: 80-100 for CPU-bound, 1000 for I/O-bound

Cloud SQL:
  Shared-core (db-f1-micro): $7/mo for dev/test
  Enable storage auto-increase, set cap to prevent runaway costs
  Read replicas: only when read load justifies it
  High availability: only for production (2x cost)

BigQuery:
  Flat-rate slots: only when >$2K/mo on on-demand
  Materialized views: cache expensive recurring queries
  BI Engine: reserve slots for Looker/Data Studio (eliminates query costs)
  Data expiration: set table expiration on raw/temporary tables

GCS:
  Standard: hot data (accessed daily)
  Nearline: accessed monthly ($0.01/GB/mo)
  Coldline: accessed quarterly ($0.004/GB/mo)
  Archive: accessed <1/year ($0.0012/GB/mo)
  Autoclass: GCP automatically moves objects between tiers
```
