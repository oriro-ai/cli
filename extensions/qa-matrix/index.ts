// Qa Matrix plugin entrypoint registers its Oriro integration.
import { definePluginEntry } from "oriro/plugin-sdk/plugin-entry";

export default definePluginEntry({
  id: "qa-matrix",
  name: "QA Matrix",
  description: "Matrix QA transport runner and substrate",
  register() {},
});
