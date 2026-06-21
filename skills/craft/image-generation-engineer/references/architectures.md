# Architecture, VAE, and Text Conditioning

Read this when choosing or building a model backbone, a VAE, or a text-conditioning stack.

## Contents

- Architecture evolution (2020→2026) decision table
- U-Net (original, still useful)
- DiT (Diffusion Transformer — scalable replacement)
- MM-DiT (Multimodal DiT — SD3/FLUX)
- VAE / latent-space compression (why, architecture, perceptual loss)
- Text conditioning: CLIP & T5, OpenCLIP, dual encoder

---

## Architecture decision table

```
Year  Architecture         Key Innovation              Use Today?
2020  DDPM + U-Net         Denoising diffusion         Baseline only
2022  LDM (Stable Diff)    Latent space + VAE          Yes, still used
2022  DDIM sampler         50→10 steps                 Always
2023  DiT                  U-Net → Transformer         Yes (scalable)
2023  ControlNet           Structural conditioning     Yes
2024  MM-DiT (SD3)         Text+image streams          Production
2024  FLUX.1               12B flow matching           Best open 2024
2025  FLUX.2               Multi-reference, context    Best open 2025
2026  Z-Image-Turbo        Sub-second, 16GB VRAM       Fastest 2026
```

## U-Net architecture (original, still useful)

```
Encoder path: Conv → ResBlock → Attention → Downsample   [64, 128, 256, 512 channels]
Bottleneck:   ResBlock → Attention → ResBlock
Decoder path: Upsample → Skip connection → ResBlock → Attention   [512, 256, 128, 64 channels]

Key components:
  ResNet blocks: handle spatial features at each resolution
  Self-attention: global coherence at low resolution
  Cross-attention: where text conditioning enters
  Time embedding: sinusoidal → MLP → added to every ResBlock
  Skip connections: preserve spatial info across encoder→decoder

Time embedding:
  t_emb = sinusoidal_pos_embedding(t, dim=256)
  t_emb = MLP(t_emb)  # [batch, 512]
  # Add to each ResBlock output as bias

Text cross-attention:
  q = linear(spatial_features)  # from image features
  k,v = linear(text_embeddings) # from CLIP/T5
  attn = softmax(qkᵀ/√d) @ v
```

## DiT (Diffusion Transformer — scalable replacement)

```
Replace U-Net with standard Transformer blocks.
Patch the image like ViT: image → [N patches] → patch embeddings.

DiT block structure:
  LayerNorm → Self-attention → LayerNorm → FFN
  + AdaLN (adaptive layer norm conditioned on timestep+class)

AdaLN conditioning:
  c = MLP(time_emb + class_emb)
  scale, shift = chunk(linear(c), 2)
  x = scale * LayerNorm(x) + shift  # modulate then normalize

Why DiT beats U-Net:
  - Scales predictably with model size (transformers)
  - Global attention at all resolutions (not just bottleneck)
  - Works better with flow matching objectives
  - Foundation of FLUX, Sora, and all 2024+ SOTA models

DiT model sizes (parameters → FID on ImageNet 256×256):
  DiT-S: 33M → FID 68.4
  DiT-B: 130M → FID 43.5
  DiT-L: 458M → FID 23.3
  DiT-XL: 675M → FID 2.27 (state of art 2023)
```

## MM-DiT (Multimodal DiT — SD3, FLUX architecture)

```
Separate processing streams for image and text tokens.
Both streams interact through joint attention.

MM-DiT block (double stream):
  text_tokens: [B, S_text, D] from T5/CLIP
  image_tokens: [B, S_image, D] from VAE latents

  # Joint attention: text and image tokens attend to each other
  tokens = concat([text_tokens, image_tokens], dim=1)
  tokens = self_attention(tokens)
  text_tokens, image_tokens = split(tokens)

  text_tokens = FFN(text_tokens)
  image_tokens = FFN(image_tokens)

FLUX hybrid: combines MM-DiT (double stream) + single stream blocks
  Double stream: process text+image separately, cross-attend
  Single stream: merge and process together
  Result: better prompt adherence + visual quality

Scale: FLUX.1 = 12B parameters, 16 latent channels VAE
```

---

## VAE (latent-space compression)

### Why latent diffusion

```
Problem: diffusion in pixel space is expensive.
  512×512 RGB image = 786,432 dimensions
  1000 denoising steps × 786K dims = prohibitive

Solution: compress to latent space first.
  VAE encoder: 512×512×3 → 64×64×4 (8× compression)
  Diffuse in 64×64×4 space (196× cheaper)
  VAE decoder: 64×64×4 → 512×512×3

FLUX improvement: 16 latent channels (not 4)
  More information preserved → better quality
  64×64×16 still much cheaper than pixels
```

### VAE architecture

```python
class VAEEncoder(nn.Module):
    def __init__(self, in_channels=3, latent_dim=4):
        # Downsample path: 512 → 64 (8× reduction)
        self.layers = nn.Sequential(
            # Each block: Conv(stride=2) → ResBlock → ResBlock
            DownBlock(in_channels, 128),   # 512→256
            DownBlock(128, 256),            # 256→128
            DownBlock(256, 512),            # 128→64
            ResBlock(512),                  # 64
            AttentionBlock(512),            # global attention
            ResBlock(512),
        )
        self.to_mean = nn.Conv2d(512, latent_dim, 1)
        self.to_logvar = nn.Conv2d(512, latent_dim, 1)

    def forward(self, x):
        h = self.layers(x)
        mu = self.to_mean(h)
        logvar = self.to_logvar(h)
        return mu, logvar

class VAEDecoder(nn.Module):
    def __init__(self, latent_dim=4, out_channels=3):
        self.layers = nn.Sequential(
            nn.Conv2d(latent_dim, 512, 1),
            ResBlock(512),
            AttentionBlock(512),
            ResBlock(512),
            UpBlock(512, 256),   # 64→128
            UpBlock(256, 128),   # 128→256
            UpBlock(128, 64),    # 256→512
            nn.Conv2d(64, out_channels, 3, padding=1),
            nn.Tanh()
        )

# Reparameterization trick (enables backprop through sampling)
def sample_latent(mu, logvar):
    std = torch.exp(0.5 * logvar)
    eps = torch.randn_like(std)
    return mu + eps * std

# VAE Loss
def vae_loss(x, x_recon, mu, logvar):
    recon_loss = F.mse_loss(x_recon, x, reduction='sum')
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())
    return recon_loss + kl_loss
```

### Perceptual loss (required for sharp images)

```python
# Pure MSE loss produces blurry reconstructions.
# Add LPIPS (perceptual loss) + adversarial loss for sharpness.
import lpips

loss_fn_vgg = lpips.LPIPS(net='vgg')

def perceptual_loss(x, x_recon):
    return loss_fn_vgg(x, x_recon).mean()

# Full VAE training loss:
total_loss = (
    recon_loss         # MSE reconstruction
    + 0.001 * kl_loss  # KL regularization (small weight)
    + 1.0 * perceptual # LPIPS perceptual
    + 0.5 * adv_loss   # Discriminator adversarial
)
```

---

## Text conditioning (CLIP + T5)

### Text encoder comparison

```
Encoder       Dim    Seq   Params   Best For              License
CLIP ViT-L/14  768    77    428M    Speed, compatibility  MIT
CLIP BigG/14  1280    77    2.5B    Quality               Apache 2.0
T5-base        512   512    250M    Long text             Apache 2.0
T5-XXL        4096   512    11B     Nuanced language      Apache 2.0
E5-Large      1024   512    335M    Multilingual          MIT

Production choice (FLUX/SD3 style):
  CLIP-L + T5-XXL combined → best quality
  CLIP-G alone → best speed/quality ratio
  T5-base alone → good for long prompts
```

### OpenCLIP implementation

```python
import open_clip

# Load best quality text encoder
model, _, preprocess = open_clip.create_model_and_transforms(
    'ViT-bigG-14',
    pretrained='laion2b_s39b_b160k'  # Apache 2.0
)
tokenizer = open_clip.get_tokenizer('ViT-bigG-14')

def encode_text(prompts):
    tokens = tokenizer(prompts)  # [B, 77]
    with torch.no_grad(), torch.cuda.amp.autocast():
        text_features = model.encode_text(tokens)
        text_features = F.normalize(text_features, dim=-1)
    return text_features  # [B, 1280]

# For cross-attention in U-Net/DiT:
# text_features are used as keys and values, image features as queries
```

### Dual encoder (FLUX/SD3 style)

```python
# Encode with both CLIP and T5
clip_embed = clip_encoder.encode_text(prompt)   # [B, 77, 768]
t5_embed = t5_encoder.encode(prompt)             # [B, 512, 4096]

# Project to same dimension
clip_proj = nn.Linear(768, model_dim)(clip_embed)
t5_proj = nn.Linear(4096, model_dim)(t5_embed)

# Concatenate for conditioning
text_tokens = torch.cat([clip_proj, t5_proj], dim=1)  # [B, 589, D]
# Use as key/value in cross-attention within MM-DiT
```
