// Step 4 — tests for the category resolution behind `oriro skills enable/disable <category>`.
// Persistence itself is the already-tested config mutations module; these cover the
// category-matching logic this CLI adds (case/separator-insensitive, unknown-category).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorkspaceSkillStatus } from "../skills/discovery/status.js";
import { createCanonicalFixtureSkill } from "../skills/test-support/test-helpers.js";
import type { SkillEntry } from "../skills/types.js";
import { captureEnv } from "../test-utils/env.js";
import {
  availableCategories,
  normalizeCategoryKey,
  skillsInCategory,
} from "./skills-cli.format.js";

describe("skills category resolution (enable/disable)", () => {
  let tempWorkspaceDir = "";
  let tempBundledDir = "";
  let envSnapshot: ReturnType<typeof captureEnv>;

  beforeAll(() => {
    envSnapshot = captureEnv(["ORIRO_BUNDLED_SKILLS_DIR"]);
    tempWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "oriro-cat-test-"));
    tempBundledDir = fs.mkdtempSync(path.join(os.tmpdir(), "oriro-cat-bundled-test-"));
    process.env.ORIRO_BUNDLED_SKILLS_DIR = tempBundledDir;
  });

  afterAll(() => {
    if (tempWorkspaceDir) {
      fs.rmSync(tempWorkspaceDir, { recursive: true, force: true });
    }
    if (tempBundledDir) {
      fs.rmSync(tempBundledDir, { recursive: true, force: true });
    }
    envSnapshot.restore();
  });

  const makeEntry = (category: string, name: string): SkillEntry => {
    const baseDir = path.join(tempBundledDir, category, name);
    return {
      skill: createCanonicalFixtureSkill({
        name,
        description: `${name} skill`,
        filePath: path.join(baseDir, "SKILL.md"),
        baseDir,
        source: "oriro-bundled",
      }),
      frontmatter: {},
      metadata: {},
    };
  };

  function buildReport() {
    return buildWorkspaceSkillStatus(tempWorkspaceDir, {
      managedSkillsDir: "/nonexistent",
      entries: [
        makeEntry("mental-health", "calm"),
        makeEntry("mental-health", "journal"),
        makeEntry("finance", "budget"),
      ],
    });
  }

  it("normalizeCategoryKey is case- and separator-insensitive", () => {
    expect(normalizeCategoryKey("Mental Health")).toBe("mental-health");
    expect(normalizeCategoryKey("mental_health")).toBe("mental-health");
    expect(normalizeCategoryKey("  FINANCE ")).toBe("finance");
  });

  it("availableCategories returns the distinct categories, sorted", () => {
    const report = buildReport();
    expect(availableCategories(report.skills)).toEqual(["finance", "mental-health"]);
  });

  it("skillsInCategory matches every skill in a category", () => {
    const report = buildReport();
    const matches = skillsInCategory(report.skills, "mental-health");
    expect(matches.map((s) => s.name).sort()).toEqual(["calm", "journal"]);
    // Every match carries the skillKey the toggle persists against.
    expect(matches.every((s) => typeof s.skillKey === "string" && s.skillKey.length > 0)).toBe(
      true,
    );
  });

  it("skillsInCategory accepts Title-Case / underscore spellings", () => {
    const report = buildReport();
    expect(
      skillsInCategory(report.skills, "Mental Health")
        .map((s) => s.name)
        .sort(),
    ).toEqual(["calm", "journal"]);
    expect(skillsInCategory(report.skills, "mental_health")).toHaveLength(2);
  });

  it("skillsInCategory returns nothing for an unknown category", () => {
    const report = buildReport();
    expect(skillsInCategory(report.skills, "nope")).toEqual([]);
  });
});
