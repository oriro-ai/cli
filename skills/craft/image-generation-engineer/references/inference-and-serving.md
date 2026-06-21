# Inference Optimization, Evaluation, Serving & Model Reference

Read this when speeding up inference, evaluating image quality, or deploying text-to-image.

## Contents

- Sampler comparison
- Quantization for production (FP8 / GGUF / INT8)
- Complete inference pipeline (FLUX schnell)
- FID / CLIP / quality evaluation
- Serving stack comparison
- Modal deployment (ORIRO standard)
- Cloud Run deployment pattern
- Open-source model reference (June 2026) + licensed data sources
- HuggingFace Diffusers patterns

---

## Sampler comparison

```
Sampler      Steps  Quality  Speed   Notes
DDPM         1000   Best     Slowest Original paper
DDIM         50     98%      20×     Deterministic
PNDM         50     98%      20×     Pseudo-numerical
DPM-Solver   20     97%      50×     Best quality/speed
DPM-Solver++ 10     95%      100×    Production standard 2024
LCM          4-8    90%      250×    Distilled, needs new model
FLUX schnell 1-4    93%      500×    Adversarial distillation
```

## Quantization for production

```python
# FP8 quantization: 2× memory, 33% faster, <1% quality loss
# Best on NVIDIA H100 (native FP8 support)
from vllm import LLM
model = LLM(
    model="black-forest-labs/FLUX.1-schnell",
    quantization="fp8",
    dtype="auto",
)

# GGUF Q4_K_M: 4× memory reduction, runs on consumer GPU
# Use llama.cpp / ONNX for deployment. Quality: ~95% of FP16 baseline.

# INT8 dynamic quantization (PyTorch native)
import torch.quantization
model_int8 = torch.quantization.quantize_dynamic(
    model, {nn.Linear}, dtype=torch.qint8
)
```

## Complete inference pipeline

```python
import torch
from diffusers import FluxPipeline

def generate_image(
    prompt: str,
    negative_prompt: str = "",
    width: int = 1024,
    height: int = 1024,
    steps: int = 4,       # FLUX schnell: 1-4
    guidance: float = 0,  # FLUX schnell: 0 (no CFG needed)
    seed: int = 42,
) -> "Image":
    # Load (cache on first call)
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell",
        torch_dtype=torch.bfloat16
    ).to("cuda")

    generator = torch.Generator("cuda").manual_seed(seed)
    image = pipe(
        prompt=prompt,
        num_inference_steps=steps,
        guidance_scale=guidance,
        width=width,
        height=height,
        generator=generator,
    ).images[0]
    return image  # PIL Image

# For production serving — batched inference:
def generate_batch(prompts: list[str]) -> list["Image"]:
    return pipe(prompt=prompts, num_inference_steps=4, guidance_scale=0).images
```

## FID / quality evaluation

```
FID (Frechet Inception Distance): lower = better
  <10: excellent (matches real images)
  10-30: good (visually appealing)
  30-100: acceptable (training artefacts visible)
  >100: poor

CLIP Score: higher = better text-image alignment
  >0.3: strong   0.25-0.3: moderate   <0.25: poor

Human Preference: Elo ranking (like chess) via RLHF
  ImageReward, HPS v2, PickScore: learned preference models

Evaluate FID:
  from pytorch_fid import fid_score
  fid = fid_score.calculate_fid_given_paths(
      [real_path, generated_path], 256, 'cuda', 2048
  )
```

---

## Serving stack comparison

```
Tool         Type           Throughput  Latency  Memory  Cost
vLLM 0.17.1  Inference eng  High        Medium   Medium  Open
BentoML      Unified API    Medium      Medium   Low     Open
Modal        Serverless GPU High        Medium   N/A     Pay/req
ComfyUI      Visual UI      Medium      High     High    Open
Replicate    Hosted API     Medium      High     N/A     Pay/req
```

## Modal deployment (ORIRO standard)

```python
import modal

app = modal.App("image-gen")
image = modal.Image.debian_slim().pip_install(
    "diffusers", "torch", "transformers", "accelerate"
)

@app.function(gpu="H100", image=image, concurrency_limit=10, timeout=120)
def generate(prompt: str, steps: int = 4) -> bytes:
    from diffusers import FluxPipeline
    import torch, io
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16
    ).to("cuda")
    img = pipe(prompt, num_inference_steps=steps).images[0]
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return buf.getvalue()

# Deploy: modal deploy image_gen.py
# Call via HTTP: POST /generate {"prompt": "..."}
# Cost: ~$0.001-0.003 per image on H100. Cold start ~5s (cached), warm <1s.
```

## Cloud Run deployment pattern

```dockerfile
FROM nvcr.io/nvidia/pytorch:24.01-py3
WORKDIR /app
COPY requirements.txt .
RUN pip install diffusers transformers accelerate fastapi uvicorn
COPY app.py .
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
```

```python
# app.py — FastAPI serving
from fastapi import FastAPI
from pydantic import BaseModel
import torch, io, base64
from diffusers import FluxPipeline

app = FastAPI()
pipe = None

@app.on_event("startup")
async def load_model():
    global pipe
    pipe = FluxPipeline.from_pretrained(
        "black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16
    ).to("cuda")

class GenerateRequest(BaseModel):
    prompt: str
    steps: int = 4
    width: int = 1024
    height: int = 1024
    seed: int = 42

@app.post("/generate")
async def generate(req: GenerateRequest):
    generator = torch.Generator("cuda").manual_seed(req.seed)
    img = pipe(req.prompt, num_inference_steps=req.steps,
               width=req.width, height=req.height, generator=generator).images[0]
    buf = io.BytesIO(); img.save(buf, format="PNG")
    return {"image_b64": base64.b64encode(buf.getvalue()).decode()}
```

---

## Open-source model reference (June 2026)

```
Model          Params  License     Steps  Best For
FLUX.1 schnell 12B     Apache 2.0  1-4    Commercial, fastest
FLUX.1 dev     12B     Non-comm    4-8    Research, quality
FLUX.2         12B     Commercial  4-8    Multi-ref, consistency
FLUX.1 Kontext 12B     Non-comm    4-8    Image editing
SD3.5 Large    8B      Open        20     Text-image alignment
Z-Image-Turbo  ?       TBD         2-4    Sub-second, 16GB
Wan 2.2        14B     Apache 2.0  N/A    Video generation
```

## Training data sources (licensed)

```
LAION-5B:         5B image-text pairs, open research (CC0/BY)
LAION-Aesthetics: 12M high-quality subset
DataComp-1B:      1B curated pairs (better quality, open)
CC12M:            12M Conceptual Captions (Apache 2.0)
COCO:             330K images with captions (CC BY 4.0)
WIT:              Wikipedia images, 37M (CC BY)
JourneyDB:        Journey-style images + prompts (research)

Quality filtering pipeline:
  1. CLIP score filter (>0.25) — remove misaligned pairs
  2. Aesthetic score (LAION aesthetic predictor >5.0)
  3. NSFW filter (remove explicit content)
  4. Duplicate detection (perceptual hashing)
  5. Watermark detection + removal
```

## HuggingFace Diffusers patterns

```python
from diffusers import (
    FluxPipeline,
    StableDiffusionXLPipeline,
    ControlNetModel,
    StableDiffusionControlNetPipeline,
)

# Load LoRA weights
pipe.load_lora_weights("path/to/lora", weight_name="model.safetensors")
pipe.set_adapters(["lora"], adapter_weights=[0.8])

# Memory optimization
pipe.enable_model_cpu_offload()     # offload to CPU when not used
pipe.enable_attention_slicing()     # slice attention for less VRAM
pipe.enable_vae_slicing()           # slice VAE for large batches
pipe.enable_xformers_memory_efficient_attention()  # xformers

# Attention slicing: 30% less VRAM, 10% slower
# CPU offload: run on 8GB GPU instead of 24GB
# xformers: 20% faster on older GPUs, same quality
```
