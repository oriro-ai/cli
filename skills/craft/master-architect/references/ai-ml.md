# AI/ML Engineering Reference

## LLM INTEGRATION — DECISION TREE

```
Need to add AI to a product?
  ↓
What's the primary use case?
  ├── Generate text/content        → Direct LLM call (OpenAI/Anthropic/Gemini)
  ├── Answer questions about docs  → RAG pipeline
  ├── Take actions autonomously    → Agent system
  ├── Classify/structure data      → Fine-tuned model or structured output
  ├── Search by meaning            → Vector similarity search
  └── Train on proprietary data    → Fine-tuning or LoRA

Speed vs Cost tradeoff:
  Fastest + expensive:  GPT-4o, Claude Opus, Gemini Ultra
  Balanced:             Claude Sonnet, GPT-4o-mini, Gemini Flash
  Fastest + cheapest:   Claude Haiku, GPT-3.5-turbo, Gemini Flash 8B
  Fully local (no cost): Ollama + Llama3/Mistral (needs GPU)
```

---

## RAG (RETRIEVAL-AUGMENTED GENERATION)

The standard pattern for "AI that knows your data."

### Architecture

```
[Documents] → [Chunker] → [Embedder] → [Vector DB]
                                              ↓
[User Query] → [Embedder] → [Vector Search] → [Top-K Chunks]
                                              ↓
                              [LLM] ← [Prompt + Chunks + Query]
                                ↓
                          [Answer + Citations]
```

### Chunking Strategy (Critical — Most Teams Get This Wrong)

```
Fixed size (bad):     500-token chunks with no semantic awareness
Sentence (better):   Split on sentence boundaries, overlap 1-2 sentences
Semantic (best):     Use embedding similarity to find natural break points
Document-aware:       Respect headers, sections, tables — don't split mid-table

Overlap: Always include 10-20% overlap between chunks to preserve context at boundaries.
Chunk size: 256-512 tokens for factual Q&A, 512-1024 for summarization tasks.
```

### Embedding Models

```
OpenAI text-embedding-3-large:  Best quality (3072 dims), $0.00013/1K tokens
OpenAI text-embedding-3-small:  Good quality (1536 dims), $0.00002/1K tokens — default choice
Cohere embed-english-v3:        Competitive, supports int8 quantization (smaller storage)
sentence-transformers (local):  all-MiniLM-L6-v2 — fast, free, 384 dims — good for prototyping
BGE-M3:                         Best open-source multilingual model
```

### Vector Databases

```
Pinecone:       Managed, easiest ops, good at scale — $70+/mo
Weaviate:       Open source + cloud, GraphQL API, good hybrid search
Qdrant:         Open source, Rust-based (fast), great for self-hosted
pgvector:       PostgreSQL extension — USE THIS FIRST if already on Postgres
Chroma:         Simple, Python-native, great for prototyping
Redis (Vector): If already on Redis, add vector search — no new infra
Milvus:         Enterprise scale, self-hosted, complex ops

Default choice: pgvector (zero new infra if on PostgreSQL)
Scale choice:   Qdrant (self-hosted) or Pinecone (managed)
```

### RAG Quality Improvements

```
Hybrid search:     Combine vector similarity + BM25 keyword search. Almost always better.
Reranking:         Cross-encoder reranker on top-K results (Cohere Rerank, BGE-reranker)
Query expansion:   LLM rewrites query into 3 variants → union of results
HyDE:              Generate hypothetical answer → embed it → use as search vector
Metadata filters:  Always filter by tenant_id, date range, document type before vector search
Self-querying:     LLM extracts metadata filters from natural language query
```

---

## AGENT SYSTEMS

### When to Use Agents

Agents are LLMs that can take actions (tool calls) in a loop until a goal is met. Use when:

- Task requires multiple steps with conditional branching
- System needs to call external APIs, read files, run queries
- Requires human-in-the-loop approval at decision points
- Single LLM call is insufficient to complete the task

### Agent Patterns

```
ReAct (Reason + Act):     LLM reasons → selects tool → observes result → repeats
                          Best for: general-purpose agents, debugging, research

Plan-and-Execute:         Planner LLM creates steps → Executor LLM runs each step
                          Best for: complex multi-step workflows, parallelizable tasks

Reflection:               Agent checks its own output, critiques, revises
                          Best for: code generation, writing, analysis

Multi-Agent:              Specialized agents (Researcher, Coder, Critic, Orchestrator)
                          Best for: complex pipelines, separation of concerns
                          Risk: Harder to debug, latency compounds
```

### Tool Design (Critical)

```python
# Good tool design: atomic, single-responsibility, always returns structured data
def search_transactions(
    user_id: str,
    date_from: str,
    date_to: str,
    amount_min: float | None = None
) -> dict:
    """
    Search transactions for a user within a date range.
    Returns: {"transactions": [...], "total": int, "error": str | None}
    """
    # Always return structured dict, never raw strings
    # Always handle errors — agent needs to know what failed
    # Always validate inputs before external calls
```

### Frameworks

```
LangChain:      Most popular, large ecosystem, can be overengineered — use carefully
LlamaIndex:     Best for RAG and document Q&A pipelines
LangGraph:      Graph-based agent workflows, better for complex state machines
CrewAI:         Multi-agent coordination, role-based agents
Anthropic Claude API: Function calling native — use directly for simpler agents
OpenAI Assistants: Managed threads + tools, good for product integrations
AutoGen:        Microsoft's multi-agent framework — good for code generation agents
```

---

## ML PIPELINES

### Standard ML Pipeline Architecture

```
Data → Ingest → Validate → Feature Engineering → Train → Evaluate → Deploy → Monitor
         ↓           ↓              ↓               ↓         ↓          ↓        ↓
       Airbyte    Great Exp      dbt/Spark        MLflow    MLflow    BentoML  Evidently
       Fivetran   Pandera        Feast (store)    W&B       W&B       Seldon   WhyLabs
```

### MLOps Stack (Production Grade)

```
Experiment tracking:  MLflow (open source) or W&B (better UX, $)
Feature store:        Feast (open source) or Tecton (managed, $$$)
Model registry:       MLflow Model Registry or W&B Artifacts
Model serving:        BentoML (flexible) or Seldon Core (K8s) or Vertex AI
Data validation:      Great Expectations or Pandera
Drift monitoring:     Evidently AI or WhyLabs
Pipeline orchestration: Airflow, Prefect, or Vertex AI Pipelines (if on GCP)
```

### Model Selection Framework

```
Classic ML (tabular data, interpretability needed):
  └── Gradient boosting: XGBoost, LightGBM, CatBoost
      Linear models: scikit-learn (fast, interpretable)

Deep Learning (images, text, complex patterns):
  └── PyTorch (research + production)
      TensorFlow/Keras (GCP integration, Vertex AI)
      JAX (cutting edge, Google research)

LLM-powered (natural language tasks):
  └── Use API (OpenAI, Anthropic, Cohere) — don't train from scratch
      Fine-tune only if: domain-specific, latency-critical, cost-critical at scale
      LoRA/QLoRA for efficient fine-tuning on consumer hardware

Computer Vision:
  └── Pretrained on ImageNet (ResNet, EfficientNet, ViT) → fine-tune
      YOLO family for real-time object detection
      SAM (Segment Anything) for segmentation
```

---

## PROMPT ENGINEERING (Production Quality)

### System Prompt Structure

```
[ROLE + EXPERTISE]
[TASK DEFINITION]
[OUTPUT FORMAT — be explicit]
[CONSTRAINTS — what NOT to do]
[EXAMPLES — 2-3 few-shot examples for complex tasks]
```

### Techniques That Actually Work

```
Chain of Thought (CoT):    "Think step by step" → better reasoning on math/logic
Few-shot:                   2-3 examples in prompt → significant quality boost
XML tags:                   <output>, <reasoning>, <answer> → cleaner parsing
Structured output:          Force JSON via function calling or response_format
Temperature:               0-0.3 for factual/code, 0.7-1.0 for creative
Constrained decoding:      Grammar-based sampling (outlines, guidance) for strict formats
Self-consistency:          Sample N times, majority vote → more reliable answers
```

### Cost Optimization

```
Cache prompts:    Anthropic prompt caching (90% discount on cached tokens)
Batch API:        OpenAI/Anthropic batch endpoints — 50% cheaper, async
Model routing:    Haiku/3.5-mini for simple tasks, Opus/4 for complex
Prompt compression: Remove redundant whitespace, compress examples
Context pruning:  Don't send full conversation history — summarize older turns
```

---

## AI EVALUATION FRAMEWORK

Never ship AI features without evals. This is the new unit testing.

### Eval Types

```
Functional:     Does it do the task? (factual accuracy, task completion rate)
Safety:         Does it avoid harmful outputs? (refusal rate on red-team prompts)
Quality:        How good is it? (human preference, rubric-based scoring)
Regression:     Did the latest change make things worse? (track over time)
Latency:        p50/p95 response time under load
Cost:           Average tokens/request × price/token
```

### Tooling

```
Promptfoo:      Open source eval framework — run evals in CI
RAGAS:          RAG-specific eval (faithfulness, relevance, recall)
LangSmith:      LangChain's eval + tracing platform
Braintrust:     Modern eval platform, good UX
Weights & Biases: Eval + experiment tracking combo
Custom evals:   For domain-specific tasks — always build at least 50 golden examples
```

### Golden Dataset Rule

Before shipping any AI feature: build 50-100 "golden" input/output pairs that represent the expected behavior. Every model or prompt change is tested against this set. If quality drops on >10% of cases, don't ship.

---

## VECTOR SEARCH PATTERNS (pgvector — Production)

```sql
-- Setup (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE documents ADD COLUMN embedding vector(1536);
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Hybrid search (vector + keyword) — almost always better than pure vector
WITH vector_search AS (
  SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
  FROM documents
  WHERE tenant_id = $2  -- ALWAYS filter by tenant first
  ORDER BY embedding <=> $1::vector
  LIMIT 20
),
keyword_search AS (
  SELECT id, content, ts_rank(to_tsvector('english', content), query) AS rank
  FROM documents, to_tsquery('english', $3) query
  WHERE tenant_id = $2 AND to_tsvector('english', content) @@ query
  LIMIT 20
)
SELECT DISTINCT ON (id) id, content,
  COALESCE(v.similarity, 0) * 0.7 + COALESCE(k.rank, 0) * 0.3 AS score
FROM vector_search v
FULL OUTER JOIN keyword_search k USING (id)
ORDER BY id, score DESC
LIMIT 10;
```

---

## AI SECURITY

```
Prompt injection:     Never concatenate user input directly into system prompts
                      Use: separate user_message from system_message at API level

Data leakage:         Validate LLM output doesn't contain other users' data
                      Especially in RAG: filter metadata BEFORE vector search

Model abuse:          Rate limit AI endpoints aggressively (10x stricter than normal)
                      Log all AI requests with user_id for audit trail

Jailbreaks:           Use Anthropic Constitutional AI or OpenAI moderation API
                      Layer your own content classifier for sensitive domains

API key exposure:     AI API keys are high-value targets — rotate monthly
                      Separate keys per environment, never share between tenants
```
