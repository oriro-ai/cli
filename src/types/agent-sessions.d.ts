// Declares extension points for agent session type augmentation.
export type OriroAgentSessionSkillSourceAugmentation = never;

declare module "oriro/plugin-sdk/agent-sessions" {
  interface Skill {
    // Oriro relies on the source identifier returned by skill loaders.
    source: string;
  }
}
