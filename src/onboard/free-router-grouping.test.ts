// Covers FREE/Paid/BYOK sectioning + (FREE) labeling of onboarding groups.
import { describe, expect, it } from "vitest";
import type { AuthChoiceGroup } from "../commands/auth-choice-options.static.js";
import {
  BYOK_SECTION_LABEL,
  FREE_AI_SECTION_LABEL,
  FREE_LABEL_SUFFIX,
  PAID_SECTION_LABEL,
  sectionAuthChoiceGroups,
  withFreeLabel,
} from "./free-router-grouping.js";

function group(value: string, label: string): AuthChoiceGroup {
  return { value, label, options: [{ value: `${value}-api-key`, label: `${label} API key` }] };
}

describe("free router grouping", () => {
  it("splits groups into FREE, Paid, and BYOK sections in order", () => {
    const sections = sectionAuthChoiceGroups([
      group("openai", "OpenAI"),
      group("groq", "Groq"),
      group("custom", "Custom Provider"),
      group("anthropic", "Anthropic"),
      group("openrouter", "OpenRouter"),
    ]);
    expect(sections.map((s) => s.id)).toEqual(["free", "paid", "byok"]);
    expect(sections[0].label).toBe(FREE_AI_SECTION_LABEL);
    expect(sections[1].label).toBe(PAID_SECTION_LABEL);
    expect(sections[2].label).toBe(BYOK_SECTION_LABEL);
  });

  it("labels every FREE entry with (FREE) and leaves Paid entries unlabeled", () => {
    const sections = sectionAuthChoiceGroups([group("groq", "Groq"), group("openai", "OpenAI")]);
    const free = sections.find((s) => s.id === "free");
    const paid = sections.find((s) => s.id === "paid");
    expect(free?.groups[0].label).toBe(`Groq${FREE_LABEL_SUFFIX}`);
    expect(paid?.groups[0].label).toBe("OpenAI");
    expect(paid?.groups[0].label).not.toContain(FREE_LABEL_SUFFIX);
  });

  it("orders FREE section with recommended-primary routers first", () => {
    const sections = sectionAuthChoiceGroups([
      group("together", "Together"),
      group("mistral", "Mistral"),
      group("openrouter", "OpenRouter"),
      group("groq", "Groq"),
    ]);
    const freeValues = sections.find((s) => s.id === "free")?.groups.map((g) => g.value);
    expect(freeValues).toEqual(["openrouter", "groq", "mistral", "together"]);
  });

  it("routes the custom group into the BYOK section, never FREE/Paid", () => {
    const sections = sectionAuthChoiceGroups([group("custom", "Custom Provider")]);
    expect(sections.map((s) => s.id)).toEqual(["byok"]);
    expect(sections[0].groups[0].value).toBe("custom");
  });

  it("omits empty sections", () => {
    const sections = sectionAuthChoiceGroups([group("groq", "Groq")]);
    expect(sections.map((s) => s.id)).toEqual(["free"]);
  });

  it("withFreeLabel is idempotent", () => {
    expect(withFreeLabel("Groq")).toBe(`Groq${FREE_LABEL_SUFFIX}`);
    expect(withFreeLabel(`Groq${FREE_LABEL_SUFFIX}`)).toBe(`Groq${FREE_LABEL_SUFFIX}`);
  });
});
