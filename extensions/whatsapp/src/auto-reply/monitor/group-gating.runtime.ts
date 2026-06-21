// Whatsapp plugin module implements group gating behavior.
export {
  implicitMentionKindWhen,
  resolveInboundMentionDecision,
} from "oriro/plugin-sdk/channel-mention-gating";
export { hasControlCommand } from "oriro/plugin-sdk/command-detection";
export { createChannelHistoryWindow } from "oriro/plugin-sdk/reply-history";
export { parseActivationCommand } from "oriro/plugin-sdk/group-activation";
export { normalizeE164 } from "../../text-runtime.js";
