import { describe, expect, it } from "vitest";
import { computeNextBestAction, type NextBestActionInput } from "@/lib/next-best-action";

function baseInput(overrides: Partial<NextBestActionInput> = {}): NextBestActionInput {
  return {
    hasProfile: true,
    hasJob: true,
    hasFit: true,
    topGap: null,
    pendingSuggestions: 0,
    openFindings: 0,
    hasKit: true,
    followUp: null,
    ...overrides
  };
}

describe("computeNextBestAction", () => {
  it("asks for a profile first when nothing exists", () => {
    const action = computeNextBestAction(baseInput({ hasProfile: false, hasJob: false }));
    expect(action?.step).toBe("vault");
  });

  it("asks for a target job once a profile exists", () => {
    const action = computeNextBestAction(baseInput({ hasJob: false }));
    expect(action?.step).toBe("job");
  });

  it("prioritizes reviewing pending suggestions over everything after job/profile", () => {
    const action = computeNextBestAction(
      baseInput({ pendingSuggestions: 3, openFindings: 2, topGap: "Leadership", followUp: { company: "Acme", jobTitle: "Nurse" } })
    );
    expect(action?.step).toBe("tailor");
    expect(action?.title).toContain("3");
  });

  it("asks to verify open findings once suggestions are resolved", () => {
    const action = computeNextBestAction(baseInput({ openFindings: 2 }));
    expect(action?.step).toBe("verify");
    expect(action?.title).toContain("2");
  });

  it("asks to build the kit once fit exists but kit doesn't", () => {
    const action = computeNextBestAction(baseInput({ hasKit: false }));
    expect(action?.step).toBe("kit");
  });

  it("nudges toward the top gap once suggestions/findings/kit are handled", () => {
    const action = computeNextBestAction(baseInput({ topGap: "Epic EHR" }));
    expect(action?.step).toBe("vault");
    expect(action?.title).toContain("Epic EHR");
  });

  it("surfaces an overdue follow-up last", () => {
    const action = computeNextBestAction(baseInput({ followUp: { company: "Riverside Medical Center", jobTitle: "Registered Nurse" } }));
    expect(action?.step).toBe("tracker");
    expect(action?.title).toContain("Riverside Medical Center");
  });

  it("returns null when everything is caught up", () => {
    expect(computeNextBestAction(baseInput())).toBeNull();
  });
});
