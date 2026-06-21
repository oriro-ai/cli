// Imessage API module exposes the plugin public contract.
import { formatTrimmedAllowFromEntries } from "oriro/plugin-sdk/channel-config-helpers";
import { PAIRING_APPROVED_MESSAGE } from "oriro/plugin-sdk/channel-status";
import {
  DEFAULT_ACCOUNT_ID,
  getChatChannelMeta,
  type ChannelPlugin,
} from "oriro/plugin-sdk/core";
import { resolveChannelMediaMaxBytes } from "oriro/plugin-sdk/media-runtime";
import { collectStatusIssuesFromLastError } from "oriro/plugin-sdk/status-helpers";
import { normalizeIMessageMessagingTarget } from "./normalize.js";
export { chunkTextForOutbound } from "oriro/plugin-sdk/text-chunking";

export {
  collectStatusIssuesFromLastError,
  DEFAULT_ACCOUNT_ID,
  formatTrimmedAllowFromEntries,
  getChatChannelMeta,
  normalizeIMessageMessagingTarget,
  PAIRING_APPROVED_MESSAGE,
  resolveChannelMediaMaxBytes,
};

export type { ChannelPlugin };
