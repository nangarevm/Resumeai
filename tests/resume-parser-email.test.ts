import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";

describe("parseResume email fallback", () => {
  it("returns a real EMAIL: line when present", () => {
    const profile = parseResume("t1", "NAME: Jane Doe\nEMAIL: jane@example.com\n\nWORK EXPERIENCE\nAcme, Engineer, 2022-Present\n- Did real work");
    expect(profile.email).toBe("jane@example.com");
  });

  it("returns an empty string, not a fabricated address, when no email is present", () => {
    const profile = parseResume("t2", "NAME: John Smith\n\nWORK EXPERIENCE\nAcme, Engineer, 2022-Present\n- Did real work");
    expect(profile.email).toBe("");
  });

  it("does not collide two different no-email resumes on the same fabricated address", () => {
    const a = parseResume("row-0", "NAME: Person A\n\nWORK EXPERIENCE\nAcme, Engineer, 2022-Present\n- Did real work");
    const b = parseResume("row-1", "NAME: Person B\n\nWORK EXPERIENCE\nAcme, Engineer, 2022-Present\n- Did other real work");
    expect(a.email).toBe("");
    expect(b.email).toBe("");
    expect(a.email).toBe(b.email);
    // The old behavior distinguished them via the id-suffixed fake address;
    // callers must now treat "" as "no email on file" rather than a unique
    // identifier — verified separately in tests/duplicate-detection.test.ts.
  });
});
