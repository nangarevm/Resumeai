import { describe, expect, it } from "vitest";
import { extractVerifiableClaims } from "@/lib/engines/integrity-check";

describe("extractVerifiableClaims", () => {
  it("flags numeric/count claims", () => {
    const claims = extractVerifiableClaims("Delivered 10 production apps across HRMS and logistics domains.");
    expect(claims).toHaveLength(1);
    expect(claims[0].kind).toBe("count");
  });

  it("flags percentage claims", () => {
    const claims = extractVerifiableClaims("Improved application stability by 25% through refactors.");
    expect(claims.some((c) => c.kind === "count")).toBe(true);
  });

  it("flags named SDK/API integrations", () => {
    const claims = extractVerifiableClaims("Real-time audio/video consultations via Agora SDK integration.");
    expect(claims.some((c) => c.kind === "integration")).toBe(true);
  });

  it("flags subjective strong-claim qualifiers", () => {
    const claims = extractVerifiableClaims("Built an AI-based recommendation engine for the platform.");
    expect(claims.some((c) => c.kind === "qualifier")).toBe(true);
  });

  it("does not flag plain, unremarkable lines", () => {
    const claims = extractVerifiableClaims("NAME: Alex Chen\nEMAIL: alex@example.com\nSKILLS\nPython\nSQL");
    expect(claims).toHaveLength(0);
  });

  it("deduplicates identical lines", () => {
    const text = "Delivered 10 production apps.\nDelivered 10 production apps.";
    const claims = extractVerifiableClaims(text);
    expect(claims).toHaveLength(1);
  });

  it("skips very short lines even if they contain a digit", () => {
    const claims = extractVerifiableClaims("v2.0");
    expect(claims).toHaveLength(0);
  });
});
