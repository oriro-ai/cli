# ORIRO Head 🧭 — the web-sighted inspector (Step 3)

ORIRO Head goes **out** to a live website, **sees** its structure (sections, CTAs,
metrics, optional full-page screenshots), **understands** the gaps versus competitor
pages, and **reports back** in two forms: a structured report the coder model reads,
and a visual HTML wireframe for you. It can also **reverse-engineer a page into working
code** (`urlToCode`) or extract frames from a screen-recording (`videoToCode`).

It is ORIRO's independent, improvised take on the web/vision-to-code capability seen in
[MoonshotAI/kimi-code](https://github.com/MoonshotAI/kimi-code) — see
[`src/head/ATTRIBUTION.md`](src/head/ATTRIBUTION.md). **No kimi-code runtime and no model
are bundled**; only the _media-type detection_ was adapted (reimplemented, not copied,
MIT) and the _pipeline shape_ was design-influence.

## How to use

```bash
oriro head <url> [competitorUrls...]      # inspect + compare (pure core, $0, no browser)
oriro head <url> --shots                  # also capture full-page screenshots (Playwright peer)
oriro head <url> --code --stack "React + Tailwind"   # reverse-engineer the page to code
oriro head <url> --json                   # emit the structured ComparisonReport
oriro head <url> --out report.html        # choose the HTML output path
# aliases: oriro inspect …   oriro orirohead …
```

Outputs are written under `~/.oriro/head/`.

## Three coverage layers (all call the same pure engine)

1. **Regex auto-trigger** — fires on clear phrasing, zero effort (`agentic.ts`).
2. **`inspect_site` tool** — the coder model calls it on its own judgment, catching what
   the regex misses (`src/head/extension.ts` → registered in
   `src/agents/embedded-agent-runner/extensions.ts`).
3. **`oriro head` command** — deterministic, user-driven (`src/cli/program/register.head.ts`).

Any failure fails safe and never breaks the turn.

## Architecture (`src/head/`)

| File                                      | Role                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `comparison-engine.ts`                    | Pure, deterministic: fetch raw HTML, detect sections, diff gaps, build report. Zero-dep, $0, no key. |
| `inspection-html.ts`                      | Render the report as a visual wireframe HTML.                                                        |
| `screenshot-flow.ts`                      | Optional **Playwright** peer: headless Chromium full-page screenshots. Local only.                   |
| `video-to-code.ts` / `media.ts`           | Screen-recording → frames (via `ffmpeg` on PATH) → media-typed input for a model.                    |
| `model.ts`                                | Adapts Head's `CoderModel` to the CLI's **host-injected** model (BYOK now, free Gauss/Avila later).  |
| `intent.ts` / `index.ts` / `extension.ts` | Intent parsing, public surface, and the built-in tool.                                               |

## Security & privacy posture (validated 2026-06-21)

- **No paid key, ever** — the coding/vision model is injected by the host from the user's
  own config (BYOK), or ORIRO's free models when they ship. None is baked in.
- **No exfiltration** — the only network egress is a GET `fetch()` of the **user-supplied
  URL** being inspected, and Playwright navigating to those same URLs. Nothing is sent out.
- **No shell injection** — `ffmpeg` is launched via `spawn` with an argument array (never a
  shell string); frames land in a scoped `mkdtemp` temp dir.
- **No dynamic code** — no `eval`, no `Function()` constructor, no obfuscated blobs.
- Optional peers (`playwright`, `ffmpeg`) are user-installed; the core needs neither.

## Known gaps

- **No unit tests yet** for `src/head/` — the deterministic `comparison-engine` is highly
  testable and should get coverage.
- `--shots` needs `npm i -D playwright && npx playwright install chromium`.
- `--code` needs a configured model (`oriro onboard`).
- A live runtime smoke (`oriro head https://example.com --json`) is the recommended final
  confidence check after a build.
