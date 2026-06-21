// Open Prose plugin entrypoint registers its Oriro integration.
import { definePluginEntry, type OriroPluginApi } from "./runtime-api.js";

export default definePluginEntry({
  id: "open-prose",
  name: "OpenProse",
  description: "Plugin-shipped prose skills bundle",
  register(_api: OriroPluginApi) {
    // OpenProse is delivered via plugin-shipped skills.
  },
});
