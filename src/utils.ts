// ORIRO config shim — provides the donor's `../utils.js` CONFIG_DIR, routed to the ORIRO
// state dir (~/.oriro, or ORIRO_STATE_DIR). Lets folded modules keep `import { CONFIG_DIR }`
// while everything resolves through the single config shim. Zero OpenClaw footprint.
import { oriroDir } from "./config/paths.js";

export const CONFIG_DIR = oriroDir();
