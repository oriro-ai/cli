// ORIRO Step 6 — free routers + BYOK + Best-Router Mux. Public API.
export {
  ROUTER_CATALOG,
  selectableRouters,
  freeChatRouters,
  keylessRouters,
  routerById,
  type RouterEntry,
  type ProviderApi,
  type RouterTier,
  type RouterKind,
} from "./catalog.js";
export { buildProviderNode, registerRouterProvider, type ProviderNode } from "./register.js";
export { validateRouter, type ValidateResult } from "./validate.js";
export { loadPool, savePool } from "./pool.js";
export { applyPoolToModel, type AppliedRouting } from "./routing-apply.js";
export {
  RouterMux,
  saveMuxState,
  loadMuxState,
  healthStatePath,
  type RouterStat,
  type CallError,
} from "./mux.js";
