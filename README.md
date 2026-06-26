<!-- Banner: added separately by Vinay -->

# ORIRO‑Terminal - **“Head | Memory | Eyeball for AI”**

# **FREE · KEYLESS · BYOK** | **Works in 100 Languages | Deterministic Security Guardian V3**

A free, keyless terminal AI coder — built on the Pi agent harness (used as a library).
It **writes and runs code** from a pool of free routers, works in **your language**, **guards every action**,
can **inspect a live site's structure**, and greets you with an **avatar in its own on-device voice**.
Your language, your machine, no paid keys required.

## What's inside (this release)
- **Keyless free-router Mux** — best-router selection + invisible failover across free providers, with an on-device floor. **Never a paid key.** BYOK optional (live-validated).
- **100 languages** — pick yours at first run; the model works in English. On-device NLLB translation is an optional add-on (without it, your text passes through as-is).
- **Guardian V3 (Lite)** — a **deterministic** security gate on every tool call (default-on, fail-closed): blocks `curl|sh` remote-exec, destructive wipes, reverse shells, and env/secret exfil. No weights, no tokenizer, no download.
- **Head** — fetches a live site, detects its **sections/structure**, and reports the gaps to build from (the coder writes the code from that report).
- **Scriber (memory)** — a consent-gated local work journal, **off by default**; turns are recalled across sessions and never leave your machine.
- **323 skills** (CORE/TAIL tiered) + **multi-agent orchestration** on the free pool.
- **MCP connector catalog** (59) and **Channels** — run ORIRO from Telegram/Discord/WhatsApp with **your own** bot.
- **Avatar** — pick a face at onboarding; it greets you aloud in its paired on-device voice.

## On the roadmap (not in this release)
Full-page **screenshot → code** Head (Playwright), the **two-way voice loop** (speak + listen/STT), in-REPL **permission modes**, and **`oriro mcp`** guided setup. Today the Head is fetch/structure-based and voice is the avatar's spoken greeting.

## Install

Run it instantly — no install, works on any OS with Node ≥ 20:
```bash
npx @oriro/orirocli
```

Or install the `oriro` command globally:
```bash
npm i -g @oriro/orirocli   # then: oriro
```

Both paths reach the same first-run setup. `npx` and `npm i -g` are the supported install channels — they work on every OS with Node ≥ 20, no build step.

<details>
<summary>From source (contributors)</summary>

```bash
git clone https://github.com/oriro-ai/cli && cd cli
npm install && npm run build   # then: node dist/cli.js
```
</details>

> Built on [Pi](https://github.com/earendil-works/pi) (MIT). See `ATTRIBUTION.md` for full provenance.
