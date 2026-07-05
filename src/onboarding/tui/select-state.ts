// ORIRO premium wizard — the PURE selection-state core (V0.5.0). All the arrow-key list math with
// ZERO terminal I/O, so it's fully unit-testable: filtered view, cursor clamping, a scroll window
// that always keeps the cursor visible, and type-to-filter. The TUI component (select-list.ts) is a
// thin renderer over this; the wizard never touches cursor/offset arithmetic directly.

export interface SelectWindow<T> {
  rows: T[];            // the slice currently visible
  cursorInWindow: number; // highlighted row index WITHIN rows (0-based), or -1 if the list is empty
  above: number;        // hidden items above the window (for a "↑ N more" hint)
  below: number;        // hidden items below the window
  total: number;        // filtered length
}

export interface SelectOpts<T> {
  height: number;                         // visible rows
  filter?: (all: T[], query: string) => T[]; // omit → not filterable (query ignored)
}

/** Deterministic selection state for a scrollable, optionally-filterable list. No I/O. */
export class SelectState<T> {
  private all: T[];
  private opts: SelectOpts<T>;
  filter = "";
  cursor = 0; // index into the FILTERED list
  offset = 0; // scroll window start into the FILTERED list

  constructor(all: T[], opts: SelectOpts<T>) {
    this.all = all;
    this.opts = { ...opts, height: Math.max(1, opts.height) };
  }

  filtered(): T[] {
    if (this.opts.filter && this.filter) return this.opts.filter(this.all, this.filter);
    return this.all;
  }

  /** Move the cursor by delta (clamped), then scroll the window so the cursor stays visible. */
  move(delta: number): void {
    const n = this.filtered().length;
    if (n === 0) { this.cursor = 0; this.offset = 0; return; }
    this.cursor = Math.min(Math.max(this.cursor + delta, 0), n - 1);
    const h = this.opts.height;
    if (this.cursor < this.offset) this.offset = this.cursor;
    else if (this.cursor >= this.offset + h) this.offset = this.cursor - h + 1;
    // Clamp offset so the window never runs past the end (keeps the list bottom-aligned when short).
    this.offset = Math.min(this.offset, Math.max(0, n - h));
  }

  /** Replace the filter text; reset the cursor to the top of the new result set. */
  setFilter(query: string): void {
    this.filter = query;
    this.cursor = 0;
    this.offset = 0;
  }

  /** The currently highlighted item, or undefined when the filtered list is empty. */
  selected(): T | undefined {
    return this.filtered()[this.cursor];
  }

  /** The visible slice + where the cursor sits within it + hidden counts (for scroll hints). */
  window(): SelectWindow<T> {
    const f = this.filtered();
    const h = this.opts.height;
    const rows = f.slice(this.offset, this.offset + h);
    return {
      rows,
      cursorInWindow: f.length === 0 ? -1 : this.cursor - this.offset,
      above: this.offset,
      below: Math.max(0, f.length - (this.offset + rows.length)),
      total: f.length,
    };
  }
}
