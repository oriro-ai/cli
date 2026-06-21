// Feishu plugin module implements runtime behavior.
import type { PluginRuntime } from "oriro/plugin-sdk/core";
import { createPluginRuntimeStore } from "oriro/plugin-sdk/runtime-store";

const { setRuntime: setFeishuRuntime, getRuntime: getFeishuRuntime } =
  createPluginRuntimeStore<PluginRuntime>({
    pluginId: "feishu",
    errorMessage: "Feishu runtime not initialized",
  });
export { getFeishuRuntime, setFeishuRuntime };
