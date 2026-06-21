// Discord plugin module implements approval runtime behavior.
export {
  isChannelExecApprovalClientEnabledFromConfig,
  matchesApprovalRequestFilters,
  getExecApprovalReplyMetadata,
} from "oriro/plugin-sdk/approval-client-runtime";
export { resolveApprovalApprovers } from "oriro/plugin-sdk/approval-auth-runtime";
export {
  createApproverRestrictedNativeApprovalCapability,
  splitChannelApprovalCapability,
} from "oriro/plugin-sdk/approval-delivery-runtime";
export {
  createChannelApproverDmTargetResolver,
  createChannelNativeOriginTargetResolver,
} from "oriro/plugin-sdk/approval-native-runtime";
