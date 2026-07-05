// ORIRO onboarding — the CAPABILITY TOUR (V0.4.3). The first-run flow used to end at "Type to chat"
// and reveal NONE of the power verbs shipped in 0.3.2→0.4.0 — a user finished setup never knowing
// /plan, /agents, /imagine, /prove, `oriro serve`, sessions, /compact or `head` existed. This step
// closes that gap: a categorized reveal of what ORIRO can actually DO, a concrete first-win task, and
// an explicit pointer to /help + `oriro --help`. Pure content builder (unit-tested); the wrapper prints it.
import { accent, dim, bold } from "../ui/theme.js";

/** One tour row: a titled capability with the exact command a user types. */
interface TourItem {
  title: string;
  cmd: string;
  blurb: string;
}

// The power verbs the onboarding audit found HIDDEN — each maps to a real, shipped command.
const TOUR: TourItem[] = [
  { title: "Plan → do", cmd: "/plan <task>  →  /approve", blurb: "read-only plan first, then execute it" },
  { title: "Parallel agents", cmd: "/agents <A> | <B>", blurb: "sub-agents in isolated git worktrees" },
  { title: "Make an image", cmd: "/imagine <scene>", blurb: "keyless SVG art, saved to your folder" },
  { title: "Prove it works", cmd: "/prove [n|url] --video", blurb: "render in a real browser, save the evidence" },
  { title: "See any website", cmd: "oriro head <url> --code", blurb: "ORIRO visits it and returns code/spec/shots" },
  { title: "Never lose work", cmd: "oriro -c   ·   /sessions   ·   /undo", blurb: "resume, list, rewind — all local" },
  { title: "Free the context", cmd: "/compact   ·   /init", blurb: "summarize a long chat · seed project memory" },
  { title: "Use it in your editor", cmd: "oriro serve acp | mcp", blurb: "drive ORIRO from Zed/JetBrains, or as an MCP tool" },
  { title: "Your own on-device models", cmd: "oriro login <code>  →  oriro models pull", blurb: "download Gauss + Avila V2.4, run them locally ($0, private)" },
  { title: "Speak & 100 languages", cmd: "/voice   ·   oriro language", blurb: "talk to it; work in your own language" },
];

/** The first task we suggest a brand-new user try — a concrete, satisfying first win. */
export const FIRST_WIN = 'make me a landing page for a coffee shop, then /prove it';

/** Build the capability-tour lines (ANSI-styled). Pure — the wrapper writes these to stdout. */
export function capabilityTourLines(): string[] {
  const lines: string[] = [];
  lines.push("");
  lines.push(`  ${bold(accent("Here's what you can do"))} ${dim("— type these anytime in the chat:")}`);
  for (const t of TOUR) {
    lines.push(`    ${accent(t.cmd)}`);
    lines.push(`      ${dim(`${t.title} — ${t.blurb}`)}`);
  }
  lines.push("");
  lines.push(`  ${bold("Try this first:")}  ${accent(FIRST_WIN)}`);
  lines.push(`  ${dim("Full list anytime:")} ${accent("/help")} ${dim("in chat, or")} ${accent("oriro --help")} ${dim("in your shell.")}`);
  return lines;
}

/** The command tokens the tour must surface — used by the wrapper and asserted by the unit test so a
 *  future edit can never silently drop a power verb from the reveal again. */
export const TOUR_MUST_INCLUDE = [
  "/plan", "/approve", "/agents", "/imagine", "/prove", "oriro head",
  "oriro -c", "/sessions", "/undo", "/compact", "/init", "oriro serve",
  "oriro models pull", "/voice", "/help",
];
