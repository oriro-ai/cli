// @oriro/head/intent — the AGENTIC trigger. Pure, no deps. The CLI orchestrator
// runs detectInspectIntent() on each user turn; when it fires, call the head with the
// extracted URLs — no slash command needed. (The /head slash command is the explicit
// fallback and can skip this by passing URLs directly.)

export interface InspectIntent {
  /** True when the user is asking the head to go look at the web. */
  isInspect: boolean;
  /** The user's own page when implied ("us"/"our") — host resolves this to the live origin. */
  targetIsSelf: boolean;
  /** The first explicit URL (the target) when no "us/our" is present. */
  target?: string;
  /** The remaining URLs (competitors / references). */
  competitors: string[];
  /** True when the user explicitly wants screenshots ("screenshot", "show me", "--shots"). */
  wantsShots: boolean;
}

// Intent phrases that mean "go see the web".
const TRIGGERS: RegExp[] = [
  /\bgo (and )?(look|check|see|visit|inspect)\b/i,
  /\binspect\b/i,
  /\bcompare\b/i,
  /\bvs\.?\b/i,
  /\bgap analysis\b/i,
  /\bcompetitive analysis\b/i,
  /\bwhat (do|does) .* have that we (don'?t|do not|lack)\b/i,
  /\b(build|make) .* like .+'s\b/i, // "build a pricing page like stripe's"
  /\blook at (this )?(url|site|page|https?:\/\/)/i,
];

const SELF = /\b(us|our|ours|my|mine|this (site|page|app))\b/i;
const SHOTS = /\bscreenshots?\b|\bshow me\b|--shots\b|\bvisual(s|ly)?\b/i;

// Match http(s) URLs and bare domains (foo.com, sub.foo.io/path). De-duped, trailing
// punctuation stripped.
const URL_RE = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s)]*)?)\b/gi;

function normalize(u: string): string {
  const t = u.replace(/[).,;]+$/, '').trim();
  if (!t) return '';
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function extractUrls(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(URL_RE)) {
    const u = normalize(m[1] ?? '');
    // Skip bare words that only matched because of a dotted abbreviation, keep real hosts.
    if (u && /\.[a-z]{2,}/i.test(u)) seen.add(u);
  }
  return [...seen];
}

/** Decide whether a user turn is an inspect request, and pull out the URLs. */
export function detectInspectIntent(text: string): InspectIntent {
  const urls = extractUrls(text);
  const phraseHit = TRIGGERS.some((re) => re.test(text));
  const isInspect = phraseHit || urls.length >= 2; // 2+ URLs alone implies a compare
  const targetIsSelf = SELF.test(text);
  const wantsShots = SHOTS.test(text);

  if (!isInspect || urls.length === 0) {
    return { isInspect: isInspect && urls.length > 0, targetIsSelf, competitors: [], wantsShots };
  }
  if (targetIsSelf) {
    // target = the user's live origin (host resolves it); all found URLs are competitors.
    return { isInspect: true, targetIsSelf: true, competitors: urls, wantsShots };
  }
  // first URL is the target, the rest are competitors.
  const [target, ...competitors] = urls;
  return { isInspect: true, targetIsSelf: false, target, competitors, wantsShots };
}
