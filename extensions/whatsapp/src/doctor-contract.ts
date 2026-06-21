// Whatsapp plugin module implements doctor contract behavior.
import type { ChannelDoctorConfigMutation } from "oriro/plugin-sdk/channel-contract";
import type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
import { normalizeCompatibilityConfig as normalizeCompatibilityConfigImpl } from "./doctor.js";

export function normalizeCompatibilityConfig({
  cfg,
}: {
  cfg: OriroConfig;
}): ChannelDoctorConfigMutation {
  return normalizeCompatibilityConfigImpl({ cfg });
}
