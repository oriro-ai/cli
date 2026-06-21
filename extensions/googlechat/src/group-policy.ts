// Googlechat plugin module implements group policy behavior.
import { resolveChannelGroupRequireMention } from "oriro/plugin-sdk/channel-policy";
import type { OriroConfig } from "oriro/plugin-sdk/core";

type GoogleChatGroupContext = {
  cfg: OriroConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveGoogleChatGroupRequireMention(params: GoogleChatGroupContext): boolean {
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "googlechat",
    groupId: params.groupId,
    accountId: params.accountId,
  });
}
