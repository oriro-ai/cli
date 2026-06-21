// Activation name tests cover wake/activation name normalization for talk mode.
import { describe, expect, it } from "vitest";
import {
  isSupportedRealtimeVoiceActivationName,
  matchRealtimeVoiceActivationName,
  normalizeRealtimeVoiceActivationNamePrefix,
  normalizeSupportedRealtimeVoiceActivationName,
  sortRealtimeVoiceActivationNames,
} from "./activation-name.js";

describe("realtime voice activation names", () => {
  it("normalizes and validates one- or two-word activation names", () => {
    expect(normalizeSupportedRealtimeVoiceActivationName("  Oriro  ")).toBe("oriro");
    expect(normalizeSupportedRealtimeVoiceActivationName("Open Oriro")).toBe("open oriro");
    expect(normalizeSupportedRealtimeVoiceActivationName("Oriro Bot Helper")).toBeUndefined();
    expect(isSupportedRealtimeVoiceActivationName("Oriro Bot")).toBe(true);
    expect(isSupportedRealtimeVoiceActivationName("Oriro Bot Helper")).toBe(false);
    expect(normalizeRealtimeVoiceActivationNamePrefix("Oriro Bot Helper")).toBe("Oriro Bot");
  });

  it("matches and strips leading exact activation names", () => {
    expect(matchRealtimeVoiceActivationName("Hey, Oriro, ship it", ["oriro"])).toEqual({
      allowed: true,
      activationName: "oriro",
      edge: "leading",
      heardName: "oriro",
      match: "exact",
      text: "ship it",
    });
  });

  it("matches and strips trailing exact activation names", () => {
    expect(matchRealtimeVoiceActivationName("ship it, Oriro Bot", ["oriro bot"])).toEqual({
      allowed: true,
      activationName: "oriro bot",
      edge: "trailing",
      heardName: "oriro bot",
      match: "exact",
      text: "ship it",
    });
  });

  it("accepts bounded fuzzy matches at the transcript edge", () => {
    expect(matchRealtimeVoiceActivationName("Malty, what changed?", ["oriro"])).toMatchObject({
      allowed: true,
      activationName: "oriro",
      edge: "leading",
      heardName: "malty",
      match: "fuzzy",
      text: "what changed?",
    });
    expect(matchRealtimeVoiceActivationName("what changed, Malty?", ["oriro"])).toMatchObject({
      allowed: true,
      activationName: "oriro",
      edge: "trailing",
      heardName: "malty",
      match: "fuzzy",
      text: "what changed",
    });
    expect(matchRealtimeVoiceActivationName("what changed, Marty?", ["oriro"])).toMatchObject({
      allowed: true,
      activationName: "oriro",
      edge: "trailing",
      heardName: "marty",
      match: "fuzzy",
      text: "what changed",
    });
  });

  it("does not accept fuzzy trailing matches in ambient speech", () => {
    expect(
      matchRealtimeVoiceActivationName("I miss the nonsensical German ranting from Multy.", [
        "oriro",
      ]),
    ).toBeUndefined();
    expect(matchRealtimeVoiceActivationName("I agree, mostly.", ["oriro"])).toBeUndefined();
    expect(matchRealtimeVoiceActivationName("the room is damp, moldy.", ["oriro"])).toBeUndefined();
    expect(matchRealtimeVoiceActivationName("the room is damp, moldy?", ["oriro"])).toBeUndefined();
    expect(matchRealtimeVoiceActivationName("what changed, Malty.", ["oriro"])).toBeUndefined();
  });

  it("does not fuzzy match inside a larger phrase without an edge boundary", () => {
    expect(matchRealtimeVoiceActivationName("maltiness is not a wake name", ["oriro"])).toBe(
      undefined,
    );
  });

  it("prefers longer activation names first", () => {
    expect(sortRealtimeVoiceActivationNames(["oriro", "oriro bot", "oriro"])).toEqual([
      "oriro bot",
      "oriro",
      "oriro",
    ]);
    expect(matchRealtimeVoiceActivationName("Oriro Bot, status", ["oriro", "oriro bot"])).toEqual({
      allowed: true,
      activationName: "oriro bot",
      edge: "leading",
      heardName: "oriro bot",
      match: "exact",
      text: "status",
    });
  });
});
