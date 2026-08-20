import { describe, expect, it } from "vitest";
import {
  unquantifiedBullets,
  isQuantifiedAnswer,
  buildQuantifiedBullet,
  readsAsQuantified,
  applyQuantifiedBulletToResume
} from "@/lib/engines/achievement-builder";
import type { BulletFormulaResult } from "@/lib/engines/bullet-formula-check";

function makeResult(bullet: string, hasResult: boolean): BulletFormulaResult {
  return { bullet, hasAction: true, hasTechnology: true, hasScope: true, hasResult, missing: hasResult ? [] : ["Result"], tip: "" };
}

describe("unquantifiedBullets", () => {
  it("returns only bullets missing a result", () => {
    const results = [makeResult("Built a dashboard", false), makeResult("Reduced latency by 40%", true)];
    expect(unquantifiedBullets(results)).toEqual(["Built a dashboard"]);
  });
});

describe("isQuantifiedAnswer", () => {
  it("requires metric, amount, and direction", () => {
    expect(isQuantifiedAnswer({ metric: "load time", amount: "40%", direction: "Reduced", scope: "" })).toBe(true);
    expect(isQuantifiedAnswer({ metric: "", amount: "40%", direction: "Reduced", scope: "" })).toBe(false);
    expect(isQuantifiedAnswer({ metric: "load time", amount: "", direction: "Reduced", scope: "" })).toBe(false);
  });
});

describe("buildQuantifiedBullet", () => {
  it("composes the candidate's own answers into the bullet, verbatim", () => {
    const result = buildQuantifiedBullet("Built a React dashboard", {
      metric: "load time",
      direction: "Reduced",
      amount: "40%",
      scope: "for 5,000 users"
    });
    expect(result).toBe("Built a React dashboard — Reduced load time by 40% for 5,000 users");
  });

  it("omits scope cleanly when not provided", () => {
    const result = buildQuantifiedBullet("Built a React dashboard", {
      metric: "load time",
      direction: "Reduced",
      amount: "40%",
      scope: ""
    });
    expect(result).toBe("Built a React dashboard — Reduced load time by 40%");
  });
});

describe("readsAsQuantified", () => {
  it("recognizes a composed bullet as quantified", () => {
    const text = buildQuantifiedBullet("Built a dashboard", { metric: "load time", direction: "Reduced", amount: "40%", scope: "" });
    expect(readsAsQuantified(text)).toBe(true);
  });
});

describe("applyQuantifiedBulletToResume", () => {
  it("replaces the exact bullet line with the quantified version", () => {
    const resume = `WORK EXPERIENCE\nAcme | Dev\n- Built a React dashboard\n- Another bullet`;
    const quantified = "Built a React dashboard — Reduced load time by 40%";
    const next = applyQuantifiedBulletToResume(resume, "Built a React dashboard", quantified);
    expect(next).toContain("- Built a React dashboard — Reduced load time by 40%");
    expect(next).toContain("- Another bullet");
  });

  it("is a no-op when the original bullet text isn't found", () => {
    const resume = `WORK EXPERIENCE\n- Something else entirely`;
    const next = applyQuantifiedBulletToResume(resume, "Not present", "Not present — Reduced x by 1%");
    expect(next).toBe(resume);
  });
});
