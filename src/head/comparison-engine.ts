// ORIRO Inspector — Comparison Engine (the "brain"), C2 / apps/web edition.
//
// WHAT IT DOES (matches the Inspector Comparison Engine handoff spec):
//   go out to a TARGET url + N competitor urls → extract semantic STRUCTURE
//   (15 section types) → analyze the GAP (what competitors have that you don't,
//   your advantages, parity) → produce a learnable REPORT with priority-ranked,
//   actionable recommendations.
//
// WHY THIS EDITION USES fetch + parse (not Playwright):
//   The CLI (C1 lane) runs Playwright locally for screenshots. The apps/web
//   Cloud Run image is node:20-slim with NO browser binary, so this C2 edition
//   "goes out" via a server-side fetch() of the raw HTML and detects sections by
//   markup/keyword pattern (the same pattern-detection approach the spec uses).
//   Trade-off (honest): we get full STRUCTURE + GAP + REPORT with zero browser
//   binary and zero cost; we do NOT get pixel screenshots here (the CLI adds
//   those). JS-heavy SPA pages can return thin HTML — flagged per page in `note`.
//
// CARDINAL: OR-LOCAL-ONLY / OR-FREE-FOREVER — server-side fetch only, no external
// AI API, no paid service, no key, no credential. Pure deterministic analysis.
//
// RUNTIME: server-only (Next.js route handler / Node). Uses global fetch (Node 18+).
// The browser cannot fetch cross-origin pages; call this through /api/inspector/compare.

// ─── Types (the contract — C1 mirrors these in the CLI core) ────────────────

export type SectionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SectionType =
  | 'hero' | 'navigation' | 'features' | 'pricing' | 'cta'
  | 'testimonials' | 'stats' | 'video' | 'demo' | 'socialProof'
  | 'faq' | 'integrations' | 'newsletter' | 'comparison' | 'team';

export interface DetectedSection {
  type: SectionType;
  label: string;
  priority: SectionPriority;
  /** The markup/text snippet that proves the detection (for the report). */
  evidence: string;
}

export interface PageMetrics {
  htmlBytes: number;
  domNodes: number;
  fetchMs: number;
  status: number;
}

export interface PageStructure {
  url: string;
  title: string;
  description: string;
  sections: DetectedSection[];
  headings: string[];
  ctas: string[];
  forms: number;
  links: number;
  images: number;
  hasVideo: boolean;
  metrics: PageMetrics;
  /** false when the page could not be fetched/parsed. */
  ok: boolean;
  /** Honest caveat or error (e.g. fetch failed, JS-heavy thin HTML). */
  note: string;
}

export interface Gap {
  section: SectionType;
  label: string;
  priority: SectionPriority;
  /** Which competitor URLs have this section. */
  presentOn: string[];
  recommendation: string;
}

export interface ActionItem {
  title: string;
  priority: SectionPriority;
  effort: 'S' | 'M' | 'L';
  rationale: string;
}

export interface ComparisonReport {
  target: PageStructure;
  competitors: PageStructure[];
  /** Sections one or more competitors have that the target lacks. */
  missing: Gap[];
  /** Sections the target has that NO competitor has. */
  advantages: DetectedSection[];
  /** Section types present on the target AND at least one competitor. */
  parity: SectionType[];
  actionItems: ActionItem[];
  summary: string;
}

// ─── Section catalog: 15 semantic patterns + priority ───────────────────────

interface SectionRule {
  type: SectionType;
  label: string;
  priority: SectionPriority;
  /** Regexes against the lowercased, tag-stripped page text. */
  text?: RegExp[];
  /** Regexes against the raw lowercased HTML (for tag-level signals). */
  markup?: RegExp[];
  recommend: string;
}

const SECTION_RULES: SectionRule[] = [
  {
    type: 'hero', label: 'Hero', priority: 'CRITICAL',
    markup: [/<h1[\s>]/],
    recommend: 'Add a clear above-the-fold hero — one headline that states the value + one primary CTA.',
  },
  {
    type: 'navigation', label: 'Navigation', priority: 'CRITICAL',
    markup: [/<nav[\s>]/, /role=["']navigation["']/],
    recommend: 'Add a top navigation so visitors can reach key sections.',
  },
  {
    type: 'features', label: 'Features', priority: 'CRITICAL',
    text: [/\bfeatures?\b/, /\bwhat you (?:can|get)\b/, /\bcapabilit/],
    recommend: 'Add a features section that spells out concrete capabilities, not adjectives.',
  },
  {
    type: 'pricing', label: 'Pricing', priority: 'CRITICAL',
    text: [/\bpricing\b/, /\bper month\b/, /\b\/mo\b/, /\bfree plan\b/, /\$\d/, /₹\d/, /€\d/],
    recommend: 'Add transparent pricing — a critical conversion element; even a single "Free" tier helps.',
  },
  {
    type: 'cta', label: 'Call-to-Action', priority: 'CRITICAL',
    text: [/\bget started\b/, /\bsign up\b/, /\bstart (?:free|now|building)\b/, /\btry (?:it|now|free)\b/, /\bbook a demo\b/, /\bget a demo\b/],
    recommend: 'Add a strong, repeated primary CTA ("Get started") so the next step is obvious.',
  },
  {
    type: 'testimonials', label: 'Testimonials', priority: 'HIGH',
    text: [/\btestimonial/, /\bwhat (?:our )?(?:customers|users) say\b/, /\bloved by\b/, /\breview(?:s|ed)\b/],
    recommend: 'Add 2–3 customer testimonials with names/photos to build trust.',
  },
  {
    type: 'stats', label: 'Stats / Metrics', priority: 'HIGH',
    text: [/\b\d[\d,.]*\s*[kkmm]\+?\s*(?:users|customers|developers|downloads|teams)\b/, /\b9\d(?:\.\d+)?%\b/, /\buptime\b/],
    recommend: 'Add impressive metrics ("10K+ users", "99.9% uptime") as social proof.',
  },
  {
    type: 'video', label: 'Video', priority: 'HIGH',
    markup: [/<video[\s>]/, /youtube\.com\/embed/, /player\.vimeo\.com/, /<iframe[^>]+(?:youtube|vimeo)/],
    text: [/\bwatch the (?:video|demo)\b/],
    recommend: 'Add a short explainer/demo video — it lifts conversion on landing pages.',
  },
  {
    type: 'demo', label: 'Live Demo', priority: 'HIGH',
    text: [/\btry it (?:now|live|free)\b/, /\bplayground\b/, /\binteractive demo\b/, /\blive demo\b/],
    recommend: 'Add a "try it" live demo or playground so visitors experience the product immediately.',
  },
  {
    type: 'socialProof', label: 'Social Proof', priority: 'HIGH',
    text: [/\btrusted by\b/, /\bbacked by\b/, /\bused by\b/, /\bas seen (?:in|on)\b/, /\bcustomers include\b/],
    recommend: 'Add social proof (customer/investor logos, "trusted by …") near the hero.',
  },
  {
    type: 'faq', label: 'FAQ', priority: 'MEDIUM',
    text: [/\bfaq\b/, /\bfrequently asked\b/],
    markup: [/<details[\s>]/],
    recommend: 'Add an FAQ that answers the top objections before they become exits.',
  },
  {
    type: 'integrations', label: 'Integrations', priority: 'MEDIUM',
    text: [/\bintegrations?\b/, /\bworks with\b/, /\bconnect your\b/],
    recommend: 'Add an integrations section showing what the product connects to.',
  },
  {
    type: 'newsletter', label: 'Newsletter / Capture', priority: 'MEDIUM',
    text: [/\bsubscribe\b/, /\bnewsletter\b/, /\bjoin (?:the )?waitlist\b/],
    markup: [/type=["']email["']/],
    recommend: 'Add an email capture (newsletter/waitlist) so non-converting visitors are not lost.',
  },
  {
    type: 'comparison', label: 'Comparison', priority: 'MEDIUM',
    text: [/\bcompare\b/, /\bcomparison\b/, /\b vs\.? \b/, /\bwhy choose\b/],
    recommend: 'Add a comparison ("us vs alternatives") to win evaluators who are shopping around.',
  },
  {
    type: 'team', label: 'Team / About', priority: 'LOW',
    text: [/\bour team\b/, /\bmeet the team\b/, /\bfounders?\b/, /\babout us\b/],
    recommend: 'Add a brief team/about section to humanize the brand.',
  },
];

const PRIORITY_RANK: Record<SectionPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_EFFORT: Record<SectionPriority, 'S' | 'M' | 'L'> = { CRITICAL: 'L', HIGH: 'M', MEDIUM: 'M', LOW: 'S' };

// ─── Fetch + parse ──────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 12000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 ORIRO-Inspector';

interface FetchResult { html: string; ms: number; status: number; ok: boolean; error: string }

async function fetchPage(url: string): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    });
    const html = await res.text();
    return { html, ms: Date.now() - start, status: res.status, ok: res.ok, error: '' };
  } catch (err) {
    return { html: '', ms: Date.now() - start, status: 0, ok: false, error: err instanceof Error ? err.message : 'fetch failed' };
  } finally {
    clearTimeout(timer);
  }
}

/** Strip tags + collapse whitespace → lowercased plain text for keyword detection. */
function toText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function firstMatch(re: RegExp, hay: string): string {
  const m = re.exec(hay);
  if (!m) return '';
  const slice = (m[0] ?? '').trim();
  return slice.length > 80 ? `${slice.slice(0, 77)}…` : slice;
}

function detectSections(rawHtmlLower: string, text: string): DetectedSection[] {
  const found: DetectedSection[] = [];
  for (const rule of SECTION_RULES) {
    let evidence = '';
    for (const re of rule.markup ?? []) {
      const hit = firstMatch(re, rawHtmlLower);
      if (hit) { evidence = hit; break; }
    }
    if (!evidence) {
      for (const re of rule.text ?? []) {
        const hit = firstMatch(re, text);
        if (hit) { evidence = hit; break; }
      }
    }
    if (evidence) found.push({ type: rule.type, label: rule.label, priority: rule.priority, evidence });
  }
  return found;
}

function extractMatches(re: RegExp, html: string, max: number): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(re)) {
    const inner = (m[1] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (inner && !out.includes(inner)) out.push(inner);
    if (out.length >= max) break;
  }
  return out;
}

const CTA_WORDS = /\b(get started|sign up|start free|start now|start building|try (?:it|now|free)|book a demo|get a demo|request access|join (?:the )?waitlist|download)\b/i;

function extractStructure(url: string, fr: FetchResult): PageStructure {
  const html = fr.html;
  const lowerHtml = html.toLowerCase();
  const text = toText(html);

  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = (titleM?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const descM = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)
    ?? /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html);
  const description = (descM?.[1] ?? '').replace(/\s+/g, ' ').trim();

  const headings = extractMatches(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, html, 12);
  const ctaAll = extractMatches(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi, html, 80);
  const ctas: string[] = [];
  for (const c of ctaAll) {
    if (CTA_WORDS.test(c) && !ctas.includes(c)) ctas.push(c);
    if (ctas.length >= 10) break;
  }

  const forms = (lowerHtml.match(/<form[\s>]/g) ?? []).length;
  const links = (lowerHtml.match(/<a[\s>]/g) ?? []).length;
  const images = (lowerHtml.match(/<img[\s>]/g) ?? []).length;
  const hasVideo = /<video[\s>]/.test(lowerHtml) || /(?:youtube\.com\/embed|player\.vimeo\.com)/.test(lowerHtml);
  const domNodes = (html.match(/<[a-z!\/]/gi) ?? []).length;

  // Honest caveat for JS-heavy pages that ship a near-empty HTML shell.
  let note = '';
  if (fr.ok && text.length < 400 && domNodes < 60) {
    note = 'Sparse HTML — likely a client-rendered (SPA) page; structure may be under-detected without a JS render.';
  }

  return {
    url,
    title,
    description,
    sections: detectSections(lowerHtml, text),
    headings,
    ctas,
    forms,
    links,
    images,
    hasVideo,
    metrics: { htmlBytes: html.length, domNodes, fetchMs: fr.ms, status: fr.status },
    ok: fr.ok && html.length > 0,
    note: fr.ok ? note : `Could not load: ${fr.error || `HTTP ${fr.status}`}`,
  };
}

// ─── Gap analysis ───────────────────────────────────────────────────────────

function ruleFor(type: SectionType): SectionRule {
  // SECTION_RULES is exhaustive over SectionType, so a match always exists.
  return SECTION_RULES.find((r) => r.type === type) ?? SECTION_RULES[0]!;
}

interface GapResult { missing: Gap[]; advantages: DetectedSection[]; parity: SectionType[] }

function analyzeGaps(target: PageStructure, competitors: PageStructure[]): GapResult {
  const targetTypes = new Set(target.sections.map((s) => s.type));

  // Which competitor URLs expose each section type.
  const compPresence = new Map<SectionType, string[]>();
  for (const comp of competitors) {
    if (!comp.ok) continue;
    for (const s of comp.sections) {
      const list = compPresence.get(s.type) ?? [];
      if (!list.includes(comp.url)) list.push(comp.url);
      compPresence.set(s.type, list);
    }
  }

  const missing: Gap[] = [];
  const parity: SectionType[] = [];
  for (const [type, presentOn] of compPresence) {
    if (targetTypes.has(type)) {
      parity.push(type);
    } else {
      const rule = ruleFor(type);
      missing.push({ section: type, label: rule.label, priority: rule.priority, presentOn, recommendation: rule.recommend });
    }
  }
  missing.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.presentOn.length - a.presentOn.length);

  // Target has it; no competitor does.
  const advantages = target.sections.filter((s) => !compPresence.has(s.type));

  return { missing, advantages, parity };
}

function generateActionItems(missing: Gap[]): ActionItem[] {
  return missing.map((g) => ({
    title: `Add a ${g.label} section`,
    priority: g.priority,
    effort: PRIORITY_EFFORT[g.priority],
    rationale: `${g.presentOn.length} of the compared page(s) have it; you don't. ${g.recommendation}`,
  }));
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; }
}

function generateSummary(target: PageStructure, competitors: PageStructure[], gaps: GapResult): string {
  const okComps = competitors.filter((c) => c.ok);
  const tName = hostOf(target.url);
  if (!target.ok) return `Could not load ${tName} (${target.note}). Nothing to compare against yet.`;
  if (okComps.length === 0) return `Loaded ${tName} (${target.sections.length} sections) but none of the comparison URLs could be loaded.`;

  const crit = gaps.missing.filter((m) => m.priority === 'CRITICAL').map((m) => m.label);
  const high = gaps.missing.filter((m) => m.priority === 'HIGH').map((m) => m.label);
  const parts: string[] = [];
  parts.push(`${tName} has ${target.sections.length} detectable sections; compared against ${okComps.length} page(s).`);
  if (gaps.missing.length === 0) {
    parts.push('No structural gaps found — you cover everything they do.');
  } else {
    parts.push(`${gaps.missing.length} gap(s) found.`);
    if (crit.length) parts.push(`Critical: ${crit.join(', ')}.`);
    if (high.length) parts.push(`High: ${high.join(', ')}.`);
  }
  if (gaps.advantages.length) parts.push(`Your edge: ${gaps.advantages.map((a) => a.label).join(', ')}.`);
  return parts.join(' ');
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export interface CompareOptions {
  targetUrl: string;
  /** One or more competitor/reference URLs (2, 3, … 30). */
  competitorUrls: string[];
}

function normalizeUrl(u: string): string {
  const t = (u || '').trim();
  if (!t) return t;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/**
 * comparePages — the main entry. Goes out to the target + every competitor URL,
 * extracts structure, analyzes the gap, and returns a learnable report.
 * N-way: pass 1..N competitor URLs.
 */
export async function comparePages(opts: CompareOptions): Promise<ComparisonReport> {
  const targetUrl = normalizeUrl(opts.targetUrl);
  const competitorUrls = (opts.competitorUrls ?? []).map(normalizeUrl).filter((u) => u.length > 0).slice(0, 30);

  const [targetFetch, ...compFetches] = await Promise.all([
    fetchPage(targetUrl),
    ...competitorUrls.map((u) => fetchPage(u)),
  ]);

  const target = extractStructure(targetUrl, targetFetch ?? { html: '', ms: 0, status: 0, ok: false, error: 'no fetch' });
  const competitors = competitorUrls.map((u, i) =>
    extractStructure(u, compFetches[i] ?? { html: '', ms: 0, status: 0, ok: false, error: 'no fetch' }),
  );

  const gaps = analyzeGaps(target, competitors);
  return {
    target,
    competitors,
    missing: gaps.missing,
    advantages: gaps.advantages,
    parity: gaps.parity,
    actionItems: generateActionItems(gaps.missing),
    summary: generateSummary(target, competitors, gaps),
  };
}
