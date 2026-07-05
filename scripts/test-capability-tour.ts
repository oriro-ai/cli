// Unit test for V0.4.3 onboarding capability tour (src/onboarding/capability-tour.ts). tsx.
// Guards the regression that started this: onboarding surfacing NONE of the power verbs. If a future
// edit drops one from the reveal, this fails. Run: tsx scripts/test-capability-tour.ts
import { capabilityTourLines, TOUR_MUST_INCLUDE, FIRST_WIN } from "../src/onboarding/capability-tour.js";

let fails = 0;
function ok(cond: boolean, label: string): void {
  process.stdout.write(`${cond ? "✅" : "❌"} ${label}\n`);
  if (!cond) fails++;
}

const text = capabilityTourLines().join("\n");

// Every power verb the onboarding audit found HIDDEN must now be revealed.
for (const verb of TOUR_MUST_INCLUDE) {
  ok(text.includes(verb), `tour reveals ${verb}`);
}

// The on-device model download (the Vinay-directed capability) must be surfaced.
ok(text.includes("oriro login") && text.includes("oriro models pull"), "tour surfaces the on-device model download");

// A concrete first-win suggestion + discovery pointers.
ok(text.includes(FIRST_WIN), "tour ends with a concrete 'try this first' task");
ok(text.includes("/help") && text.includes("oriro --help"), "tour points to /help and oriro --help");

// Non-empty, multi-line, and no accidental 'coming soon' language.
ok(capabilityTourLines().length > 10, "tour is a real multi-line reveal");
ok(!/coming soon/i.test(text), "tour has no 'coming soon' language");

process.stdout.write(fails === 0 ? "\ncapability-tour: ALL PASS\n" : `\ncapability-tour: ${fails} FAILED\n`);
process.exit(fails === 0 ? 0 : 1);
