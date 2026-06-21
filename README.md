<!-- Banner: added separately by Vinay -->

# ORIRO‑Terminal — Head for AI, 99 Global Languages, Live Security

A terminal coder that **sees the web**, **speaks and listens in 99 languages**, **guards itself**, and can wear a **floating avatar that talks back in its own voice** — all on‑device.

---

## 🧭 ORIRO‑Head

- **Goes to the URL** → crawls it in a real browser (Playwright).
- **Captures** → full‑page screenshot + the rendered HTML (`page.content()` — the post‑JS DOM, "what it saw").
- **Reverse‑engineers** → feeds that HTML (+ the screenshot for visual context) to the coder model → clean, working code.
- **Returns BOTH** → `{ html: <what it saw>, screenshot, code: <clean reproduction> }`.

## 🌍 Multi‑Lingual (99 Global Languages)

You can use your native language in the terminal and it will explain — in the default language — to the AI router in your terminal, to build and work along with / for you in ORIRO‑Terminal.

**Two‑way voice loop, live:** speaks (TTS) and hears (STT), with the free translate → English path for the coder.

## 🛡️ Guardian V3 Security — talk‑to‑setup MCP (Guardian companion)

By **[TranzGuard.com](https://tranzguard.com)** — financial‑industry‑grade, live agentic threat analysis: anomalous MCP payloads, crawler / Trojan / spam / 3rd‑party injection, behavioral detection.

**Guardian V3 Lite** is pure deterministic TypeScript: regex injection patterns + IOC signatures + hidden‑unicode ranges + heuristics. **No weights, no tokenizer, no download.** It's default‑on by construction — a Guardian of deterministic detectors, not a downloadable model. Speed: agentic, deep.

- **ORIRO MCP setup** — guided Q&A, no JSON: it asks name, command/URL, args, env; builds the config for you.
- **Guardian vets every server before it's saved (proven 5/5):** blocks a malicious launch (`curl | sh`, obfuscated loader, env → URL exfil), asks‑to‑trust a new clean server, allows an already‑trusted one — and remembers your "trust" so it won't re‑ask.
- **Type‑check clean.**

## 🎭 Avatar

A fun factor baked into the work: choose your own **avatar** in the terminal — it floats in your terminal and talks back in its own voice.

## ⌨️ Permission cycle / Safety

**4 modes** — cycle with **Shift+Tab**:

| Indicator | Mode             | Behavior                                      |
| --------- | ---------------- | --------------------------------------------- |
| ●         | **Manual**       | ask before acting                             |
| ✎         | **Accept Edits** | auto‑apply edits                              |
| ⏵⏵        | **Auto**         | don't‑ask‑for‑low‑risk (never _run‑anything_) |
| ▢         | **Plan**         | read‑only                                     |

- **Thinking‑cycle** → `alt+shift+t`
- **ORIRO safety floor, baked in:** even **Auto** can't run what Guardian blocks (wipes / exfil / `curl|sh`).
- Type‑check clean.

---

## Foundation & Attribution

As a forward integration to the base CLI terminal of the **pi‑mono** foundation — inherited by **OpenClaw** and **Kimi** — we used the same foundation and carried it forward, instead of building backward bottom‑up.

Thanks to the foundation work by **[@OpenClaw](https://github.com/openclaw)**, **[@Moonshot.AI / Kimi](https://github.com/MoonshotAI)**, **[@Claude](https://github.com/anthropics)**, and all other contributors.
