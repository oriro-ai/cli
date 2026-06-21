// Line plugin module implements group policy behavior.
import { resolveChannelGroupRequireMention } from "oriro/plugin-sdk/channel-policy";
import { resolveExactLineGroupConfigKey, type OriroConfig } from "./channel-api.js";

type LineGroupContext = {
  cfg: OriroConfig;
  accountId?: string | null;
  groupId?: string | null;
};

export function resolveLineGroupRequireMention(params: LineGroupContext): boolean {
  const exactGroupId = resolveExactLineGroupConfigKey({
    cfg: params.cfg,
    accountId: params.accountId,
    groupId: params.groupId,
  });
  return resolveChannelGroupRequireMention({
    cfg: params.cfg,
    channel: "line",
    groupId: exactGroupId ?? params.groupId,
    accountId: params.accountId,
  });
}
