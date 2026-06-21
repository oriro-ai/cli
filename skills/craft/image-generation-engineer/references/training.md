# Training Pipeline

Read this when training or fine-tuning anything — full pre-training, LoRA, or ControlNet.

## Contents

- Data pipeline (+ bucketized resolution)
- Training loop (complete) + proven config
- LoRA fine-tuning (fastest path to a custom model)
- ControlNet (structural conditioning)

---

## Data pipeline

```python
from torch.utils.data import Dataset
from PIL import Image
import torchvision.transforms as T

class ImageTextDataset(Dataset):
    def __init__(self, image_paths, captions, resolution=512):
        self.paths = image_paths
        self.captions = captions
        self.transform = T.Compose([
            T.Resize(resolution, interpolation=T.InterpolationMode.LANCZOS),
            T.CenterCrop(resolution),
            T.ToTensor(),
            T.Normalize([0.5], [0.5])  # → [-1, 1]
        ])

    def __getitem__(self, idx):
        image = self.transform(Image.open(self.paths[idx]).convert('RGB'))
        caption = self.captions[idx]
        return {'image': image, 'caption': caption}

# Bucketized resolution sampling (SDXL/FLUX technique)
# Group images by aspect ratio → avoid padding waste
# Resolutions: 512×512, 768×512, 512×768, 1024×1024, etc.
```

## Training loop (complete)

```python
def train_step(batch, model, vae, text_encoder,
               scheduler, optimizer, device):
    images = batch['image'].to(device)      # [B, 3, H, W]
    captions = batch['caption']

    # 1. Encode images to latent space
    with torch.no_grad():
        latents = vae.encode(images).latent_dist.sample()
        latents = latents * 0.18215  # scaling factor (SD convention)

    # 2. Encode text
    text_embeds = text_encoder(captions)  # [B, S, D]

    # 3. Sample noise and timestep
    noise = torch.randn_like(latents)
    timesteps = torch.randint(
        0, scheduler.num_train_timesteps,
        (latents.shape[0],), device=device
    )

    # 4. Add noise (forward process)
    noisy_latents = scheduler.add_noise(latents, noise, timesteps)

    # 5. Predict noise (reverse process)
    with torch.cuda.amp.autocast(dtype=torch.bfloat16):
        noise_pred = model(
            noisy_latents,
            timesteps,
            encoder_hidden_states=text_embeds
        )

    # 6. Compute loss (predict noise, not x0)
    loss = F.mse_loss(noise_pred, noise, reduction='mean')

    # 7. Backprop
    optimizer.zero_grad()
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    optimizer.step()

    return loss.item()

# Training config (proven for 512M-parameter models):
config = {
    'lr': 1e-4,            # cosine decay to 1e-5
    'warmup_steps': 500,
    'batch_size': 32,      # per GPU
    'gradient_accumulation': 4,  # effective batch 128
    'mixed_precision': 'bf16',   # bfloat16 on H100
    'ema_decay': 0.9999,         # exponential moving average
    'max_grad_norm': 1.0,
    'prediction_type': 'epsilon',  # predict noise (not v-pred or x0)
}
```

## LoRA fine-tuning (fastest path to a custom model)

```python
from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=16,                      # rank (4-64 range)
    lora_alpha=16,             # usually = r
    target_modules=[
        "to_q", "to_k", "to_v", "to_out.0",  # attention
        "ff.net.0.proj", "ff.net.2"           # FFN
    ],
    lora_dropout=0.1,
    bias="none",
)

# Apply LoRA to model
model = get_peft_model(unet, lora_config)
model.print_trainable_parameters()
# Only 0.1-1% of params are trainable → fast, cheap

# Training: only update LoRA weights
# Save: only save LoRA delta (few MB vs GB for full model)
model.save_pretrained("lora_weights/")
```

> Note (see "Common mistakes" in SKILL.md): LoRA targets must include the FFN modules, not just
> attention. Attention-only adapters underfit. q,k,v,o + the feed-forward projections = complete.

## ControlNet (structural conditioning)

```python
# Copy encoder half of U-Net → ControlNet
# Feed structural signal (depth, edge, pose) → adds to U-Net activations
# Zero convolution: trainable 1×1 conv initialized to zero
#   → starts as no-op, learns gradually

class ControlNetBlock(nn.Module):
    def __init__(self, channels):
        self.zero_conv = nn.Conv2d(channels, channels, 1)
        nn.init.zeros_(self.zero_conv.weight)
        nn.init.zeros_(self.zero_conv.bias)

    def forward(self, control_signal):
        return self.zero_conv(control_signal)

# During training: freeze original U-Net, train only ControlNet
# During inference: add ControlNet outputs to U-Net residuals
#   output = unet_output + controlnet_scale * controlnet_output
```
