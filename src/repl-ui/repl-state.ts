// UX-8 (2026-07-04): small in-session REPL state — a turn counter (for /usage) and a trace toggle
// (/trace shows tool + router activity during a turn). Module-scoped: one REPL process = one session.
let turns = 0;
let trace = false;

export function bumpTurns(): void { turns += 1; }
export function getTurns(): number { return turns; }

export function getTrace(): boolean { return trace; }
export function toggleTrace(): boolean { trace = !trace; return trace; }
