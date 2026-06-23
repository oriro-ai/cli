import { describe, expect, it } from "vitest";
import { containsSecret, redact } from "./redact.js";

describe("scribe redact", () => {
  it("redacts provider keys, tokens, email and phone", () => {
    const samples = [
      "sk-ant-api03-AbCdEf0123456789AbCdEf0123456789",
      "sk-or-v1-0123456789abcdef0123456789abcdef0123",
      "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7",
      "gsk_0123456789abcdefABCDEF0123456789",
      "ghp_0123456789abcdefABCDEF0123456789abcd",
      "alice.smith@example.com",
      "+1 732-201-7011",
    ];
    for (const s of samples) {
      const r = redact(`prefix ${s} suffix`);
      expect(r.text).not.toContain(s);
      expect(r.text).toContain("⟨REDACTED:");
      expect(r.redactions.length).toBeGreaterThan(0);
    }
  });

  it("redacts a private key block", () => {
    const pk = "-----BEGIN PRIVATE KEY-----\nMIIBVwIBADAN\n-----END PRIVATE KEY-----";
    expect(redact(pk).text).not.toContain("MIIBVwIBADAN");
  });

  it("redacts unknown high-entropy secrets but spares normal text and git SHAs", () => {
    const secret = "Zk9Xq2Lp7Rt4Wv1Nb8Hc3Md6Ff5Gg0Aa2Bb4Cc6Dd8";
    expect(redact(secret).text).toContain("⟨REDACTED:high-entropy⟩");

    const prose = "The router should read the digest before deriving anything new.";
    expect(redact(prose).text).toBe(prose);

    const sha = "a33bb832b0abecd5a55dd5778491d604a33bb832"; // 40-char hex — not a secret
    expect(redact(sha).text).toBe(sha);
  });

  it("containsSecret detects leftover secrets", () => {
    expect(containsSecret("token sk-ant-api03-AbCdEf0123456789AbCdEf0123456789")).toBe(true);
    expect(containsSecret("just a normal sentence")).toBe(false);
  });
});
