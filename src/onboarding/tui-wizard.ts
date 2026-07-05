// ORIRO premium onboarding — the interactive TUI WIZARD (V0.5.0). Rebuilds first-run as a guided,
// arrow-key wizard on the pi-tui toolkit (same one the chat REPL uses): a progress rail, filterable
// language picker, category→face avatar picker, panels, and the capability reveal at the end.
// It REUSES every data source + setter the linear flow uses, and writes the SAME settle markers, so
// the two paths are interchangeable and idempotent. It runs ONLY on a real TTY; the caller
// (wrapper.ts) falls back to the proven linear onboarding on non-TTY or ANY error — first-run never regresses.
import { TUI, Container, ProcessTerminal } from "@earendil-works/pi-tui";
import { stdout } from "node:process";
import { pickList, notice, confirmYesNo, promptLine } from "./tui/screen.js";
import { LANGUAGES, searchLanguages, NEURAL_VOICE_COUNT, type OriroLanguage } from "../language/languages.js";
import { setTerminalLanguage, isLanguageConfigured, getTerminalLanguage } from "../language/config.js";
import { avatarCategories, avatarsInCategory, AVATAR_COUNT, type AvatarEntry } from "../avatar/manifest.js";
import { setSelectedAvatar } from "../avatar/config.js";
import { isAvatarConfigured } from "../avatar/config.js";
import { activateGuardian } from "../guardian/index.js";
import { loadOriroSkills } from "../skills/loader.js";
import { addConnector, listConnectors } from "../connectors/connectors.js";
import { hasScribeChoice, setScribeConsent } from "../scribe/consent.js";
import { welcomeIn, markOnboarded } from "./steps.js";
import { capabilityTourLines } from "./capability-tour.js";
import { accent, dim, bold } from "../ui/theme.js";

const TOTAL = 8;

/** Run the premium wizard. Resolves when done; THROWS on any TUI failure so the caller can fall back. */
export async function runTuiWizard(): Promise<void> {
  const term = new ProcessTerminal();
  const tui = new TUI(term, true);
  const root = new Container();
  tui.addChild(root);
  tui.start();

  try {
    // 1 — Language (filterable; the first, defining choice). Skip if already set.
    if (!isLanguageConfigured()) {
      const lang = await pickList<OriroLanguage>(tui, root, {
        step: 1, total: TOTAL, title: "Language",
        subtitle: `${LANGUAGES.length} languages · ${NEURAL_VOICE_COUNT} with a built-in voice (★). You type in yours; the AI works in English for you.`,
        items: LANGUAGES, height: 12,
        label: (l) => `${l.neuralVoice ? "★" : " "} ${l.name}  (${l.code})`,
        filter: (all, q) => searchLanguages(q),
        filterHint: "type a language or ISO code",
      });
      if (lang) setTerminalLanguage(lang);
    }

    // 2 — Guardian + Head (default-on; a confirming panel, no opt-out for Guardian).
    await activateGuardian();
    await notice(tui, root, {
      step: 2, total: TOTAL, title: "Safety & sight",
      lines: [
        `  ${accent("🛡 Guardian V3")} ${dim("is on by default — it blocks wipes, exfiltration and curl|sh in every mode.")}`,
        `  ${accent("🧭 Head")} ${dim("is ready — ORIRO can visit a live site and SEE it (structure, code, screenshots).")}`,
      ],
    });

    // 3 — Avatar (category → face). Esc at either stage skips.
    if (!isAvatarConfigured()) {
      const cats = avatarCategories();
      const cat = await pickList<string>(tui, root, {
        step: 3, total: TOTAL, title: "Avatar",
        subtitle: `${AVATAR_COUNT} faces — your avatar floats in the terminal and speaks. (Esc to skip.)`,
        items: cats, height: 12, label: (c) => `${c}  (${avatarsInCategory(c).length})`,
      });
      if (cat) {
        const faces = avatarsInCategory(cat);
        const face = await pickList<AvatarEntry>(tui, root, {
          step: 3, total: TOTAL, title: `Avatar · ${cat}`,
          items: faces, height: 12, label: (a) => a.slug,
        });
        if (face) setSelectedAvatar(face, { speak: false });
      }
    }

    // 4 — Skills (all bundled + active; informational).
    const s = await loadOriroSkills();
    await notice(tui, root, {
      step: 4, total: TOTAL, title: "Skills",
      lines: [
        `  ${accent(String(s.all.length))} ${dim(`skills bundled and already active (${s.core.length} model-visible · ${s.tail.length} on-demand).`)}`,
        `  ${dim("Nothing to install. Browse with ")}${accent("oriro skills list")}${dim(" or ")}${accent("/skill")}${dim(" in chat.")}`,
      ],
    });
    markOnboarded("skills-onboarded.json", { count: s.all.length });

    // 5 — Connectors (add one by name, or skip).
    const addable = listConnectors().filter((c) => c.mcpUrl).length;
    const slug = (await promptLine(tui, root, {
      step: 5, total: TOTAL, title: "Connectors",
      lines: [
        `  ${accent(String(addable))} ${dim("MCP integrations available (e.g. ")}${accent("slack")}${dim(", ")}${accent("github")}${dim(", ")}${accent("notion")}${dim(").")}`,
        `  ${dim("Type a name to add one now, or leave empty to skip (add anytime with ")}${accent("oriro connectors add")}${dim(").")}`,
      ],
      label: "Connector name",
    })).replace(/^\/+/, "").replace(/^add\s+/i, "").trim();
    let connectorNote = `  ${dim("Skipped — add one anytime with ")}${accent("oriro connectors add <name>")}${dim(".")}`;
    if (slug && !/^connectors?$/i.test(slug)) {
      const res = addConnector(slug);
      connectorNote = res.ok
        ? `  ${accent("✓")} ${dim("added ")}${accent(slug)}${dim(" — recorded locally.")}`
        : `  ${dim(`${res.error ?? "not a known connector"} — see `)}${accent("oriro connectors list")}${dim(".")}`;
    }
    markOnboarded("connectors-onboarded.json", {});

    // 6 — Routers (the free keyless race is the default; BYOK is optional, later).
    await notice(tui, root, {
      step: 6, total: TOTAL, title: "Routers",
      lines: [
        connectorNote, "",
        `  ${dim("Free keyless routers race for every answer — no key, $0. They're active now.")}`,
        `  ${dim("Add your own key for a faster private lane anytime: ")}${accent("oriro routers add")}${dim(".")}`,
      ],
    });

    // 7 — On-device models (READY to download — no more "coming soon").
    await notice(tui, root, {
      step: 7, total: TOTAL, title: "Your own models",
      lines: [
        `  ${bold(accent("Gauss + Avila"))} ${dim("(V2.4)")} — ${accent("ready now")} ${dim("to run on THIS machine ($0, no key, private).")}`,
        `  ${dim("Download (≈8 GB each, resumable, device-locked):")}`,
        `    ${accent("1.")} ${dim("get a code on")} ${accent("oriro.app → Download → “Connect this computer”")}`,
        `    ${accent("2.")} ${accent("oriro login <code>")}  ${dim("then")}  ${accent("oriro models pull")}`,
      ],
    });
    markOnboarded("models-onboarded.json", { status: "ready", version: "2.4" });

    // 8 — Scriber consent (off by default).
    if (!hasScribeChoice()) {
      const yes = await confirmYesNo(tui, root, {
        step: 8, total: TOTAL, title: "Memory",
        def: false,
        lines: [
          `  ${dim("The Scriber keeps your work in context on THIS machine only — it never leaves it.")}`,
          `  ${dim("Redacted before disk, reversible anytime with ")}${accent("oriro scribe off")}${dim(".")}`,
        ],
      });
      setScribeConsent(yes);
    }
  } finally {
    tui.stop();
  }

  // Capability reveal + welcome — printed to normal stdout after the raw-mode screen tears down.
  stdout.write(`\n  ${bold(accent(welcomeIn(getTerminalLanguage().code)))}\n`);
  stdout.write(capabilityTourLines().join("\n") + "\n");
  stdout.write(`\n  ${accent("ORIRO is ready.")} ${dim("Just type to start — or try the line above.")}\n\n`);
}
