// Skills CLI formatting tests cover skill listing and display formatting.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildWorkspaceSkillStatus } from "../skills/discovery/status.js";
import { createCanonicalFixtureSkill } from "../skills/test-support/test-helpers.js";
import type { SkillEntry } from "../skills/types.js";
import { captureEnv } from "../test-utils/env.js";
import { formatSkillInfo, formatSkillsCheck, formatSkillsList } from "./skills-cli.format.js";

describe("skills-cli (e2e)", () => {
  let tempWorkspaceDir = "";
  let tempBundledDir = "";
  let envSnapshot: ReturnType<typeof captureEnv>;

  beforeAll(() => {
    envSnapshot = captureEnv(["ORIRO_BUNDLED_SKILLS_DIR"]);
    tempWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), "oriro-skills-test-"));
    tempBundledDir = fs.mkdtempSync(path.join(os.tmpdir(), "oriro-bundled-skills-test-"));
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

  function createEntries(): SkillEntry[] {
    const baseDir = path.join(tempWorkspaceDir, "peekaboo");
    const filePath = path.join(baseDir, "SKILL.md");
    return [
      {
        skill: createFixtureSkill({
          name: "peekaboo",
          description: "Capture UI screenshots",
          filePath,
          baseDir,
          source: "oriro-bundled",
        }),
        frontmatter: {},
        metadata: { emoji: "📸" },
      },
    ];
  }

  it("loads bundled skills and formats them", () => {
    const entries = createEntries();
    const report = buildWorkspaceSkillStatus(tempWorkspaceDir, {
      managedSkillsDir: "/nonexistent",
      entries,
    });

    expect(report.skills).toHaveLength(1);

    const listOutput = formatSkillsList(report, {});
    expect(listOutput).toContain("Skills");

    const checkOutput = formatSkillsCheck(report, {});
    expect(checkOutput).toContain("Total:");

    const jsonOutput = formatSkillsList(report, { json: true });
    const parsed = JSON.parse(jsonOutput);
    expect(parsed).toEqual({
      workspaceDir: tempWorkspaceDir,
      managedSkillsDir: "/nonexistent",
      skills: [
        {
          name: "peekaboo",
          description: "Capture UI screenshots",
          emoji: "📸",
          eligible: true,
          disabled: false,
          blockedByAllowlist: false,
          blockedByAgentFilter: false,
          modelVisible: true,
          userInvocable: true,
          commandVisible: true,
          source: "oriro-bundled",
          bundled: true,
          missing: {
            bins: [],
            anyBins: [],
            env: [],
            config: [],
            os: [],
          },
        },
      ],
    });
  });

  it("formats info for a real bundled skill (peekaboo)", () => {
    const entries = createEntries();
    const report = buildWorkspaceSkillStatus(tempWorkspaceDir, {
      managedSkillsDir: "/nonexistent",
      entries,
    });

    const peekaboo = report.skills.find((s) => s.name === "peekaboo");
    if (!peekaboo) {
      throw new Error("peekaboo fixture skill missing");
    }

    const output = formatSkillInfo(report, "peekaboo", {});
    expect(output).toContain("peekaboo");
    expect(output).toContain("Details:");
  });

  it("groups skills under category headings with byCategory", () => {
    const makeEntry = (category: string, name: string, description: string): SkillEntry => {
      const baseDir = path.join(tempBundledDir, category, name);
      return {
        skill: createFixtureSkill({
          name,
          description,
          filePath: path.join(baseDir, "SKILL.md"),
          baseDir,
          source: "oriro-bundled",
        }),
        frontmatter: {},
        metadata: {},
      };
    };
    const report = buildWorkspaceSkillStatus(tempWorkspaceDir, {
      managedSkillsDir: "/nonexistent",
      entries: [
        makeEntry("craft", "focus", "Deep thinking protocol"),
        makeEntry("technical", "email-marketing", "Email campaigns"),
        makeEntry("craft", "design", "Design systems"),
      ],
    });

    const output = formatSkillsList(report, { byCategory: true });
    // Category folders surface as Title-Case headings.
    expect(output).toContain("Craft");
    expect(output).toContain("Technical");
    // Skills are grouped: both Craft skills appear before the Technical heading.
    expect(output.indexOf("Craft")).toBeLessThan(output.indexOf("Technical"));
    expect(output.indexOf("design")).toBeLessThan(output.indexOf("Technical"));
    expect(output.indexOf("focus")).toBeLessThan(output.indexOf("Technical"));
    // All three skills are listed.
    expect(output).toContain("email-marketing");
  });
});

function createFixtureSkill(params: {
  name: string;
  description: string;
  filePath: string;
  baseDir: string;
  source: string;
}): SkillEntry["skill"] {
  return createCanonicalFixtureSkill(params);
}
