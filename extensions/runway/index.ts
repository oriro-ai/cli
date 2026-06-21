// Runway plugin entrypoint registers its Oriro integration.
import { definePluginEntry } from "oriro/plugin-sdk/plugin-entry";
import { buildRunwayVideoGenerationProvider } from "./video-generation-provider.js";

export default definePluginEntry({
  id: "runway",
  name: "Runway Provider",
  description: "Bundled Runway video provider plugin",
  register(api) {
    api.registerVideoGenerationProvider(buildRunwayVideoGenerationProvider());
  },
});
