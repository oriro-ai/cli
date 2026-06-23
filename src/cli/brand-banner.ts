// ORIRO brand banner — the ring-of-O mark + multi-bright-color ORIRO wordmark.
// Matches the ORIRO logo (teal→blue→violet→magenta→pink). 24-bit truecolor when
// the terminal is rich; clean ASCII fallback otherwise. No third-party deps.

type RGB = readonly [number, number, number];

// Bright multi-color stops sampled from the ORIRO logo gradient.
const ORIRO_STOPS: ReadonlyArray<RGB> = [
  [38, 198, 188], // teal
  [56, 132, 222], // blue
  [128, 96, 222], // violet
  [196, 84, 198], // magenta
  [232, 96, 156], // pink
];

const RESET = "\x1b[0m";

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Sample the ORIRO gradient at position p in [0,1]. */
function sample(p: number): RGB {
  const clamped = p <= 0 ? 0 : p >= 1 ? 1 : p;
  const span = clamped * (ORIRO_STOPS.length - 1);
  const lo = Math.floor(span);
  const hi = Math.min(ORIRO_STOPS.length - 1, lo + 1);
  const f = span - lo;
  return [
    lerp(ORIRO_STOPS[lo][0], ORIRO_STOPS[hi][0], f),
    lerp(ORIRO_STOPS[lo][1], ORIRO_STOPS[hi][1], f),
    lerp(ORIRO_STOPS[lo][2], ORIRO_STOPS[hi][2], f),
  ];
}

function fg([r, g, b]: RGB, bold = true): string {
  return `\x1b[${bold ? "1;" : ""}38;2;${r};${g};${b}m`;
}

/** The ring-of-O mark (replaces the inherited lobster mascot). Teal head of the gradient. */
export function oriroRing(rich: boolean): string {
  return rich ? `${fg(ORIRO_STOPS[0])}◯${RESET}` : "O";
}

/** Color each character of a word along the ORIRO gradient (rich only). */
export function oriroWordmark(word = "ORIRO", rich = true): string {
  if (!rich) return word;
  const chars = [...word];
  const last = Math.max(1, chars.length - 1);
  return (
    chars.map((ch, i) => `${fg(sample(i / last))}${ch}`).join("") + RESET
  );
}

/** Compact inline brand: ring + multi-color ORIRO (for the one-line banner). */
export function oriroInlineBrand(rich: boolean): string {
  return rich ? `${oriroRing(true)} ${oriroWordmark("ORIRO", true)}` : "ORIRO";
}

// Block-letter ORIRO (5 rows) for the onboarding opening banner.
const ORIRO_BLOCK = [
  " ██████  ██████  ██ ██████   ██████ ",
  "██    ██ ██   ██ ██ ██   ██ ██    ██",
  "██    ██ ██████  ██ ██████  ██    ██",
  "██    ██ ██   ██ ██ ██   ██ ██    ██",
  " ██████  ██   ██ ██ ██   ██  ██████ ",
];

/**
 * The big ORIRO opening banner — multi-bright horizontal gradient across the
 * wordmark, with a sparkle. Rich terminals get truecolor; others get plain art.
 */
export function oriroBannerBlock(rich: boolean): string {
  if (!rich) return ORIRO_BLOCK.join("\n");
  const width = Math.max(...ORIRO_BLOCK.map((l) => l.length));
  const lines = ORIRO_BLOCK.map((line) => {
    let out = "";
    let prevKey = "";
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === " ") {
        if (prevKey) {
          out += RESET;
          prevKey = "";
        }
        out += " ";
        continue;
      }
      const [r, g, b] = sample(i / (width - 1));
      const key = `${r};${g};${b}`;
      if (key !== prevKey) {
        out += `\x1b[1;38;2;${key}m`;
        prevKey = key;
      }
      out += ch;
    }
    return out + RESET;
  });
  const sparkle = `${fg(ORIRO_STOPS[2])}✦${RESET}`;
  return `${lines.join("\n")}  ${sparkle}`;
}
