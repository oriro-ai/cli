// Mattermost plugin module implements doctor contract behavior.
import { createLegacyPrivateNetworkDoctorContract } from "oriro/plugin-sdk/ssrf-runtime";

const contract = createLegacyPrivateNetworkDoctorContract({
  channelKey: "mattermost",
});

export const legacyConfigRules = contract.legacyConfigRules;

export const normalizeCompatibilityConfig = contract.normalizeCompatibilityConfig;
