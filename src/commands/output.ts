// UX-3 (2026-07-04): make list output pipeline/agent-friendly. `--output json|csv|text` + `--query`,
// modelled on cli-microsoft365's --output + --query. V0.3.7 closes the craft gap fully:
//   - `--output md` — GitHub-markdown table (drop straight into a PR/issue/doc)
//   - `--query` now speaks REAL JMESPath (the MS365 benchmark) via the jmespath package, while the
//     original lightweight grammar (`field`, `field=value`, `field=value:selectField`) still works
//     unchanged — it's tried first, so every existing script keeps its exact behaviour.
import jmespath from "jmespath";
import { configGet } from "../config/store.js";

export type OutputFormat = "text" | "json" | "csv" | "md";

export interface RenderOpts {
  output?: string;   // "text" (default) | "json" | "csv" | "md"
  query?: string;    // lightweight: "field", "field=value", "field=value:selectField" — or any JMESPath
  columns?: string[]; // column order for text/csv/md (defaults to the union of row keys)
}

function parseFormat(o?: string): OutputFormat {
  // Explicit --output wins; otherwise fall back to the user's `config set output …` default; else text.
  const f = (o ?? configGet("output") ?? "text").toLowerCase();
  if (f === "json" || f === "csv" || f === "text" || f === "md") return f;
  throw new Error(`invalid --output '${o}'. Use: text | json | csv | md`);
}

/** The original dependency-free grammar: `field`, `field=value`, `field=value:selectField`. */
const LIGHTWEIGHT_QUERY = /^[\w.-]+(=[^:]*)?(:[\w.-]+)?$/;

/**
 * Apply a query. The lightweight grammar is tried FIRST (exact back-compat for existing scripts);
 * anything else is evaluated as JMESPath (e.g. `[?keyless].id`, `[0]`, `length(@)`, `[*].{i:id}`).
 * A JMESPath error surfaces as a clean Error (commands die() on it) — never a stack trace.
 */
export function applyQuery(rows: Record<string, unknown>[], query?: string): Record<string, unknown>[] | unknown[] | unknown {
  if (!query) return rows;

  if (LIGHTWEIGHT_QUERY.test(query.trim())) {
    const [filterPart, selectField] = query.trim().split(":", 2);
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

  try {
    return jmespath.search(rows, query);
  } catch (e) {
    throw new Error(`invalid --query '${query}' — not lightweight (field / field=value[:select]) nor valid JMESPath: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function mdCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** Render rows for the chosen format. Returns the string to print (no trailing newline added here). */
export function renderList(rows: Record<string, unknown>[], opts: RenderOpts = {}): string {
  const fmt = parseFormat(opts.output);
  const raw = applyQuery(rows, opts.query);

  if (fmt === "json") return JSON.stringify(raw, null, 2);

  // JMESPath can return anything — normalize scalars/objects to a one-element list for csv/text/md.
  const queried: unknown[] = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  if (queried.length === 0) return "";
  const first = queried[0];
  const scalar = typeof first !== "object" || first === null;
  if (scalar) {
    if (fmt === "md") return (queried as unknown[]).map((v) => `- ${mdCell(v)}`).join("\n");
    return (queried as unknown[]).map((v) => (fmt === "csv" ? csvCell(v) : String(v))).join("\n");
  }

  const objs = queried as Record<string, unknown>[];
  const cols = opts.columns ?? [...new Set(objs.flatMap((r) => Object.keys(r)))];
  if (fmt === "csv") {
    return [cols.map(csvCell).join(","), ...objs.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
  }
  if (fmt === "md") {
    return [
      `| ${cols.map(mdCell).join(" | ")} |`,
      `| ${cols.map(() => "---").join(" | ")} |`,
      ...objs.map((r) => `| ${cols.map((c) => mdCell(r[c])).join(" | ")} |`),
    ].join("\n");
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
  return f === "json" || f === "csv" || f === "text" || f === "md" ? null : `invalid --output '${opts.output}' — use text | json | csv | md`;
}
