// Microsoft plugin entrypoint registers its Oriro integration.
import { definePluginEntry } from "oriro/plugin-sdk/plugin-entry";
import { buildMicrosoftSpeechProvider } from "./speech-provider.js";

export default definePluginEntry({
  id: "microsoft",
  name: "Microsoft Speech",
  description: "Bundled Microsoft speech provider",
  register(api) {
    api.registerSpeechProvider(buildMicrosoftSpeechProvider());
  },
});
