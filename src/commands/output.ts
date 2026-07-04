// UX-3 (2026-07-04): make list output pipeline/agent-friendly. `--output json|csv|text` + a lightweight
// `--query`, modelled on cli-microsoft365's --output + --query. Dependency-free (no jmespath): the query
// supports the two cases that cover ~all real use — select a field (`--query id`) and filter by equality
// (`--query keyless=true`), combinable (`--query keyless=true:id`). Commands build rows; this renders.
import { configGet } from "../config/store.js";

export type OutputFormat = "text" | "json" | "csv";

export interface RenderOpts {
  output?: string;   // "text" (default) | "json" | "csv"
  query?: string;    // "field", "field=value", or "field=value:selectField"
  columns?: string[]; // column order for text/csv (defaults to the union of row keys)
}

function parseFormat(o?: string): OutputFormat {
  // Explicit --output wins; otherwise fall back to the user's `config set output …` default; else text.
  const f = (o ?? configGet("output") ?? "text").toLowerCase();
  if (f === "json" || f === "csv" || f === "text") return f;
  throw new Error(`invalid --output '${o}'. Use: text | json | csv`);
}

/** Apply a lightweight query: optional `field=value` filter, then optional `:selectField` projection. */
export function applyQuery(rows: Record<string, unknown>[], query?: string): Record<string, unknown>[] | unknown[] {
  if (!query) return rows;
  const [filterPart, selectField] = query.split(":", 2);
  let out = rows;
  const fp = filterPart ?? "";
  if (fp.includes("=")) {
    const [field, value] = fp.split("=", 2);
    out = rows.filter((r) => String(r[field as string] ?? "") === value);
  } else if (fp && !selectField) {
    // bare `field` with no `=` and no `:` → treat as a projection of that one field
    return rows.map((r) => r[fp]);
  }
  if (selectField) return out.map((r) => r[selectField]);
  return out;
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Render rows for the chosen format. Returns the string to print (no trailing newline added here). */
export function renderList(rows: Record<string, unknown>[], opts: RenderOpts = {}): string {
  const fmt = parseFormat(opts.output);
  const queried = applyQuery(rows, opts.query);

  if (fmt === "json") return JSON.stringify(queried, null, 2);

  // For csv/text on a projected (scalar) list, one value per line.
  if (!Array.isArray(queried) || queried.length === 0) return "";
  const first = queried[0];
  const scalar = typeof first !== "object" || first === null;
  if (scalar) return (queried as unknown[]).map((v) => (fmt === "csv" ? csvCell(v) : String(v))).join("\n");

  const objs = queried as Record<string, unknown>[];
  const cols = opts.columns ?? [...new Set(objs.flatMap((r) => Object.keys(r)))];
  if (fmt === "csv") {
    return [cols.map(csvCell).join(","), ...objs.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
  }
  // text: fixed-width aligned columns
  const widths = cols.map((c) => Math.max(c.length, ...objs.map((r) => String(r[c] ?? "").length)));
  const line = (cells: string[]): string => cells.map((s, i) => s.padEnd(widths[i] ?? 0)).join("  ").trimEnd();
  return [line(cols), ...objs.map((r) => line(cols.map((c) => String(r[c] ?? ""))))].join("\n");
}

/** True when the caller asked for a machine format (so a command can skip its pretty/coloured path). */
export function isMachineOutput(opts: RenderOpts): boolean {
  return parseFormat(opts.output) !== "text";
}

/**
 * Validate --output WITHOUT throwing — returns a clean one-line error, or null if valid. Commands call
 * this first and die() on the message, so a bad value never surfaces the raw parseFormat stack trace
 * to the top-level handler (QA D1). Honors the configured default the same way parseFormat does.
 */
export function outputError(opts: RenderOpts): string | null {
  const f = (opts.output ?? configGet("output") ?? "text").toLowerCase();
  return f === "json" || f === "csv" || f === "text" ? null : `invalid --output '${opts.output}' — use text | json | csv`;
}
