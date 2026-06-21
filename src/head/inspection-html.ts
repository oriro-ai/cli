// ORIRO Inspector — visual HTML report generator (C2 / apps/web).
//
// Turns a ComparisonReport (what the head SAW) into a SELF-CONTAINED, styled HTML
// document the user can SEE in the Forge work environment (rendered in the sandboxed
// preview iframe) and download. Each crawled page becomes a "mini-browser" card whose
// body is a WIREFRAME STACK of the detected sections (so the user visualises the page's
// skeleton), with counts, size metrics, honest notes, and a gap panel.
//
// Pure function — no DOM, no network, no deps. Inline CSS only (self-contained so it
// renders identically in an <iframe srcdoc> or as a downloaded .html). All site-derived
// strings (titles, URLs, evidence) are HTML-escaped — crawled content is untrusted.

import type {
  ComparisonReport, PageStructure, DetectedSection, SectionPriority,
} from './comparison-engine.js';

const PRIORITY_COLOR: Record<SectionPriority, string> = {
  CRITICAL: '#f43f5e', // rose
  HIGH: '#f59e0b',     // amber
  MEDIUM: '#0ea5e9',   // sky
  LOW: '#64748b',      // slate
};

// A natural top-to-bottom page order so the wireframe reads like a real layout.
const SECTION_ORDER: string[] = [
  'navigation', 'hero', 'socialProof', 'stats', 'features', 'demo', 'video',
  'integrations', 'comparison', 'pricing', 'testimonials', 'faq', 'newsletter',
  'cta', 'team',
];

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; }
}

function pathOf(url: string): string {
  try { const u = new URL(url); return (u.pathname || '/') + (u.search || ''); } catch { return url; }
}

function orderedSections(sections: DetectedSection[]): DetectedSection[] {
  return [...sections].sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a.type);
    const ib = SECTION_ORDER.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function sectionBlock(s: DetectedSection): string {
  const color = PRIORITY_COLOR[s.priority];
  return `
    <div class="blk" style="border-left:4px solid ${color}">
      <div class="blk-row">
        <span class="dot" style="background:${color}"></span>
        <span class="blk-label">${esc(s.label)}</span>
        <span class="blk-pri" style="color:${color}">${esc(s.priority)}</span>
      </div>
      <code class="blk-ev">${esc(s.evidence)}</code>
    </div>`;
}

function pageCard(p: PageStructure, isTarget: boolean): string {
  const statusOk = p.ok && p.metrics.status >= 200 && p.metrics.status < 400;
  const badge = statusOk
    ? `<span class="pill pill-ok">${p.metrics.status || 200} OK</span>`
    : `<span class="pill pill-bad">${p.metrics.status || 'FAILED'}</span>`;
  const blocks = p.sections.length
    ? orderedSections(p.sections).map(sectionBlock).join('')
    : `<div class="blk-empty">No sections detected${p.note ? '' : ' (sparse / client-rendered?)'}</div>`;
  const kb = Math.round(p.metrics.htmlBytes / 1024);
  return `
    <div class="card${isTarget ? ' card-target' : ''}">
      <div class="chrome">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="addr" title="${esc(p.url)}">${esc(hostOf(p.url))}<span class="path">${esc(pathOf(p.url))}</span></span>
        ${badge}
      </div>
      ${isTarget ? '<div class="tag-you">YOUR PAGE</div>' : ''}
      <div class="title">${esc(p.title || '(untitled)')}</div>
      <div class="stack">${blocks}</div>
      <div class="meta">
        <span title="headings">H ${p.headings.length}</span>
        <span title="CTAs">CTA ${p.ctas.length}</span>
        <span title="links">↩ ${p.metrics ? p.links : 0}</span>
        <span title="images">▦ ${p.images}</span>
        <span title="video">${p.hasVideo ? '▶ video' : '▷ no video'}</span>
        <span title="page size">${kb} KB</span>
        <span title="DOM nodes">${p.metrics.domNodes} nodes</span>
        <span title="fetch time">${p.metrics.fetchMs} ms</span>
      </div>
      ${p.note ? `<div class="note">⚠ ${esc(p.note)}</div>` : ''}
    </div>`;
}

function gapsPanel(report: ComparisonReport): string {
  if (!report.missing.length && !report.advantages.length) return '';
  const missing = report.missing.map((g) => {
    const color = PRIORITY_COLOR[g.priority];
    return `<li><span class="dot" style="background:${color}"></span><b>${esc(g.label)}</b>
      <span class="gap-pri" style="color:${color}">${esc(g.priority)}</span>
      <div class="gap-rec">${esc(g.recommendation)}</div>
      <div class="gap-on">on: ${g.presentOn.map((u) => esc(hostOf(u))).join(', ')}</div></li>`;
  }).join('');
  const adv = report.advantages.map((s) => `<span class="chip">${esc(s.label)}</span>`).join('');
  return `
    <div class="gaps">
      ${report.missing.length ? `<div class="gaps-col"><h2>Missing from your page</h2><ul class="gap-list">${missing}</ul></div>` : ''}
      ${report.advantages.length ? `<div class="gaps-col"><h2>Your advantages</h2><div class="chips">${adv}</div></div>` : ''}
    </div>`;
}

/**
 * buildInspectionHtml — render a ComparisonReport as a standalone, visual HTML page.
 * Drop the string into an <iframe srcdoc> (Forge preview) or save as a .html file.
 */
export function buildInspectionHtml(report: ComparisonReport): string {
  const pages: PageStructure[] = [report.target, ...report.competitors];
  const ok = pages.filter((p) => p.ok).length;
  const cards = pages.map((p, i) => pageCard(p, i === 0)).join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ORIRO Inspector — what it saw</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#0b0b12;color:#e2e8f0;font:14px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px}
  .head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:6px}
  .head h1{font-size:20px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(90deg,#2dd4bf,#22d3ee);-webkit-background-clip:text;background-clip:text;color:transparent}
  .sub{color:#94a3b8;font-size:13px;margin-bottom:18px}
  .summary{background:#11111c;border:1px solid #1e293b;border-radius:12px;padding:12px 14px;margin-bottom:20px;color:#cbd5e1}
  .row{display:flex;gap:16px;overflow-x:auto;padding-bottom:10px}
  .card{flex:0 0 300px;background:#0f0f1a;border:1px solid #1e293b;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}
  .card-target{border-color:#2dd4bf;box-shadow:0 0 0 1px rgba(45,212,191,.25)}
  .chrome{display:flex;align-items:center;gap:8px;background:#15151f;padding:8px 10px;border-bottom:1px solid #1e293b}
  .dots{display:flex;gap:4px}.dots i{width:8px;height:8px;border-radius:50%;background:#334155;display:block}
  .addr{flex:1;font-size:11px;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
  .addr .path{color:#64748b;font-weight:400}
  .pill{font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px}
  .pill-ok{background:rgba(34,197,94,.15);color:#4ade80}.pill-bad{background:rgba(244,63,94,.15);color:#fb7185}
  .tag-you{font-size:9px;font-weight:800;letter-spacing:.08em;color:#2dd4bf;padding:6px 12px 0}
  .title{font-size:13px;font-weight:600;color:#f1f5f9;padding:8px 12px 4px}
  .stack{display:flex;flex-direction:column;gap:6px;padding:8px 12px}
  .blk{background:#13131f;border-radius:8px;padding:7px 9px}
  .blk-row{display:flex;align-items:center;gap:7px}
  .dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
  .blk-label{font-weight:600;font-size:12px;flex:1;color:#e2e8f0}
  .blk-pri{font-size:9px;font-weight:700;letter-spacing:.04em}
  .blk-ev{display:block;font-size:10px;color:#64748b;font-family:ui-monospace,monospace;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .blk-empty{color:#64748b;font-size:12px;padding:10px;text-align:center;font-style:italic}
  .meta{display:flex;flex-wrap:wrap;gap:8px;padding:8px 12px;border-top:1px solid #1e293b;color:#94a3b8;font-size:11px;margin-top:auto}
  .note{background:rgba(245,158,11,.1);color:#fbbf24;font-size:11px;padding:7px 12px;border-top:1px solid rgba(245,158,11,.2)}
  .gaps{display:flex;gap:24px;flex-wrap:wrap;margin-top:24px}
  .gaps-col{flex:1;min-width:260px}
  .gaps h2{font-size:14px;color:#f1f5f9;margin-bottom:10px}
  .gap-list{list-style:none;display:flex;flex-direction:column;gap:10px}
  .gap-list li{background:#0f0f1a;border:1px solid #1e293b;border-radius:10px;padding:10px 12px}
  .gap-list b{font-size:13px}.gap-pri{font-size:10px;font-weight:700;margin-left:6px}
  .gap-rec{color:#94a3b8;font-size:12px;margin-top:4px}.gap-on{color:#64748b;font-size:10px;margin-top:4px}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chip{background:rgba(45,212,191,.12);color:#5eead4;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:600}
  .foot{margin-top:26px;color:#475569;font-size:11px;border-top:1px solid #1e293b;padding-top:12px}
</style></head>
<body>
  <div class="head"><h1>ORIRO Inspector</h1><span class="sub">what the head saw — ${ok}/${pages.length} pages crawled</span></div>
  <div class="summary">${esc(report.summary)}</div>
  <div class="row">${cards}</div>
  ${gapsPanel(report)}
  <div class="foot">ORIRO Inspector · structural read (server-side HTML) · each block = a section the head detected, coloured by priority.</div>
</body></html>`;
}
