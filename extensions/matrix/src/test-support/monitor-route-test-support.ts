// Matrix plugin module implements monitor route test support behavior.
export {
  registerSessionBindingAdapter,
  testing,
} from "oriro/plugin-sdk/session-binding-runtime";
export { resolveAgentRoute } from "oriro/plugin-sdk/routing";
export {
  createTestRegistry,
  setActivePluginRegistry,
} from "oriro/plugin-sdk/plugin-test-runtime";
export type { OriroConfig } from "oriro/plugin-sdk/config-contracts";
