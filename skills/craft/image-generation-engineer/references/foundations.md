# Mathematical Foundations

Read this when implementing the training objective, a sampler, or debugging noisy / blurry /
off-prompt generations.

## Contents

- The core idea (one paragraph)
- Forward process (noising)
- Reverse process (denoising)
- DDIM (faster sampling, same model)
- Flow matching (FLUX/SD3 state of art)
- Classifier-free guidance (CFG)

---

## The core idea (one paragraph)

A diffusion model learns to reverse a gradual noise-corruption process. **Forward:** take a clean
image, add Gaussian noise over T timesteps until it becomes pure noise. **Reverse:** train a neural
network to predict and remove the noise one step at a time, starting from pure noise. Result:
sampling from pure noise produces new images that look real.

## Forward process (noising)

```
Given clean image x₀, add noise at timestep t:
  q(xₜ|x₀) = N(xₜ; √ᾱₜ x₀, (1-ᾱₜ)I)

Where:
  βₜ = noise schedule (linear: 0.0001 to 0.02 over T=1000 steps)
  αₜ = 1 - βₜ
  ᾱₜ = ∏αₛ for s=1..t (cumulative product)

Key insight: closed-form — can jump directly to any timestep t without computing all
intermediate steps. This makes training fast.

Implementation:
  noise = torch.randn_like(x0)
  sqrt_alphas_cumprod_t = sqrt_alphas_cumprod[t]
  sqrt_one_minus_alphas_cumprod_t = sqrt_one_minus_alphas_cumprod[t]
  xt = sqrt_alphas_cumprod_t * x0 + sqrt_one_minus_alphas_cumprod_t * noise
```

## Reverse process (denoising)

```
Learn to predict the noise ε that was added at timestep t:
  Loss = E[||ε - εθ(xₜ, t)||²]

Where εθ is the neural network (U-Net or Transformer).
At inference: start from pure noise, iteratively remove predicted noise.

Noise schedule implementations:
  Linear:   β linearly spaced 0.0001 to 0.02
  Cosine:   better for small images (DDPM paper, improved version)
  Sigmoid:  best for high-resolution images (2026 standard)
```

## DDIM (faster sampling, same model)

```
DDIM replaces stochastic sampling with deterministic:
  xₜ₋₁ = √ᾱₜ₋₁ * (xₜ - √(1-ᾱₜ)*ε_pred)/√ᾱₜ
          + √(1-ᾱₜ₋₁)*ε_pred

Key: use the SAME trained DDPM model.
Change: skip timesteps (e.g., 1000 → 50 steps).
Result: 20× faster inference, comparable quality.
Trade-off: η=0 fully deterministic, η=1 same as DDPM.
```

## Flow matching (FLUX/SD3 — 2024-2026 state of art)

```
Instead of predicting noise, learn a velocity field v(x,t):
  dx/dt = v(x,t)  [the ODE that transforms noise → image]

Loss: L = E[||v_θ(xₜ,t) - (x₁-x₀)||²]
  where x₀ = noise sample, x₁ = real image, xₜ = linear interpolation

Advantages over DDPM:
  - Straight-line trajectories (faster convergence)
  - Fewer inference steps needed (4-8 vs 50-1000)
  - Better scaling with model size
  - More stable training at large scale

FLUX.1 uses Rectified Flow = special case of flow matching
  with linear interpolation between noise and data.
```

## Classifier-free guidance (CFG)

```
Train model BOTH unconditionally and conditionally:
  ε_guided = ε_uncond + w * (ε_cond - ε_uncond)
  where w = guidance scale (7.0 typical, higher = more prompt-adherent)

In code:
  uncond_embed = text_encoder("")  # empty prompt
  cond_embed = text_encoder(prompt)
  both_latents = unet([noisy_latents] * 2, [uncond_embed, cond_embed])
  uncond_pred, cond_pred = both_latents.chunk(2)
  guided = uncond_pred + guidance_scale * (cond_pred - uncond_pred)

Dropout during training: randomly drop conditioning with p=0.1
```
