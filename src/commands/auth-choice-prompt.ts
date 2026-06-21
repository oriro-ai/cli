// Interactive grouped auth-choice prompt used by onboarding and agent setup.
import type { AuthProfileStore } from "../agents/auth-profiles/types.js";
import type { OriroConfig } from "../config/types.oriro.js";
import { sectionAuthChoiceGroups } from "../onboard/free-router-grouping.js";
import type { WizardPrompter, WizardSelectOption } from "../wizard/prompts.js";
import { buildAuthChoiceGroups } from "./auth-choice-options.js";
import type { AuthChoiceGroup } from "./auth-choice-options.static.js";
import type { AuthChoice } from "./onboard-types.js";

const BACK_VALUE = "__back";
const SECTION_HEADER_PREFIX = "__section:";

type AuthChoiceOrBack = AuthChoice | typeof BACK_VALUE;

function groupToOption(group: AuthChoiceGroup): WizardSelectOption {
  return { value: group.value, label: group.label, hint: group.hint };
}

/**
 * Flatten groups into a selectable list with FREE AI first, then Paid, then
 * BYOK — each section introduced by a non-selectable header row. FREE entries
 * carry the "(FREE)" suffix (applied by the section helper). Selecting a header
 * is a no-op the caller re-prompts on.
 */
function buildSectionedGroupOptions(groups: readonly AuthChoiceGroup[]): {
  options: WizardSelectOption[];
  orderedGroups: AuthChoiceGroup[];
} {
  const sections = sectionAuthChoiceGroups(groups);
  const options: WizardSelectOption[] = [];
  const orderedGroups: AuthChoiceGroup[] = [];
  for (const section of sections) {
    options.push({
      value: `${SECTION_HEADER_PREFIX}${section.id}`,
      label: `── ${section.label} ──`,
    });
    for (const group of section.groups) {
      options.push(groupToOption(group));
      orderedGroups.push(group);
    }
  }
  return { options, orderedGroups };
}

function isSectionHeaderValue(value: string): boolean {
  return value.startsWith(SECTION_HEADER_PREFIX);
}

/** Prompt for a provider group and auth method, with fallback flat selection when needed. */
export async function promptAuthChoiceGrouped(params: {
  prompter: WizardPrompter;
  store: AuthProfileStore;
  includeSkip: boolean;
  config?: OriroConfig;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<AuthChoice> {
  const { groups, skipOption } = buildAuthChoiceGroups(params);
  const availableGroups = groups.filter((group) => group.options.length > 0);
  const groupById = new Map(availableGroups.map((group) => [group.value, group] as const));
  // FREE AI first, then Paid, then BYOK/custom — keyless/budget users land on a
  // no-credit-card router by default and are never stuck.
  const { options: sectionedGroupOptions } = buildSectionedGroupOptions(availableGroups);

  const pickMethod = async (group: AuthChoiceGroup): Promise<AuthChoiceOrBack> => {
    if (group.options.length === 1) {
      return group.options[0].value;
    }
    return (await params.prompter.select({
      message: `${group.label} auth method`,
      options: [...group.options, { value: BACK_VALUE, label: "Back" }],
    })) as AuthChoiceOrBack;
  };

  while (true) {
    const options: WizardSelectOption[] = [...sectionedGroupOptions];
    if (skipOption) {
      options.push({ value: skipOption.value, label: skipOption.label });
    }
    const selection = await params.prompter.select({
      message: "Model/auth provider",
      options,
      searchable: true,
    });
    if (selection === "skip") {
      return "skip";
    }
    if (isSectionHeaderValue(selection)) {
      // Section headers are labels, not choices — re-prompt.
      continue;
    }
    const group = groupById.get(selection);
    if (!group || group.options.length === 0) {
      await params.prompter.note(
        "No auth methods available for that provider.",
        "Model/auth choice",
      );
      continue;
    }
    const method = await pickMethod(group);
    if (method === BACK_VALUE) {
      continue;
    }
    return method;
  }
}
