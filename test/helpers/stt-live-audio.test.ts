// STT live audio tests validate live speech-to-text audio fixtures.
import {
  expectOriroLiveTranscriptMarker,
  normalizeTranscriptForMatch,
  ORIRO_LIVE_TRANSCRIPT_MARKER_RE,
} from "oriro/plugin-sdk/provider-test-contracts";
import { describe, expect, it } from "vitest";

describe("normalizeTranscriptForMatch", () => {
  it("normalizes punctuation and common Oriro live transcription variants", () => {
    expect(normalizeTranscriptForMatch("Open-Oriro integration OK")).toBe("orirointegrationok");
    expect(normalizeTranscriptForMatch("Testing OpenFlaw realtime transcription")).toMatch(
      /open(?:oriro|flaw)/,
    );
    expect(normalizeTranscriptForMatch("OpenCore xAI realtime transcription")).toMatch(
      ORIRO_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expect(normalizeTranscriptForMatch("OpenCL xAI realtime transcription")).toMatch(
      ORIRO_LIVE_TRANSCRIPT_MARKER_RE,
    );
    expectOriroLiveTranscriptMarker("OpenClar integration OK");
  });
});
