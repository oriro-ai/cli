// Verifies image-generation tool registration through the shared generation harness.
import { describeOriroGenerationToolRegistration } from "./oriro-tools.generation.test-support.js";

describeOriroGenerationToolRegistration({
  suiteName: "oriro tools image generation registration",
  toolName: "image_generate",
  toolLabel: "an image-generation tool",
});
