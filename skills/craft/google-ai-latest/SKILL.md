---
watermark: ORIRO
name: google-ai-latest
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Google AI 2026 — Gemma 4 family, Gemini 3 family, Vertex/AI Studio pricing
  matrix. Activate for ANY task involving: Gemma 4 (E2B/E4B/26B/31B), Gemini
  3 Pro/Flash/Flash-Lite, Gemini 3.1, model selection for ORIRO.ai agents,
  D1 google_ai_capabilities table updates, on-device AI (Gemini Nano/Chrome),
  Imagen 4, Veo 3.1, embedding models, pricing decisions, free tier limits,
  Vertex AI vs Google AI Studio selection, or any question about which Google
  model to use for what ORIRO.ai task.
  Sources: deepmind.google/models/gemma/gemma-4, ai.google.dev/gemma/docs,
  ai.google.dev/gemini-api/docs/pricing, cloud.google.com Vertex AI pricing.
  Last read: June 15, 2026.
---

# Google AI 2026 — Complete Model & Pricing Reference

**Sources read live June 15, 2026:**

- https://deepmind.google/models/gemma/gemma-4/
- https://cloud.google.com/blog/products/ai-machine-learning/gemma-4-available-on-google-cloud
- https://ai.google.dev/gemma/docs/releases
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro
- https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models
- https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing

---

## 1. GEMMA 4 — The Game-Changer Open Model

**Released:** April 2, 2026 — now **GA on Google Cloud** (Vertex AI Model
Garden fully-managed/serverless, Cloud Run on NVIDIA RTX PRO 6000 Blackwell,
GKE, Cloud TPUs, Sovereign Cloud)
**License:** Apache 2.0 (first time in Gemma line — truly open)
**Architecture:** Dense + Mixture-of-Experts (MoE) variants
**Built from:** Gemini 3 research and technology

### Gemma 4 Model Sizes — Exact Specs

| Model       | Params (total) | Params (active) | Context | Architecture | Best for                                   |
| ----------- | -------------- | --------------- | ------- | ------------ | ------------------------------------------ |
| E2B         | 5.1B           | 2.3B            | 128K    | MoE + PLE    | Phones, IoT, edge                          |
| E4B         | 8.0B           | 4.5B            | 128K    | MoE + PLE    | Laptops, Raspberry Pi                      |
| 12B Unified | 12B            | 12B (dense)     | 256K    | Dense        | Mid GPU; text+audio+image (new Jun 3 2026) |
| 26B A4B     | 25.2B          | 3.8B            | 256K    | MoE          | Consumer GPU (RTX 4090)                    |
| 31B         | 30.7B          | 30.7B (dense)   | 256K    | Dense        | Workstations, H100                         |

**New since launch:** Gemma 4 **12B Unified** (released Jun 3, 2026 — text,
audio, image input, 256K context). Gemma 4 **MTP** (Multi-Token Prediction,
Apr 16) variants exist for E2B/E4B/31B/26B A4B for faster decoding.

**PLE = Per-Layer Embeddings:** Edge models activate far fewer parameters
than total count. The 26B MoE has speed comparable to a 4B model.

### Gemma 4 Capabilities

```
Multimodal (ALL models):
  - Text input → Text output ✅
  - Image input (variable resolution, variable aspect ratio) ✅
  - Video input ✅ (all models)
  - Audio input ✅ (E2B + E4B only natively)

Reasoning: Built-in thinking mode (configurable — can enable/disable)
Context: 128K (edge) / 256K (medium/large)
Languages: 140+ languages
Function calling: Native, built-in — critical for agentic workflows
Coding: AIME 2026 = 89.2%, Codeforces ELO = 2150
MMLU Pro: 85.2% (31B)
Arena AI rank: #3 open model globally (31B), #6 (26B)
```

### Gemma 4 Pricing

```
Open weights = FREE to download and self-host
API hosting:
  Gemma 4 31B (OpenRouter free tier): $0/M tokens ← use this
  Gemma 4 26B (Vertex AI managed): $0.15/M input, $0.60/M output,
    cache hit $0.015/M  ← updated Jun 2026 (was $0.06/$0.30)
  Third-party hosted: $0.15–0.60/M tokens typically

Self-hosting cost:
  26B quantized (RTX 4090): ~$0.001-0.005/M tokens
  31B full bfloat16: needs H100 80GB or equivalent
  26B MoE: 3.8B active → runs fast on consumer GPU

Gemma 4 vs proprietary:
  Claude Sonnet: ~12-25x more expensive per token
  GPT-4o: ~5-10x more expensive per token
  Gemini 3 Flash: direct competitor (same quality tier)
```

### Gemma 4 Architecture Innovations

```
1. Mixture-of-Experts (MoE):
   26B total params, only 3.8B activated per inference
   = 4B model speed at 26B model quality

2. Per-Layer Embeddings (PLE) in edge models:
   Maximize parameter efficiency
   E2B: 5.1B params, behaves like ~2.3B

3. Visual token budget (configurable):
   Token budgets: 70, 140, 280, 560, 1120
   Higher budget = more detail, more compute
   Lower budget = faster inference for simple visual tasks
   Tip: use 280 for most ORIRO.ai tasks, 560 for complex image analysis

4. KV cache sharing with assistants:
   Avoids recomputing context in multi-turn conversations
   Critical for ORIRO.ai agent chains

5. Thinking mode (configurable):
   Can enable step-by-step reasoning or skip for speed
   Enable for complex tasks, disable for Flash-level speed
```

---

## 2. GEMINI 3 FAMILY — Current Production Models

### Gemini 3 Model Matrix (May 2026)

| Model                  | Input Price/1M      | Output Price/1M         | Context | Status                         |
| ---------------------- | ------------------- | ----------------------- | ------- | ------------------------------ |
| Gemini 3.1 Pro         | $2.00 (>200K $4.00) | $12.00 (>200K $18.00)   | 1M      | GA                             |
| Gemini 3.5 Flash       | $1.50               | $9.00                   | 1M      | GA (new in matrix Jun 2026)    |
| Gemini 3.1 Flash-Lite  | $0.25               | $1.50                   | 1M      | GA (repriced from $0.10/$0.40) |
| Gemini 3.1 Flash Image | $0.50               | $3.00 +$60/1M img out   | 1M      | GA                             |
| Gemini 3 Pro Image     | $2.00               | $12.00 +$120/1M img out | 1M      | GA (new)                       |
| Gemini 3 Flash         | $0.50 (audio $1)    | $3.00                   | 1M      | Preview                        |
| Gemini 3.1 Flash       | $0.30               | $2.50                   | 1M      | Superseded by 3.5 Flash        |
| Gemini 2.5 / 2.0 (all) | —                   | —                       | 1M      | Retired (after June 1)         |

**CRITICAL:** Gemini 2.0 Flash, 2.0 Flash-Lite, and 2.5 Flash retired after
June 1, 2026 — migrate any remaining calls to Gemini 3.5 Flash (standard) or
3.1 Flash-Lite (budget). Note 3.5 Flash now costs $1.50/$9.00 — ~5x the old
3.1 Flash; for cost-sensitive high volume, prefer 3.1 Flash-Lite ($0.25/$1.50)
or Gemma 4 26B ($0.15/$0.60).

### Gemini 3.1 Pro — What It Excels At

```
ARC-AGI-2 score: 77.1% (2x its predecessor)
Best for: Complex reasoning, long documents, advanced code generation
Pricing: $2.00/$12.00 per 1M tokens (>200K prompt: $4.00/$18.00)
Context: 1M tokens (industry-leading for proprietary model)
Use in ORIRO.ai: Strategy Builder, complex Campaign Exploder logic
```

### Gemini 3.1 Flash — The Sweet Spot

```
Best price:performance ratio for ORIRO.ai agents
$0.30/$2.50 per 1M tokens (12-25x cheaper than Claude Sonnet)
Speed: Faster than Pro, excellent quality
Use in ORIRO.ai: All Flash Prompts, Brand Voice, Email Campaign
Batch mode: 50% discount → $0.15/$1.25 for async workloads
```

### Gemini 3.1 Flash-Lite — Budget Champion

```
$0.10/$0.40 per 1M tokens — cheapest production-grade model
GA since May 7, 2026
Use in ORIRO.ai: High-volume content generation, embeddings
No OpenAI equivalent at this price point
```

---

## 3. SPECIALIZED MODELS — Image, Video, Audio

### Imagen 4 (Current as of May 2026)

```
Models: imagen-4.0-generate-001, imagen-4.0-ultra-generate-001,
        imagen-4.0-fast-generate-001
Status: Preview (paid tier only)
Pricing:
  512px output: $0.045/image (747 tokens)
  1K output:    $0.067/image (1120 tokens)
  2K output:    $0.101/image (1680 tokens)
  4K output:    $0.151/image (2520 tokens)
Use in ORIRO.ai: Agent avatar generation, campaign image creation
Notable: "significantly better text rendering" vs Imagen 3
```

### Veo 3.1 (Current as of May 2026)

```
Models: veo-3.1-generate-preview, veo-3.1-fast-generate-preview,
        veo-3.1-lite-generate-preview
Status: Preview (paid tier only for API)
Pricing: 10 min of 1080p = ~$240
Use in ORIRO.ai: Phase 4 video pipeline (Veo-powered Flash agents)
D1 table: active model = veo-3.1 (confirmed)
Note: Only charged if video successfully generates
      Audio processing issues can prevent generation (no charge)
```

### Embedding Models

```
text-embedding-005: Current production embedding model
  Use in ORIRO.ai: Agent knowledge base, semantic search
  Free tier: available
  Pricing: low (not published as of May 2026)

multimodal-embedding-001: First multimodal embedding
  Maps text, images, video, audio, PDFs → unified embedding space
  New May 2026 — evaluate for future ORIRO.ai agent memory
```

---

## 4. FREE TIER LIMITS (May 2026 — verified)

**IMPORTANT:** Free tier limits changed significantly in 2026.
Google cut quotas 50-80% in December 2025, more cuts April 1, 2026.

```
Google AI Studio (browser interface): Always free, no limits in UI
API free tier (as of May 2026):
  Flash models: higher RPM/TPM after May 7 2026 GA rollout
  Pro models: 50 requests/day (cut from 100 on April 1)
  All models: full 1M token context window
  Data policy: FREE tier data may be used for model training
               PAID tier: your data is NOT used for training

Rate limit dimensions:
  RPM = Requests Per Minute
  TPM = Tokens Per Minute
  RPD = Requests Per Day
  Note: Check actual limits in AI Studio — numbers change monthly

Free tier strategy for ORIRO.ai:
  Development/testing: Free tier is sufficient
  Production: Enable billing (spend caps prevent surprises)
  Private user data: MUST use paid tier (data not used for training)
```

### Gemma 4 Free Access

```
OpenRouter free tier: Gemma 4 31B = $0/M tokens (rate limited)
Google AI Studio:     Gemma 4 31B + 26B free for development
Third-party hosted:   Replicate, Together AI, etc. — check current rates

Self-hosting:
  E4B: runs on modern laptop, phone, Raspberry Pi
  26B MoE: RTX 4090 or Apple Silicon (24GB+ unified memory)
  31B dense: H100 80GB (not for self-hosting on consumer hardware)
```

---

## 5. VERTEX AI vs GOOGLE AI STUDIO

```
                    Google AI Studio        Vertex AI
Development:        ✅ Instant access        Requires project setup
Pricing:            Free tier + per-token   Per-token, enterprise SLAs
Data privacy:       Free=training data      Private, GDPR compliant
Production:         Small-medium workloads  Enterprise workloads
Rate limits:        Lower (free tier)       Higher (paid)
Non-global endpoints: N/A                  Pricing from July 1, 2026
Use for ORIRO.ai:   MVP + development       Post-scale (phase 5+)

ORIRO.ai decision: Google AI Studio API for now
                   Vertex AI when user data privacy becomes critical
                   or when rate limits become bottleneck
```

---

## 6. ORIRO.ai — SPECIFIC MODEL DECISIONS

### Current D1 google_ai_capabilities Table (Verified May 2026)

```sql
-- Active models in production:
flash_primary:  gemini-2.5-flash    ← UPDATE to gemini-3.1-flash
learn_primary:  gemini-2.5-flash    ← UPDATE to gemini-3.1-flash
video:          veo-3.1             ← CORRECT ✅
image:          gemini-3.1-flash-image  ← CORRECT ✅
embedding:      text-embedding-005  ← CORRECT ✅

-- Deprecated (update before June 1):
gemini-2.0-Flash-Lite    → migrate to gemini-3.1-flash-lite
gemini-2.5-flash         → migrate to gemini-3.1-flash
```

### Flash Prompts 1-8 — Right Model for Each

```
Flash Prompt 1 (Campaign Exploder):   gemini-3.1-flash ← $0.30/M
Flash Prompt 2 (Brand Voice):         gemini-3.1-flash
Flash Prompt 3 (Strategy Builder):    gemini-3.1-pro   ← complex
Flash Prompt 4 (Content Calendar):    gemini-3.1-flash
Flash Prompt 5 (Ad Copy):             gemini-3.1-flash
Flash Prompt 6 (Email Campaign):      gemini-3.1-flash
Flash Prompt 7 (Social Content):      gemini-3.1-flash-lite ← cheapest
Flash Prompt 8 (Flash Dashboard):     gemini-3.1-flash
```

### Tier Model Integration

```
T1 (Free — Chrome Gemini Nano):
  Uses on-device Chrome extension
  Gemma 4 E2B equivalent performance
  ORIRO pays $0 compute ✅
  Limit: text only, no image generation

T2 (Google Pro $0.99/mo):
  Access to gemini-3.1-flash via user's Google API key
  ORIRO pays $0 compute ✅
  User brings their own key
  Enable image generation via Imagen 4

T3 (BYO Any Key $0.99/mo):
  User supplies Gemini/OpenAI/Anthropic key
  ORIRO passes key through — pays $0
  Unlock Veo 3.1 for video agents

ORIRO Cost Model: $0 compute on all tiers ✅ (confirmed correct)
```

### Gemma 4 Opportunity for ORIRO.ai

```
PROBLEM TO SOLVE: T1 users get limited Gemini Nano (Chrome only)
OPPORTUNITY: Gemma 4 E4B runs on ANY device (no Chrome required)

Option A: Offer Gemma 4 local mode for T1 users
  - User downloads E4B (8B params) to their machine
  - ORIRO agents run locally — no API calls, no cost
  - 128K context, multimodal, function calling
  - Privacy: all data stays on device

Option B: Use Gemma 4 26B via OpenRouter free tier
  - Free API access for development/low-volume
  - $0.06/M for production
  - Better than Nano for complex agent tasks

Option C: Fine-tune Gemma 4 E4B on ORIRO agent personas
  - Apache 2.0 = can fine-tune and redistribute
  - One-time cost: $50-500 for LoRA fine-tune
  - Inference cost after: same as base ($0)
  - Create "ORIRO-Agent" specialized model

RECOMMENDATION: Implement Option B for T1 power users
Add Gemma 4 26B as T1 premium option alongside Gemini Nano
```

### Agent Memory Architecture (Gemma 4 Advantage)

```
Current ORIRO: gemini-2.5-flash for learn_primary
Better with Gemma 4 31B reasoning:
  256K context = full campaign history in one prompt
  Native function calling = structured agent tool use
  Thinking mode = step-by-step campaign strategy
  Cost: $0.06/M vs $0.30/M for Flash (5x cheaper for reasoning)

For Knowledge Base agents:
  text-embedding-005 → embed user content
  multimodal-embedding-001 → embed images+text together
  Store in ORIRO's D1 or Cloudflare Vectorize
```

---

## 7. MODEL SELECTION DECISION TREE

```
Is it a REASONING task (strategy, analysis, complex copy)?
  → gemini-3.1-pro ($2.00/M) or Gemma 4 31B ($0.06/M)

Is it a STANDARD agent task (content, email, social)?
  → gemini-3.1-flash ($0.30/M)

Is it HIGH-VOLUME, SIMPLE text generation?
  → gemini-3.1-flash-lite ($0.10/M) or Gemma 4 26B ($0.06/M)

Is it IMAGE GENERATION?
  → imagen-4.0-fast ($0.045/img 512px) for speed
  → imagen-4.0-ultra for quality

Is it VIDEO GENERATION?
  → veo-3.1 (paid tier, ~$240/10min 1080p)

Is it EMBEDDING?
  → text-embedding-005 (text only)
  → multimodal-embedding-001 (text+image+video+audio)

Is it ON-DEVICE (T1 Chrome user)?
  → Gemini Nano (current)
  → Gemma 4 E4B (future — better capability)

Does user have their own API key (T2/T3)?
  → Pass through their key, ORIRO pays $0
```

---

## 8. CRITICAL MIGRATION — DO BEFORE JUNE 1, 2026

```
Deprecated models to replace:
  gemini-2.0-Flash     → gemini-3.1-flash
  gemini-2.0-Flash-Lite → gemini-3.1-flash-lite
  gemini-2.5-flash     → gemini-3.1-flash (already mostly migrated)

Files to update in ORIRO.ai:
  D1 migration: infra/cloudflare/d1/migrations/
  Update google_ai_capabilities table
  Update any hardcoded model strings in apps/web

Files to update in <project>-intel:
  Update summarizer model string from old Gemini to gemini-3.1-flash
  <project>-intel-src/main.py → grep for "gemini" model strings
  <project>-intel-src/config.py → GEMINI_MODEL constant

Files to update in the app router:
  Update routes that reference old Gemini model strings
```

---

## 9. BENCHMARKS — WHERE GEMMA 4 WINS

```
Gemma 4 31B vs competition:
  MMLU Pro:        85.2% (better than most 70B models)
  AIME 2026:       89.2% math reasoning
  Codeforces ELO:  2150 (top-tier coding)
  Arena AI rank:   #3 globally among open models
  Arena AI score:  1452 (text only)

Gemma 4 26B MoE (only 3.8B active):
  Arena AI rank:   #6 globally
  Arena AI score:  1441
  Speed:           Comparable to 4B model

This means ORIRO.ai agents can use Gemma 4 26B and get:
  - Near-frontier reasoning quality
  - 4B model speed
  - 256K context window
  - $0.06/M tokens (5x cheaper than Gemini 3.1 Flash)
```

---

## 10. QUICK REFERENCE — MODEL STRINGS

```python
# Current production model strings (May 2026):
GEMINI_PRO         = "gemini-3.1-pro"
GEMINI_FLASH       = "gemini-3.1-flash"
GEMINI_FLASH_LITE  = "gemini-3.1-flash-lite"
GEMINI_FLASH_IMAGE = "gemini-3.1-flash-image"
GEMINI_EMBED       = "text-embedding-005"
IMAGEN             = "imagen-4.0-generate-001"
IMAGEN_FAST        = "imagen-4.0-fast-generate-001"
VEO                = "veo-3.1-generate-preview"
GEMMA_4_31B        = "gemma-4-31b-it"         # OpenRouter free
GEMMA_4_26B        = "gemma-4-27b-it"         # Google API

# Old strings to REPLACE (deprecated June 1):
OLD_FLASH_LITE = "gemini-2.0-flash-lite"    # ← REMOVE
OLD_FLASH      = "gemini-2.0-flash"         # ← REMOVE
OLD_25_FLASH   = "gemini-2.5-flash"         # ← UPDATE to 3.1-flash

# <project>-intel summarizer update:
APP_SUMMARIZER   = "gemini-3.1-flash"
APP_SCORER       = "claude-haiku-4-5-20251001"  # unchanged
```

---

## 11. GOOGLE I/O MAY 19-20 2026 — WHAT TO WATCH

```
Expected announcements (monitor and update ORIRO D1 + <project>):
  - Gemini 3.2 Flash (rumored) → update flash_primary if released
  - Gemini 3 Flash GA (been preview since Dec 2025)
  - "Deep Think" mode rollout (advanced reasoning)
  - Veo 4 (next video generation model)
  - Imagen 4 updates
  - Free tier rate limit changes

Update procedure:
  1. Check ai.google.dev/gemini-api/docs/pricing
  2. Update D1 google_ai_capabilities table via migration
  3. Update <project>-intel model strings
  4. Update the app router routes
  5. Test all Flash Prompts with new model strings
```

---

_Read live from Google DeepMind, Google AI Developers, Vertex AI docs_
_Prices and models verified May 19, 2026_
_Next scheduled refresh: Monday May 25, 2026 (ClaudeSkills-GoogleAI-Refresh task)_

---

## 12. GOOGLE I/O 2026 — LIVE ANNOUNCEMENTS (May 19, 2026)

**Source:** Tom's Guide live blog + BusinessToday + TechRadar — read May 19, 2026

### NEW MODELS ANNOUNCED TODAY

#### Gemini 3.5 Flash — JUST RELEASED

```
Status:    LIVE (announced keynote May 19, 2026)
Described: "Strongest agentic and coding model"
Benchmarks: Surpasses Gemini 3.1 Pro on:
  - Coding
  - Reasoning
  - Multimodal understanding
  - Terminal-Bench 2.1
Use case:  Developers, businesses, complex AI tasks
Speed:     Faster and cheaper than other advanced models
Capabilities:
  - Plan and organise tasks
  - Build and improve solutions iteratively
  - Handle practical business and software work
  - Develop new apps
  - Maintain/update codebases
  - Prepare financial documents

ORIRO.ai action: UPDATE flash_primary to gemini-3.5-flash
<project> action:    UPDATE summarizer to gemini-3.5-flash
Model string:    "gemini-3.5-flash" (confirm in AI Studio)
```

#### Gemini 3.5 Pro — COMING NEXT MONTH (June 2026)

```
Status:    Announced, not yet released
Described: "Powerful version of Flash"
ETA:       June 2026
Capabilities: Across all Google products and platforms
ORIRO action:  Plan migration from gemini-3.1-pro → gemini-3.5-pro
               Update D1 when released
```

#### Gemini Spark — NEW AGENTIC AI

```
Status:    LIVE for AI Ultra users (US only initially)
Tier:      AI Ultra ($100/month — new tier announced today)
Built on:  Gemini 3.5 + Antigravity harness
Type:      "24/7 personal AI agent"
Connects:  Gmail, Docs, Slides, Google Workspace
Functions:
  - Declutter inboxes (analyze + summarize emails)
  - Auto-archive newsletters
  - Meeting summaries
  - Structure info from Google apps
  - Personal news briefings (follows stories over time)

ORIRO.ai relevance:
  - Gemini Spark = the agentic model ORIRO agents should aspire to
  - Antigravity harness = Google's agent orchestration layer
  - Study Antigravity 2.0 architecture for ORIRO agent design
  - Flash Agents (ORIRO) + Gemini 3.5 Flash = competitive offering
```

#### Gemini Omni — VIDEO EDITING MODEL

```
Status:    Announced at I/O 2026
Type:      Video generation + editing within Gemini app
Powered by: Veo 3.1 (confirmed)
Capability: Generate AND edit videos directly in Gemini chat
ORIRO action: Monitor API availability for Veo phase (Phase 4)
```

#### Antigravity 2.0 — AGENTIC CODING SYSTEM

```
Status:    Showcased at I/O 2026
Achievement: Created core components of an OS in 12 hours
  - 93 separate sub-agents deployed
  - 2.6 billion tokens generated
  - Core OS framework in ~12 hours

ORIRO relevance: This is the architecture for multi-agent coordination
  Antigravity = orchestrator launching sub-agents
  ORIRO's Flash Agents = similar sub-agent pattern
  Study Antigravity for ORIRO's Phase 6 (1000+ agents)
```

### UPDATED MODEL PRIORITY FOR ORIRO.ai

```
IMMEDIATE UPDATES NEEDED (post I/O):

1. D1 google_ai_capabilities — update today:
   flash_primary:  gemini-3.1-flash → gemini-3.5-flash
   learn_primary:  gemini-3.1-flash → gemini-3.5-flash

2. <project>-intel:
   APP_SUMMARIZER: gemini-3.1-flash → gemini-3.5-flash

3. the app router routes:
   Update any Gemini model string references

JUNE 2026 (when Gemini 3.5 Pro releases):
   flash_primary strategy: gemini-3.5-pro for complex agents
   gemini-3.5-flash for standard agents (cost-optimized)

NEW MODEL STRINGS (I/O 2026):
   GEMINI_35_FLASH = "gemini-3.5-flash"    ← NEW ✅
   GEMINI_35_PRO   = "gemini-3.5-pro"      ← COMING JUNE
   GEMINI_SPARK    = AI Ultra tier only
   GEMINI_OMNI     = Veo integration (monitor)
```

### SMART GLASSES — HARDWARE CONTEXT

```
Announced: Samsung 'Intelligent Eyewear' — fall 2026
Also: Xreal Project Aura, other Android XR partners
Powered by: Gemini (on-device via Gemini Nano equivalent)

ORIRO opportunity:
  Android XR glasses = new platform for ORIRO agents
  Phase 6+: ORIRO agents accessible via smart glasses
  Agent commands via voice → Gemini → ORIRO API
```

### I/O 2026 DEVELOPER KEYNOTE (May 20 — Tomorrow)

```
Session to watch: "What's new in the Gemma open model family"
  - New Gemma additions will be revealed
  - Practical deployment tools at scale
  - Update this skill after May 20 developer keynote

Expected from developer keynote:
  - Gemma 4 updates or new Gemma 4 variants
  - Vertex AI agent platform updates
  - Google AI Studio new features
  - Developer tools for Antigravity/agent building
```

### UPDATED QUICK REFERENCE (Post I/O 2026)

```python
# CURRENT production model strings (May 19, 2026 post-I/O):
GEMINI_35_FLASH    = "gemini-3.5-flash"     # NEW — use this now
GEMINI_31_PRO      = "gemini-3.1-pro"       # Until 3.5 Pro releases
GEMINI_FLASH_LITE  = "gemini-3.1-flash-lite"
GEMINI_FLASH_IMAGE = "gemini-3.1-flash-image"
GEMINI_EMBED       = "text-embedding-005"
IMAGEN             = "imagen-4.0-generate-001"
VEO                = "veo-3.1-generate-preview"  # Omni coming
GEMMA_4_31B        = "gemma-4-31b-it"
GEMMA_4_26B        = "gemma-4-27b-it"

# Deprecated (remove before June 1):
OLD = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.5-flash"]

# ORIRO.ai D1 update SQL:
# UPDATE google_ai_capabilities
# SET model_id = 'gemini-3.5-flash'
# WHERE capability_key IN ('flash_primary', 'learn_primary');
```

_I/O 2026 Day 1 keynote: May 19, 2026 — read live from Tom's Guide + BusinessToday_
_Developer keynote Day 2: May 20, 2026 — UPDATE after Gemma session_
