# ATTRIBUTION — @oriro/head

## src/media.ts — media-type detection
Adapted from **MoonshotAI/kimi-code** (https://github.com/MoonshotAI/kimi-code), **MIT
License**, file `packages/agent-core/src/tools/support/file-type.ts`. Adapted 2026-06-20:
the image/video extension→MIME maps + the magic-byte sniffing approach, **reimplemented**
(not copied verbatim) for ORIRO Head's `detectMediaType()`. Purpose: accept any dropped
screen-recording format (mp4/mov/webm/mkv/avi/…) and send the correct MIME to the model.

## Design influence (knowledge — no code copied)
The screen-recording-input and url→code pipeline *shape* was informed by kimi-code's design:
its `read-media` tool + the `kosong` providers (`google-genai.ts`, `kimi-files.ts`) — i.e.
**detect media → send the raw media to a multimodal model → the coding agent builds**. The
Gemini provider's media encoding (`video_url` → `{ inlineData: { mimeType, data } }` base64
or `{ fileData: { fileUri, mimeType } }`) is the reference for wiring ORIRO's Gemini bridge
as the injected `watch` model. ORIRO Head implements all of this independently and
model-agnostically — the models are injected by the host; **no model and no kimi-code
runtime is bundled**.
