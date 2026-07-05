// Thinking-model output filter. V2.4 emits an internal reasoning pass wrapped in <think>…</think> BEFORE
// the answer (Coder-2 2026-07-04, tokens 248068/248069). The Modal serves strip it; a raw local engine
// does NOT — so without this, on-device users would see a wall of chain-of-thought, then the answer.
//
// This mirrors the serve behavior: withhold everything up to and including the leading </think>, then
// stream only the answer that follows. It is streaming-safe — the open/close tag may arrive split across
// chunks. If the output has no <think> block at all, it passes straight through. Pure → unit-tested.

const OPEN = "<think>";
const CLOSE = "</think>";

export interface ThinkFilter {
  /** Feed a streamed chunk; returns the visible text to emit for it (may be ""). */
  push(chunk: string): string;
  /** Flush at end-of-stream; returns any remaining visible text. */
  end(): string;
}

export function thinkFilter(): ThinkFilter {
  let state: "before" | "inside" | "after" = "before";
  let buf = "";

  return {
    push(chunk: string): string {
      if (state === "after") return chunk;
      buf += chunk;

      if (state === "before") {
        const trimmed = buf.replace(/^\s+/, "");
        if (trimmed === "") return ""; // only whitespace so far — wait
        if (OPEN.startsWith(trimmed)) return ""; // buf is a prefix of "<think>" — wait for more
        if (trimmed.startsWith(OPEN)) {
          state = "inside";
          buf = trimmed.slice(OPEN.length); // drop leading whitespace + the open tag
          // fall through to the "inside" handling below
        } else {
          // No think block — emit everything and pass through from here on.
          state = "after";
          const out = buf;
          buf = "";
          return out;
        }
      }

      // state === "inside": drop everything until the closing tag arrives.
      const idx = buf.indexOf(CLOSE);
      if (idx === -1) {
        // Keep only a tail that could be a partial CLOSE spanning the next chunk; discard the rest.
        const keep = Math.min(buf.length, CLOSE.length - 1);
        buf = buf.slice(buf.length - keep);
        return "";
      }
      state = "after";
      const after = buf.slice(idx + CLOSE.length).replace(/^\s+/, ""); // answer starts after </think>
      buf = "";
      return after;
    },

    end(): string {
      // Only whitespace, or a short answer that looked like a "<think>" prefix but never became one.
      if (state === "before") {
        const out = buf;
        buf = "";
        return out;
      }
      buf = "";
      return ""; // inside-with-no-close (all reasoning) or already after → nothing more
    },
  };
}

/** Convenience: strip <think>…</think> from a complete (non-streamed) string. */
export function stripThink(text: string): string {
  const f = thinkFilter();
  return f.push(text) + f.end();
}
