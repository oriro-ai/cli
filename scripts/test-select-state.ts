// Unit test for the premium-wizard selection core (src/onboarding/tui/select-state.ts). tsx.
// Pure arithmetic — the part of the raw-mode wizard we CAN verify without a PTY.
// Run: tsx scripts/test-select-state.ts
import { SelectState } from "../src/onboarding/tui/select-state.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

const nums = Array.from({ length: 20 }, (_, i) => `item-${i + 1}`);

// basic cursor + window
{
  const s = new SelectState(nums, { height: 5 });
  ok(s.selected() === "item-1", "starts on first item");
  let w = s.window();
  ok(w.rows.length === 5 && w.cursorInWindow === 0 && w.above === 0 && w.below === 15, "initial window: 5 rows, 15 below");
  s.move(1); s.move(1);
  ok(s.selected() === "item-3" && s.window().cursorInWindow === 2, "move down keeps cursor in window");
  s.move(-100);
  ok(s.selected() === "item-1" && s.offset === 0, "move up clamps to top");
}

// scrolling: cursor past window bottom scrolls the offset
{
  const s = new SelectState(nums, { height: 5 });
  s.move(6); // to item-7
  const w = s.window();
  ok(s.selected() === "item-7", "cursor at item-7");
  ok(w.rows[w.cursorInWindow] === "item-7" && w.above > 0, "window scrolled; highlighted row is item-7");
}

// clamp at bottom, window stays full and bottom-aligned
{
  const s = new SelectState(nums, { height: 5 });
  s.move(1000);
  const w = s.window();
  ok(s.selected() === "item-20", "move down clamps to last");
  ok(w.rows.length === 5 && w.rows[w.rows.length - 1] === "item-20" && w.below === 0, "bottom-aligned full window, nothing below");
}

// filtering resets cursor + narrows
{
  const langs = [
    { name: "English", code: "en" }, { name: "Spanish", code: "es" },
    { name: "German", code: "de" }, { name: "Swedish", code: "sv" },
  ];
  const s = new SelectState(langs, {
    height: 3,
    filter: (all, q) => all.filter((l) => (l.name + l.code).toLowerCase().includes(q.toLowerCase())),
  });
  s.move(3); // to Swedish
  s.setFilter("an"); // matches Sp-an-ish + Germ-an, not English/Swedish
  ok(s.cursor === 0 && s.offset === 0, "setFilter resets cursor to top");
  ok(s.filtered().map((l) => l.code).join(",") === "es,de", "filter narrows to matches (Spanish, German)");
  ok(s.selected()?.code === "es", "selected is first match after filter");
}

// empty filter result is safe
{
  const s = new SelectState(nums, { height: 4, filter: (all, q) => all.filter((x) => x.includes(q)) });
  s.setFilter("zzz");
  const w = s.window();
  ok(s.selected() === undefined && w.rows.length === 0 && w.cursorInWindow === -1, "no matches → empty, safe window");
  s.move(1); s.move(-1);
  ok(s.selected() === undefined, "moving on an empty list never throws");
}

// height clamped to >= 1
{
  const s = new SelectState(nums, { height: 0 });
  ok(s.window().rows.length === 1, "height clamps to at least 1");
}

process.stdout.write(fails === 0 ? "\nselect-state: ALL PASS\n" : `\nselect-state: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
