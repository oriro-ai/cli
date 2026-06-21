// Re-sections onboarding auth-choice groups into FREE AI / Paid / BYOK sections.
//
// Consumes the provider groups the existing onboarding flow already builds
// (`buildAuthChoiceGroups`) and splits them by the curated FREE-router catalog:
//   1. "🆓 FREE AI (no credit card)" — each entry rendered with a trailing "(FREE)"
//   2. "Paid"                         — no FREE label
//   3. "BYOK / custom"               — paste-your-own-key / custom endpoint
//
// OR-FREE spirit: the FREE section comes first so a keyless / budget user lands
// on a no-credit-card router by default and is never stuck. This is presentation
// only — the selected group/auth choice flows into the existing apply + model
// probe path unchanged.
import type { AuthChoiceGroup } from "../commands/auth-choice-options.static.js";
import { compareFreeRouterGroupIds, isFreeRouterGroupId } from "./free-router-catalog.js";

export const FREE_AI_SECTION_LABEL = "🆓 FREE AI (no credit card)";
export const PAID_SECTION_LABEL = "Paid";
export const BYOK_SECTION_LABEL = "BYOK / custom";

/** Suffix appended to each FREE-section entry's label. */
export const FREE_LABEL_SUFFIX = " (FREE)";

/** Group ids treated as BYOK / custom (paste-your-own-key) rather than a router. */
const BYOK_GROUP_IDS: ReadonlySet<string> = new Set(["custom"]);

export type AuthChoiceSectionId = "free" | "paid" | "byok";

export type AuthChoiceSection = {
  id: AuthChoiceSectionId;
  label: string;
  groups: AuthChoiceGroup[];
};

function isByokGroup(group: AuthChoiceGroup): boolean {
  return BYOK_GROUP_IDS.has(group.value);
}

/** Append the "(FREE)" suffix to a group label unless it already carries it. */
export function withFreeLabel(label: string): string {
  return label.endsWith(FREE_LABEL_SUFFIX) ? label : `${label}${FREE_LABEL_SUFFIX}`;
}

/**
 * Partition auth-choice groups into FREE / Paid / BYOK sections.
 *
 * - FREE groups get the "(FREE)" suffix on their label and are ordered with
 *   recommended-primary routers first (OpenRouter, Groq, Google AI Studio,
 *   Cerebras, Mistral), then the rest by name.
 * - Paid groups keep their label as-is.
 * - BYOK/custom groups are isolated into their own section.
 *
 * Empty sections are omitted. The returned section order always places FREE
 * first, then Paid, then BYOK.
 */
export function sectionAuthChoiceGroups(groups: readonly AuthChoiceGroup[]): AuthChoiceSection[] {
  const free: AuthChoiceGroup[] = [];
  const paid: AuthChoiceGroup[] = [];
  const byok: AuthChoiceGroup[] = [];

  for (const group of groups) {
    if (isByokGroup(group)) {
      byok.push(group);
      continue;
    }
    if (isFreeRouterGroupId(group.value)) {
      free.push({ ...group, label: withFreeLabel(group.label) });
      continue;
    }
    paid.push(group);
  }

  free.sort((a, b) => compareFreeRouterGroupIds(a.value, b.value));

  const sections: AuthChoiceSection[] = [];
  if (free.length > 0) {
    sections.push({ id: "free", label: FREE_AI_SECTION_LABEL, groups: free });
  }
  if (paid.length > 0) {
    sections.push({ id: "paid", label: PAID_SECTION_LABEL, groups: paid });
  }
  if (byok.length > 0) {
    sections.push({ id: "byok", label: BYOK_SECTION_LABEL, groups: byok });
  }
  return sections;
}
