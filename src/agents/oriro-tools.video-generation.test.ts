// Verifies video-generation tool registration through the shared generation harness.
import { describeOriroGenerationToolRegistration } from "./oriro-tools.generation.test-support.js";

describeOriroGenerationToolRegistration({
  suiteName: "oriro tools video generation registration",
  toolName: "video_generate",
  toolLabel: "a video-generation tool",
});
