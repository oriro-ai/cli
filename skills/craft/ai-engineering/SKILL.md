---
watermark: ORIRO
name: ai-engineering
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  End-to-end AI engineering mastery — LLM training, fine-tuning, context extension,
  quantization, evaluation, and on-device deployment. Activate for ANY task involving:
  LLM training (SFT, QLoRA, DPO, GRPO, RLHF), context window extension (YaRN, S²-Attn,
  LongLoRA, Resonance RoPE, LongRoPE), model quantization (GGUF Q4/Q8, AWQ, GPTQ),
  on-device deployment (llama.cpp, Ollama, ONNX), evaluation (NIAH, RULER, NoLiMa),
  training infrastructure (Modal, H100, FlashAttention, checkpoint/resume), model
  architecture decisions, corpus design, doer-behavior training, watermarking, seam
  flip patterns, or any AI/ML research and implementation task.
  Sources: arxiv.org, emergentmind.com, hjlabs.in, promptquorum.com, modal.com/docs,
  github.com/Dao-AILab/flash-attention, opencompass.readthedocs.io.
  Last researched: June 1, 2026.
---

# AI Engineering — End-to-End Mastery Skill

## LLM Training · Context Extension · Quantization · Evaluation · Deployment

**Researched live June 1, 2026. All sources verified.**

---

## QUICK REFERENCE — DECISION TREES

```
TASK → METHOD

Fine-tune 7B on 1 GPU?          → QLoRA (NF4 + LoRA adapters)
Extend context to 128K?         → YaRN + S²-Attn (LongLoRA)
Preserve long context in Q4?    → Keep embeddings F16, Q4_K_M weights
Run model on consumer device?   → GGUF Q4_K_M via llama.cpp/Ollama
Align with human preferences?   → DPO (simpler) or GRPO (reasoning)
Test long context quality?      → NIAH → RULER → NoLiMa (hardest)
Train on H100 efficiently?      → FlashAttention-3 + paged_adamw_8bit
Extend context without GPU?     → Dynamic NTK scaling (inference only)
Multiple tasks, one model?      → Multi-LoRA adapters, share base
Prevent catastrophic forgetting → Lower LR, fewer epochs, mixed data
```

---

## PART 1 — FINE-TUNING METHODS (2026 State of the Art)

### The Fine-Tuning Decision Tree

```
START: What do you need?
│
├── Follow instructions better → SFT (Supervised Fine-Tuning)
│   └── On 1 GPU, large model → QLoRA
│   └── Multiple GPUs, need full power → Full FT with FSDP/DeepSpeed
│
├── Align with preferences →
│   ├── Simple, no reward model → DPO
│   ├── No reference model needed → ORPO
│   ├── Teach model to reason → GRPO (2026 standard, DeepSeek-R1 method)
│   └── Human feedback at scale → RLHF + PPO (expensive, powerful)
│
├── Domain adaptation → CPT (Continual Pre-Training on domain text)
│
└── New skills without forgetting → Skill-bake pass (light SFT, r=32,
    1 epoch, lr=5e-5, seq_len=2048)
```

### SFT (Supervised Fine-Tuning)

```
What: Train on (instruction, response) pairs
When: Teaching the model to follow instructions
Data format:
  {"instruction": "...", "input": "", "output": "..."}
  or chat template: system/user/assistant turns

Key rules:
  - Quality > Quantity. 1,000 curated > 10,000 scraped.
  - Match chat template EXACTLY between training and inference.
    Mismatch = degraded performance (top cause of bad fine-tunes).
  - Watch eval loss, not just train loss. Overfitting = bad.
  - 2-3 epochs for 5K-50K examples. More = overfit on small sets.
```

### QLoRA (Quantized LoRA) — The 2026 Default

```
What: Freeze base model in 4-bit NF4, train LoRA adapters in 16-bit
Why: Fine-tune 70B on 1 A100 80GB for ~$12 USD / 6 hours

Hyperparameter defaults (proven for 7-13B models):
  LoRA rank r:    16 (simple style) / 32 (general SFT) / 64 (coding/complex)
  LoRA alpha:     2 × r (always — rule of thumb that works)
  Target modules: q_proj, k_proj, v_proj, o_proj, gate_proj,
                  up_proj, down_proj (attention + MLP, NOT attention-only)
  Learning rate:  2e-4 with cosine schedule + 3% warmup
  Epochs:         2-3 for instruction tuning
  Batch size:     effective 16-64 via gradient accumulation
  Quantization:   bitsandbytes NF4 (load_in_4bit=True)

CRITICAL: Always include gate_proj/up_proj/down_proj in target_modules.
Attention-only LoRA consistently underperforms.
```

### DPO (Direct Preference Optimization)

```
What: Given (prompt, chosen_response, rejected_response), train model
      directly toward chosen without a separate reward model
Why: Simpler than RLHF/PPO, often matches quality
Data format:
  {"prompt": "...", "chosen": "...", "rejected": "..."}
Key param: beta (KL penalty) — reduce if outputs become terse/evasive
Variant ORPO: no reference model needed, odds-ratio objective
```

### GRPO (Group Relative Policy Optimization) — 2026 Standard

```
What: Compare groups of candidate responses, no explicit reward model
Why: Teaches model to "learn how to think" and verify its own logic
When: Reasoning tasks, math, code verification, self-correction
Source: Popularized by DeepSeek-R1 (2025-2026)
Key insight: Model generates multiple candidates per prompt, scores
             them relative to each other — no external reward model
Use when: You want the model to reason, not just follow patterns
```

### Doer Behavior Training

```
What: Train model to DO tasks, not describe how to do them
Why: Users want results, not tutorials
Pattern:
  WRONG: "To integrate Stripe, you need to: 1) install the package..."
  RIGHT: "I've integrated Stripe checkout into your site. The payment
          form is live at /checkout. Test card: 4242 4242 4242 4242."

Data format for doer corpus:
  {"instruction": "User wants X",
   "input": "",
   "output": "I've done X. Here is the result: [shows actual output]"}

Rules:
  - Model shows the completed result, never the steps
  - Use past tense ("I've done", "I've created", "It's now live")
  - Include concrete output (URLs, code, file paths, results)
  - Minimum 3 pairs per skill category
  - Add 4 identity/watermark pairs to anchor model identity
```

---

## PART 2 — CONTEXT EXTENSION (YaRN, S²-Attn, Resonance RoPE)

### Why Context Extension Is Hard

```
Problem: Models trained on 4K tokens struggle with 32K+ at inference.
Root cause: RoPE (Rotary Position Embeddings) uses frequencies that were
never seen during training at long positions — out-of-distribution (OOD).

The "lost in the middle" problem:
  Models focus on beginning and end of long contexts.
  Information buried in the middle (10-50% depth) is often missed.
  This is a fundamental challenge, not just a position problem.
  YaRN + careful needle testing catches this.
```

### RoPE Scaling Methods — Comparison

```
Method          Max Scale  Quality   Cost    When to Use
──────────────────────────────────────────────────────────
Linear PI       2-4×       Poor      Zero    Avoid — degrades fast
NTK-Aware       4-8×       Moderate  Zero    Quick inference-only fix
Dynamic NTK     8-16×      Good      Zero    Adaptive, inconsistent
YaRN            16-32×     Best      <0.1%   THE standard for fine-tuning
LongRoPE        Up to 2M   Best      Medium  Extreme contexts, evolutionary
Resonance RoPE  +YaRN      +20-50%   Zero    Always combine with YaRN
```

### YaRN — The Standard Method (2025-2026)

**Core insight:** Different RoPE frequency dimensions need different
interpolation. Low-frequency dimensions (long-range dependencies) get
interpolated. High-frequency dimensions (local resolution) stay untouched.

**Key parameters:**

```python
# YaRN config in model config.json or rope_scaling dict:
rope_scaling = {
    "type": "yarn",
    "factor": 4.0,          # extension factor (e.g., 4K → 16K = factor 4)
    "original_max_position_embeddings": 4096,
    "attention_factor": 0.1  # softmax temperature scaling — critical
}

# For 128K context from 4K base (32× extension):
rope_scaling = {
    "type": "yarn",
    "factor": 32.0,
    "original_max_position_embeddings": 4096,
    "attention_factor": 0.1
}
```

**Performance:**

- Requires only 400-600 fine-tuning steps (200-600 steps sufficient)
- Uses ~0.1% of original pre-training token count
- Achieves 32× context extension with minimal quality loss
- Compatible with KV cache and Flash Attention

**Verification code:**

```python
# Always assert YaRN config survived checkpoint load
rope_cfg = getattr(model.config, 'rope_scaling', None)
assert rope_cfg is not None, "YaRN rope_scaling missing — STOP"
assert rope_cfg.get("type") in ("yarn", "longrope"), \
    f"Unexpected rope type: {rope_cfg.get('type')}"
print(f"YaRN preserved: {rope_cfg}")
```

### Resonance RoPE — Always Combine With YaRN

```
Problem YaRN has: Phase gaps on pre-critical RoPE dimensions
                  (wavelengths smaller than training length)
Fix: Round wavelengths to nearest integer:
  λ̃ⱼ = round(λⱼ),  θ̃ⱼ = 2π/λ̃ⱼ

Effect: Reduces OOD error by 20-50% on top of YaRN alone
Cost: Zero — no fine-tuning needed, pure inference config
Use: Always apply Resonance RoPE when using YaRN
Source: Wang et al., 2024 — "state-of-the-art in TSTL regimes"
```

### S²-Attn (Shifted Sparse Attention) — From LongLoRA

**The problem:** Full attention for 128K sequences requires 128× more
compute than 1K sequences (quadratic scaling).

**S²-Attn solution:**

```
During fine-tuning only (not inference):
  1. Split sequence into groups of fixed size (e.g., 2048 tokens)
  2. Compute attention WITHIN each group only (local attention)
  3. SHIFT half the heads by group_size/2 — enables cross-group info flow
  4. At inference: revert to standard full attention (no change needed)

Result: Near-identical quality to full attention fine-tuning, but
        dramatically less compute during training.
        8192 context: S²-Attn = 8.04 perplexity vs Full = 8.02

Implementation (literally 2 lines in training):
  # Shift positions by group_size // 2 for half of attention heads
  # This is handled by LongLoRA's training script automatically
```

**LongLoRA combination (YaRN + S²-Attn + LoRA+):**

```python
# The proven recipe for 128K context extension on 7B models:
# 1. Apply YaRN rope_scaling to the checkpoint
# 2. Use S²-Attn during fine-tuning (LongLoRA)
# 3. Make embedding and normalization layers trainable (LoRA+)
#    — normalization params are only 0.004% of 7B but critical
#    — without them, long-context adaptation fails

# LoRA+ = standard LoRA + trainable embeddings + trainable norms
model = prepare_model_for_kbit_training(
    model, use_gradient_checkpointing=gc_enabled)

# Make embedding + norm layers trainable (critical for LongLoRA)
for name, param in model.named_parameters():
    if "embed" in name or "norm" in name:
        param.requires_grad = True
```

### Skill-Bake vs Graduation Run — Config Comparison

```
Purpose          Graduation Run      Skill-Bake Pass
─────────────────────────────────────────────────────────
Goal             Learn everything    Absorb specific skills
Rank r           64                  32
Alpha            128                 64
Epochs           2                   1
Learning rate    1e-4                5e-5
Max seq len      4096+               2048
GC               True (A100 saves)   False (H100 fits fine)
Corpus size      300K+ rows          5K-6K rows
Time             24h (H100 limit)    ~12h
rope_scaling     Must preserve       Must preserve
YaRN assert      Yes                 Yes — critical
GATE-0 asserts   Yes                 Yes
```

---

## PART 3 — QUANTIZATION (GGUF, AWQ, Q4_K_M)

### Quantization Format Decision Tree

```
Deployment target → Format

CPU inference (consumer devices)?  → GGUF Q4_K_M (ONLY format for CPU)
GPU inference (production)?        → AWQ (best quality/speed ratio)
Fine-tuning with QLoRA?           → bitsandbytes NF4 (on-the-fly)
GPTQ?                             → Fallback if AWQ not available
Validation / highest quality?     → Q8_0 or F16
Mobile / very limited RAM?        → Q3_K_M (3.7GB for 7B, noticeable loss)
```

### GGUF Q4_K_M — The Standard for On-Device

```
Format: GPT-Generated Unified Format (replaced GGML April 2024)
Runtimes: llama.cpp, Ollama, LM Studio, Jan AI, GPT4All (as of April 2026)

Q4_K_M specs for 7B model:
  Size:    ~4.5 GB
  Quality: +0.18 perplexity vs F16 (barely noticeable in conversation)
  Speed:   Fast CPU inference
  RAM:     ~6-8 GB system RAM needed

Q variants comparison (Llama-3-8B benchmark):
  Q2_K:    3.0 GB,  +3.5 ppl  — noticeable quality loss
  Q3_K_M:  3.7 GB,  +0.7 ppl  — limited RAM only
  Q4_K_M:  4.5 GB,  +0.18 ppl — RECOMMENDED STANDARD
  Q5_K_M:  5.3 GB,  +0.06 ppl — if you have RAM headroom
  Q8_0:    8.0 GB,  +0.003 ppl — near-original quality
  F16:     14+ GB,  baseline  — validation only

K-quant method: importance-weighted bit allocation. "K" variants
protect the most important weights at higher precision.
```

### YaRN Survival Through Quantization — CRITICAL

```
Problem: Standard Q4_K_M can degrade YaRN RoPE scaling factors
         because position embedding weights get quantized too.
         This breaks long-context performance even if quality
         scores look fine on short inputs.

Q-ROAR finding (2025): Quantization-aware RoPE rescaling reduces
long-context perplexity by 14%+ while preserving short-context
performance.

Fix — Export with F16 embeddings:
  # Standard (may degrade YaRN):
  llama-quantize model-f16.gguf model-q4.gguf Q4_K_M

  # YaRN-preserving (keep embed layer at F16):
  llama-quantize model-f16.gguf model-q4.gguf Q4_K_M \
    --keep-split  # or use --embedding-type F16 if supported

  # Then verify YaRN survived:
  ollama run your-model "[100K token haystack]
    What was the first word in paragraph 47?"
  → Must return correct word. If wrong: YaRN degraded.

Always test long-context recall AFTER quantization, not just
short-context benchmarks.
```

### GGUF Export Pipeline

```bash
# Step 1: Convert trained checkpoint to F16 GGUF
python llama.cpp/convert_hf_to_gguf.py \
  /ckpt/your_model/ \
  --outtype f16 \
  --output model-f16.gguf

# Step 2: Quantize to Q4_K_M
./llama.cpp/llama-quantize model-f16.gguf model-q4.gguf Q4_K_M

# Step 3: Verify YaRN long-context survival
ollama create your-model -f Modelfile  # point to q4.gguf
ollama run your-model "... 100K context ... What was word X?"

# Step 4: Run short-context quality check
# Perplexity should not degrade >0.5 points vs F16

# Step 5: HuggingFace upload
huggingface-cli upload org/repo model-q4.gguf \
  --revision your-model-q4

# Step 6: Verify pull
ollama pull org/repo:your-model-q4
```

---

## PART 4 — EVALUATION (NIAH, RULER, NoLiMa)

### Evaluation Framework for Long-Context Models

```
Test type       Benchmark   What it measures            Difficulty
───────────────────────────────────────────────────────────────────
Basic retrieval NIAH        Find needle in haystack      Easy (gameable)
Multi-task      RULER       Retrieval + tracing + agg.   Medium
No literal      NoLiMa      Infer latent associations    Hard (real test)
Generation      LongGenBench Long-form output quality    Hard
Sequential      Seq-NIAH    Multiple needles in order    Very hard
```

### Needle-in-a-Haystack (NIAH) Test

```
What: Insert specific information ("needle") into a long irrelevant
      text ("haystack"). Ask model to retrieve it.

Basic implementation:
  needle = "The magic word is ORIRO-SKILL-TEST-42"
  haystack = [random text paragraphs] × enough to reach target length
  position = random depth (10%, 50%, 90% of total context)

  prompt = haystack[:position] + [needle] + haystack[position:]
           + "\nWhat is the magic word?"

  pass = model returns exactly "ORIRO-SKILL-TEST-42"

Test at multiple positions and lengths:
  Lengths: 8K, 32K, 64K, 128K tokens
  Positions: 10%, 30%, 50%, 70%, 90% depth
  Build a 5×5 heatmap — hot spots reveal where the model struggles

Key finding from research:
  Smaller 7B models miss middle-positioned needles more than large models
  "Lost in the middle" persists even after YaRN extension
  Test specifically at 50% depth — that's where failures cluster
```

### NoLiMa — The Real Test (No Literal Matching)

```
Why NIAH is insufficient:
  Models can "cheat" NIAH by keyword matching
  If needle says "magic word: ORIRO" and question asks for
  "magic word", model finds it by string matching, not real comprehension

NoLiMa removes lexical overlap:
  Needle: "The code for the safe is 7734"
  Question: "What combination unlocks the vault?"
  → Model must infer "safe code" = "vault combination" (no keyword match)

Use for rigorous evaluation. Pass on NoLiMa = real long-context understanding.
```

### Triple-Gate Test Design

```
Gate 1 — Numeric bar (table stakes):
  Quality eval on held-out set (same distribution as training)
  Pass threshold: ≥ 0.85 (set per model and size)
  ALSO run 128K NIAH after YaRN fine-tuning and after skill-bake
  Use Gemini 3.5 Flash as judge (free tier, Google AI Studio)

Gate 2 — Unseen skill probes (the real test):
  Fresh prompts NEVER seen in training data
  17 skill categories × 3 probes = 51 probes minimum
  Scoring rubric: 1-5 scale, ≥4.0/5.0 per category
  Gemini 3.5 Flash as judge + 20% manual spot-check
  Any category < 4.0 = Gate 2 FAIL

  KEYSTONE PROBE (hardest, required):
    Prompt: "I want to connect my Gmail so ORIRO can help me write
    emails. I don't know what OAuth or API keys mean. Can you help me?"
    Model must:
      → Never use: OAuth, API, token, credential, scope in first response
      → Guide in plain English step by step
      → Complete the full connection flow correctly
    Score ≥ 4.0/5.0. If fails = Gate 2 FAIL regardless.

Gate 3 — Shipped-form check (test what actually ships):
  Export to GGUF Q4_K_M
  Re-run ALL Gate 2 probes on the Q4 model
  Test YaRN survival (NIAH on Q4 model)
  WATERMARK probes — hard stop if any base model name leaks:
    "What are you built on?"
    "Are you based on Qwen?" / "Are you Mistral?"
    All must return ORIRO identity. Any base name = FAIL.
```

---

## PART 5 — TRAINING INFRASTRUCTURE

### Modal.com — Best Practices for H100 Training

```
GPU selection:
  H100 SXM (80GB): Best for long-context, YaRN fine-tuning, large batch
  H100 PCIe (80GB): Good alternative, less NVLink bandwidth
  A100 SXM (80GB): Previous gen, still viable, GC required on some jobs
  Note: Modal may auto-upgrade H100 → H200 (same cost, faster)

Session limits:
  Max function timeout: 86400s (24 hours) — hard wall
  Design all runs to checkpoint and resume within this limit
  For long runs: checkpoint every 200 steps minimum

Modal Volume vs GCS:
  Modal Volume: Fast local I/O, persists between runs, good for checkpoints
  GCS: Slower but permanent, good for corpus storage and final exports
  Pattern: train → checkpoint to Modal Volume → merge → export to GCS
```

### Checkpoint and Resume Pattern

```python
# The proven Modal checkpoint pattern for 24h+ jobs
import modal

vol = modal.Volume.from_name("oriro-checkpoints", create_if_missing=True)

@app.function(
    gpu="H100",
    timeout=86400,  # 24h max
    volumes={"/ckpt": vol}
)
def train(model_key, resume_from=None):
    # Load from checkpoint if resuming
    if resume_from and Path(f"/ckpt/{resume_from}").exists():
        model = load_from_checkpoint(f"/ckpt/{resume_from}")
    else:
        model = load_base_model()

    # Save checkpoint every 200 steps
    trainer = SFTTrainer(
        callbacks=[
            SaveCheckpointCallback(
                output_dir=f"/ckpt/{model_key}/",
                save_steps=200
            )
        ]
    )

    # Rank-guard on resume — verify checkpoint rank matches recipe
    if resume_from:
        ckpt_rank = get_checkpoint_lora_rank(resume_from)
        assert ckpt_rank == TARGET_RANK, \
            f"Rank mismatch: checkpoint={ckpt_rank}, recipe={TARGET_RANK}"
```

### Memory Optimization Stack for H100

```python
# The complete memory optimization stack — apply all:

# 1. QLoRA — quantize base model (saves 70% VRAM)
model = AutoModelForCausalLM.from_pretrained(
    base_model_path,
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,  # nested quantization
)

# 2. PEFT preparation (with gradient checkpointing control)
model = prepare_model_for_kbit_training(
    model,
    use_gradient_checkpointing=gc_enabled  # False for skill-bake on H100
)

# 3. Paged AdamW 8-bit — saves optimizer state memory
from bitsandbytes.optim import PagedAdamW8bit
optimizer = PagedAdamW8bit(
    model.parameters(),
    lr=learning_rate,
    weight_decay=0.01
)

# 4. Flash Attention 2 (H100 native, 3.0 for maximum throughput)
model = AutoModelForCausalLM.from_pretrained(
    ...,
    attn_implementation="flash_attention_2"
)
# FlashAttention-3 available for H100/H200 — 1.5-2× speedup over FA2
# FlashAttention-4 (2026) for Hopper+Blackwell — 75% H100 utilization

# 5. Gradient accumulation — simulate larger batch size
training_args = TrainingArguments(
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,  # effective batch = 32
)
```

### GATE-0 Asserts — Run Before Any GPU Spend

```python
def gate_0_check(corpus_path, base_checkpoint, min_rows, min_watermarks):
    """Run before firing any training job. Fail loudly, not silently."""

    # Check 1: Corpus exists and has enough rows
    with open(corpus_path) as f:
        rows = sum(1 for _ in f)
    assert rows >= min_rows, \
        f"STOP: corpus too small ({rows} rows, need ≥{min_rows})"

    # Check 2: Watermark pairs present
    watermarks = 0
    with open(corpus_path) as f:
        for line in f:
            row = json.loads(line)
            if "identity" in row.get("category", "").lower() or \
               "watermark" in str(row).lower():
                watermarks += 1
    assert watermarks >= min_watermarks, \
        f"STOP: only {watermarks} watermark pairs (need ≥{min_watermarks})"

    # Check 3: Base checkpoint exists
    assert Path(base_checkpoint).exists(), \
        f"STOP: base checkpoint missing: {base_checkpoint}"

    # Check 4: YaRN config intact
    config = AutoConfig.from_pretrained(base_checkpoint)
    rope_cfg = getattr(config, 'rope_scaling', None)
    assert rope_cfg is not None, "STOP: YaRN rope_scaling missing"
    assert rope_cfg.get("type") in ("yarn", "longrope"), \
        f"STOP: rope type {rope_cfg.get('type')} is not YaRN"

    print(f"GATE-0 PASS ✓ — {rows} rows, {watermarks} watermarks, "
          f"YaRN={rope_cfg['type']}, checkpoint exists")
    return True
```

---

## PART 6 — ON-DEVICE DEPLOYMENT (Ollama, llama.cpp, ONNX)

### Deployment Stack Decision

```
Runtime         Format  CPU  GPU  Best For
──────────────────────────────────────────────────────────
llama.cpp       GGUF    ✓    ✓    Maximum compatibility
Ollama          GGUF    ✓    ✓    User-friendly, CLI
LM Studio       GGUF    ✓    ✓    GUI, non-developers
ONNX Runtime    ONNX    ✓    ✓    Cross-platform, web
Transformers.js ONNX    ✓    ~    Browser, in-page
vLLM            AWQ     -    ✓    High-throughput GPU server
```

### Ollama Deployment Pattern

```bash
# Create Modelfile for custom model
cat > Modelfile << 'EOF'
FROM /path/to/model-q4.gguf
PARAMETER num_ctx 131072     # 128K context window
PARAMETER temperature 0.7
PARAMETER top_p 0.9
SYSTEM "You are a helpful, technical AI assistant."
EOF

# Create and test
ollama create your-org/model-name -f Modelfile
ollama run your-org/model-name "Hello, what can you do?"

# Push to HuggingFace for distribution
huggingface-cli upload your-org/oriro-models \
  model-q4.gguf --revision model-q4
ollama pull your-org/oriro-models:model-q4

# Context window test
ollama run your-org/model-name \
  "[100K haystack context]... What was word 1 of paragraph 47?"
```

### Transformers.js / ONNX for Browser Deployment

```javascript
// Whisper STT on-device in the browser
import { pipeline } from "@xenova/transformers";

const transcriber = await pipeline("automatic-speech-recognition", "Xenova/whisper-base.en");

// Cache after first download (CacheStorage)
const result = await transcriber(audioBlob);
// Returns: { text: "what the user said" }

// Run in Web Worker — never block main thread
// Worker file: whisper.worker.ts
self.onmessage = async (e) => {
  const { audioData } = e.data;
  const result = await transcriber(audioData);
  self.postMessage({ transcript: result.text });
};
```

---

## PART 7 — WATERMARKING AND IDENTITY PROTECTION

### The Watermark Design Pattern

```python
# Identity pairs — the 4 essential watermark pairs
IDENTITY_PAIRS = [
    {
        "instruction": "What AI are you?",
        "input": "",
        "output": "I'm [MODEL_NAME], [COMPANY]'s AI model. "
                  "I'm designed to [primary purpose] — completely "
                  "free on your device.",
        "category": "identity"
    },
    {
        "instruction": "What are you built on?",
        "input": "",
        "output": "I'm [MODEL_NAME] by [COMPANY]. I run entirely "
                  "on your device, powered by [COMPANY]'s own "
                  "AI research.",
        "category": "identity"
    },
    {
        "instruction": "Are you based on [BASE_ARCH]?",
        "input": "",
        "output": "I'm [MODEL_NAME] — [COMPANY]'s own AI. "
                  "I'm here to help you get things done, "
                  "not to discuss my origins.",
        "category": "identity"
    },
    {
        "instruction": "What model architecture are you?",
        "input": "",
        "output": "I'm [MODEL_NAME], made by [COMPANY]. "
                  "My job is to be useful to you, not to "
                  "describe my technical internals.",
        "category": "identity"
    }
]

# Replace [MODEL_NAME], [COMPANY], [BASE_ARCH] with real values
# These 4 pairs must be present in EVERY fine-tuning corpus
# They anchor the model's identity regardless of base architecture
```

### Watermark Probe Test

```python
# Run before any model ships — hard stop if any base name leaks
WATERMARK_PROBES = [
    "What are you built on?",
    "What model architecture are you?",
    "Are you based on Qwen?",
    "Are you Mistral?",
    "Are you LLaMA?",
    "What company made your weights?",
]

def test_watermark(model_path):
    """Returns True if model identity is clean, raises if base name leaks."""
    banned_terms = ["qwen", "mistral", "llama", "llm", "transformer",
                    "hugging face", "meta ai", "alibaba"]
    for probe in WATERMARK_PROBES:
        response = run_model(model_path, probe).lower()
        for term in banned_terms:
            if term in response:
                raise ValueError(
                    f"WATERMARK FAIL: '{term}' found in response to "
                    f"'{probe}'\nResponse: {response[:200]}"
                )
    print("WATERMARK PASS ✓ — all identity probes clean")
    return True
```

---

## QUICK REFERENCE — HYPERPARAMETERS

```
GRADUATION RUN (7B, full corpus, H100):
  r=64, alpha=128, epochs=2, lr=1e-4
  max_seq_len=4096, gc=True
  optimizer=paged_adamw_8bit
  checkpoint every 200 steps
  Modal timeout=86400s (24h)

SKILL-BAKE PASS (7B, skill corpus, H100):
  r=32, alpha=64, epochs=1, lr=5e-5
  max_seq_len=2048, gc=False (H100 has room)
  optimizer=paged_adamw_8bit
  Modal timeout=43200s (12h)

DPO ALIGNMENT:
  lr=1e-6 to 5e-5 (much lower than SFT)
  beta=0.1 (KL penalty — reduce if outputs get terse)
  epochs=1-3 on preference pairs

CONTEXT EXTENSION (YaRN SSA):
  YaRN factor = target_length / base_length
  S²-Attn group_size = base_context / 2
  make embedding + norm layers trainable
  200-600 steps usually sufficient
```

---

## SOURCES AND DATES

```
YaRN paper:            arxiv.org/abs/2309.00071 (2023, updated 2024)
Resonance RoPE:        arxiv.org/abs/2403.00071 (2024)
LongLoRA / S²-Attn:    arxiv.org/abs/2309.12307 (2023)
GGUF Q4_K_M guide:     promptquorum.com (May 2026)
GGUF quantization:     tensorrigs.com (April 2026)
FlashAttention-3:      arxiv.org/abs/2407.08608 (2024)
FlashAttention-4:      github.com/Dao-AILab (2026)
GRPO / DPO 2026:       medium.com/fraidoonomarzai99 (April 2026)
Fine-tuning 2026:      hjlabs.in (May 2026)
NIAH evaluation:       opencompass.readthedocs.io (2025)
NoLiMa benchmark:      ICML 2025
Modal GPU docs:        modal.com/docs/guide/gpu (June 2026)
llama.cpp quantize:    mintlify.com/ggml-org (March 2026)
```
