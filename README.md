<!-- Banner: added separately by Vinay -->

# ORIRO‑Terminal - **“Head | Memory | Eyeball for AI”**

# **FREE TIER | BYOK** | **Works in 99 Languages | Live Security Gaurdian-V3 (MCP Watch)**

A terminal coder that **sees the web**, **speaks and listens in 99 languages**, **guards itself**, and can wear a **floating avatar that talks back in its own voice** — all on‑device.

---

## ⬇️ Install

ORIRO ships as a **prebuilt npm package** — no compiled binary, **no code signing ever**. Pick whichever line fits your machine:

**1. With npm / Node (already have Node ≥ 22.19):**

Install globally, then run:

```sh
npm i -g @oriro/cli
oriro
```

Or run once, no install (same result):

```sh
npx @oriro/cli
```

Both paths reach the **same** first‑run ORIRO setup.

**2. No Node? Use bun (installs its own runtime — zero Node needed):**

```sh
curl -fsSL https://bun.sh/install | bash && bun install -g @oriro/cli
```

**3. One‑line installer (auto‑detects npm or bun, downloads the prebuilt package):**

```sh
# macOS / Linux
curl -fsSL https://oriro.ai/cli/install.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://oriro.ai/cli/install.ps1 | iex
```

> None of these require code signing or a compiled binary — it's the same `oriro-<version>.tgz` prebuilt package `npm publish` produces, run on your existing JS runtime. While the repo is private, the one‑line installer reads a GitHub token from `ORIRO_GITHUB_TOKEN`, `GITHUB_TOKEN`, or `gh auth token`; after public launch no token is needed.

Then run `oriro`. First launch picks your language and turns on Guardian automatically.

---

## 🧭 ORIRO‑Head

- **Always in context;** never forgets anything; scribes everything for you locally and present the router “**REAL-TIME FOREVER**”. 
- **Goes to the URL** → crawls it in a real browser (Playwright).
- **Captures** → full‑page **screenshot** + the rendered HTML (`page.content()` — the post‑JS DOM, "what it saw").
- **Reverse‑engineers** → feeds that HTML (+ the screenshot for visual context) to the coder model → clean, working code.
- **Returns BOTH** → `{ html: <**what it saw**>, screenshot, code: <**clean reproduction**> }`.

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

A genuinely cool stack, a terminal coder that sees the web (ORIRO-Head: Crawl → Screenshot + HTML → Reverse-engineered code), Speaks/listens in 99 languages, guards itself (Guardian V3 Lite), and can wear a **floating avatar that talks back in its own voice. All on-device**.

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

As a forward integration to the base CLI terminal of the **pi‑mono** foundation inherited by **OpenClaw** and **Kimi** and, we used the same foundation and carried it forward, instead of building backward, we chose forward.

Thanks to the foundation work by **[@OpenClaw](https://github.com/openclaw)**, **[@Moonshot.AI / Kimi](https://github.com/MoonshotAI)**, **[@Claude](https://github.com/anthropics)**, and all other contributors.
