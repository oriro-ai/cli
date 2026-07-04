// Live race status — a tiny observable the TUI subscribes to so it can show the router NAMES
// competing in real time ("racing: pollinations · oriro-gauss · llm7 → won: oriro-gauss").
// Decoupled from the dispatch (race.ts emits; the REPL renders) so neither depends on the other's UI.
export interface RaceStatus {
  phase: "idle" | "racing" | "won" | "failed";
  racers: string[];     // the router ids dispatched this turn, in ranked order
  winner: string | null; // the router that committed first
}

type Listener = (s: RaceStatus) => void;

const listeners = new Set<Listener>();
let current: RaceStatus = { phase: "idle", racers: [], winner: null };

export function emitRaceStatus(s: RaceStatus): void {
  current = s;
  for (const l of listeners) {
    try { l(s); } catch { /* a bad listener never breaks dispatch */ }
  }
}

/** Subscribe; the listener fires immediately with the current status. Returns an unsubscribe. */
export function onRaceStatus(l: Listener): () => void {
  listeners.add(l);
  try { l(current); } catch { /* */ }
  return () => { listeners.delete(l); };
}

export function getRaceStatus(): RaceStatus {
  return current;
}
