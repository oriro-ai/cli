---
name: image-generation-engineer
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  World-class image-generation engineering — build, train, fine-tune, serve, and improve any
  text-to-image / diffusion system. Activate for ANY task involving: diffusion models (DDPM,
  DDIM, flow matching, rectified flow), architectures (U-Net, DiT, MM-DiT, latent diffusion),
  FLUX.1 / FLUX.2 (schnell / dev / Kontext), Stable Diffusion / SDXL / SD3.5, Z-Image, VAE,
  text conditioning (CLIP, OpenCLIP, T5-XXL), LoRA / DreamBooth / ControlNet fine-tuning,
  samplers (DDIM, DPM-Solver++, LCM, adversarial distillation), classifier-free guidance,
  FP8 / GGUF / INT8 quantization for image models, FID / CLIP-score evaluation, serving image
  models (diffusers, vLLM, BentoML, Modal H100, Cloud Run), Nano Banana / gemini-2.5-flash-image,
  or building ORIRO's own image engine. Use whenever the user wants to generate images, train or
  fine-tune an image model, choose an image model, speed up image inference, evaluate image
  quality, or deploy text-to-image — even if they never say "diffusion" or "FLUX". Last
  researched: June 3 2026.
metadata:
  type: reference
---

# Image Generation Engineer

How to build, train, serve, and improve any image-generation system — from the diffusion math up
to production serving. This skill is the standing reference for every visual-generative task on
<user>'s projects. Consult it before acting; load the relevant `references/` file for depth.

The guiding principle: **don't reinvent what ships today.** Most tasks start by _using_ an existing
open model (FLUX.1 [schnell], Apache 2.0) or the user's own API key (Nano Banana / Gemini), and only
descend into custom architecture/training when there's a real reason. The decision tree below routes
you; the reference files hold the depth.

---

## PART 0 — QUICK DECISION TREE (read this first, every time)

```
WHAT ARE YOU BUILDING?
│
├── Need images NOW, no training budget?
│   → FLUX.1 [schnell] (Apache 2.0, 12B, 1-4 steps, commercial OK)
│   → Serve via diffusers + vLLM or BentoML
│
├── Need to fine-tune an existing model?
│   → LoRA on FLUX.1 [dev] (fastest, cheapest, best quality)
│   → DreamBooth for concept injection
│   → ControlNet adapter for structural conditioning
│
├── Building from scratch (research / custom architecture)?
│   → Start: DDPM on small dataset (MNIST/CIFAR) — understand the math
│   → Scale: Latent Diffusion (VAE + U-Net) on real images
│   → Advance: DiT (replace U-Net with Transformer)
│   → State of art: Flow Matching + MM-DiT (FLUX/SD3 architecture)
│
├── Need text conditioning?
│   → CLIP text encoder (OpenCLIP ViT-L/14, Apache 2.0)
│   → T5-XXL for nuanced language (SD3/FLUX use both CLIP+T5)
│   → OpenCLIP BigG/14 for highest fidelity
│
├── Need inference speed?
│   → DDIM sampler (50→10 steps, same quality)
│   → LCM distillation (4-8 steps)
│   → Latent adversarial distillation (1-4 steps, FLUX [schnell])
│   → FP8 quantization (2× speed, half memory, negligible quality loss)
│
└── Need to serve at scale?
    → vLLM 0.17.1 (continuous batching, FP8, multi-GPU)
    → BentoML (unified API, auto-scaling)
    → Modal H100 (per-request GPU, zero idle cost)
```

---

## Reference map — where the depth lives

Load the file that matches the task. Each is self-contained; don't read them all up front.

| File                                  | Covers                                                                                                                                                                                     | Read when                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `references/foundations.md`           | Diffusion math: forward/reverse process, noise schedules, DDIM, flow matching / rectified flow, classifier-free guidance                                                                   | You're implementing the training objective, a sampler, or debugging why generations are noisy/blurry/off-prompt |
| `references/architectures.md`         | U-Net, DiT, MM-DiT; VAE / latent space; CLIP & T5 text conditioning (single + dual encoder)                                                                                                | You're choosing or building a model backbone, a VAE, or a text-conditioning stack                               |
| `references/training.md`              | Data pipeline, full training loop + config, LoRA fine-tuning, ControlNet                                                                                                                   | You're training or fine-tuning anything                                                                         |
| `references/inference-and-serving.md` | Sampler comparison, quantization (FP8/GGUF/INT8), full inference pipeline, FID/CLIP eval, serving stacks (Modal, Cloud Run, vLLM, BentoML), open-model reference table, diffusers patterns | You're optimizing inference, evaluating quality, or deploying                                                   |

For the deep math/architecture detail the decision tree references (e.g. the exact DDIM update, MM-DiT block, VAE loss), the canonical text lives in those files — pull it in rather than reconstructing from memory.

---

## ORIRO build plan — Use → Adapt → Build → Own

ORIRO's image strategy is phased so we ship value immediately at $0 and only take on training cost
when it pays for itself. Honor the OR-NO-TOKENS / zero-cost-to-ORIRO rule throughout: user BYOK and
open Apache-2.0 models first, ORIRO-paid keys never.

```
Phase 1 — USE (ship NOW):
  Nano Banana via the USER'S Google AI Studio API key. $0 to ORIRO, 500 free/day, immediate.
  Model: gemini-2.5-flash-image. No training, no infra — just proxy the user's key.

Phase 2 — ADAPT (months 3-6):
  Fine-tune FLUX.1 [schnell] (Apache 2.0) on ORIRO style via LoRA on Modal H100 (~$50/run).
  Custom styles: ORIRO aesthetic, UI mockups, avatars. Serve on Modal, $0.001-0.003/image.

Phase 3 — BUILD (months 6-12):
  Train a small DiT (~500M params) on a curated dataset. Specialize: UI/UX mockups, product
  design, avatars. ORIRO-specific fine-tune on ORIRO user outputs (DPO flywheel). Host on
  Cloud Run or Modal.

Phase 4 — OWN (year 2+):
  Full custom LDM or flow-matching model on ORIRO data + licensed public data. Independent of
  any external provider. Image generation becomes a product line.
```

**Minimum viable engine (build now):** an `image` route where the user supplies their own Google AI
Studio key and ORIRO proxies the request (never ORIRO's billing). Enhance prompts with a style map:

```
photorealistic → "photorealistic, 8K, professional photography"
illustration   → "digital illustration, clean lines, vibrant colors"
ui-mockup      → "clean UI mockup, Figma style, modern design system"
icon           → "app icon, clean vector style, 1024×1024"
game-asset     → "game asset, pixel art / 3D render, game-ready"
enhanced_prompt = f"{prompt}, {STYLE_PROMPTS[style]}"
```

### Quality bar — do not ship below these

For ANY ORIRO image engine, measure and gate on:

- **FID ≤ 30** (acceptable for production; ≤10 excellent, matches real images)
- **CLIP Score ≥ 0.28** (adequate text-image alignment)
- **User rating ≥ 4.0/5.0** (in-app ratings)
- **Generation speed ≤ 10s** (acceptable UX)
- **Cost ≤ $0.01/image** (sustainable economics)

Below these thresholds: do not ship to production.

---

## PART 10 — COMMON MISTAKES (and how to avoid them)

These are the high-frequency failure modes. Most "my model is blurry / off-prompt / OOMing" reports
trace back to one of these — check here before deep debugging.

```
MISTAKE 1: Training in pixel space for large images
  FIX: Always use latent diffusion (VAE encoder first).  RULE: resolution > 128×128 → latent space.

MISTAKE 2: Linear noise schedule for high resolution
  FIX: cosine (standard) or sigmoid (best for 512+) schedule for 256+ px.

MISTAKE 3: Only MSE loss for the VAE
  FIX: add perceptual (LPIPS) + adversarial loss.  Pure MSE → blurry; perceptual → sharp edges.

MISTAKE 4: Forgetting CFG during inference
  FIX: guidance_scale 5-15 for text-to-image.  EXCEPTION: flow-matching models (FLUX [schnell]) = 0.

MISTAKE 5: Attention-only LoRA targets
  FIX: include FFN modules. q,k,v,o + gate_proj/up_proj/down_proj (or ff.net.*) = complete.

MISTAKE 6: Not normalizing images to [-1, 1]
  FIX: T.Normalize([0.5,0.5,0.5],[0.5,0.5,0.5]).  Models expect [-1,1], not [0,1].

MISTAKE 7: FP32 for training large models
  FIX: BF16 mixed precision — bfloat16 is more stable than fp16 (which overflows) and 2× faster.

MISTAKE 8: No EMA during training
  FIX: keep an exponential moving average of weights (decay 0.9999). EMA weights = better at inference.

MISTAKE 9: Fixed-resolution dataset
  FIX: multi-aspect-ratio bucketing (SDXL technique). Bucket by AR → no padding → ~20% faster training.

MISTAKE 10: Evaluating only on the training distribution
  FIX: hold-out test set + out-of-distribution prompts. FID on held-out + CLIP score on diverse prompts.
```

---

_Researched June 3 2026. Sources: arxiv (DDPM/DDIM/DiT/FLUX papers), HuggingFace Diffusers docs,
Black Forest Labs FLUX repo, ICLR 2026 architecture-evolution blogpost, BentoML model guide, OpenCLIP
GitHub. Update this skill whenever a new SOTA architecture ships._
