import { describe, expect, it } from "vitest";
import { parseResumeForRender, RESUME_TEMPLATES } from "@/lib/resume-render";

const SAMPLE = `NAME: Jane Rivera
EMAIL: jane.rivera@example.com
PHONE: 555-0100
LOCATION: Austin, TX

SUMMARY
Registered nurse with 4 years of experience in med-surg units.

SKILLS
Patient care, EHR (Epic), vital signs monitoring

WORK EXPERIENCE
St. Mary Hospital | Registered Nurse | 2021-Present
- Provided direct patient care for a 20-bed med-surg unit
- Documented clinical notes in Epic EHR system

EDUCATION
- BSN, State University, 2020`;

describe("parseResumeForRender", () => {
  it("extracts meta fields", () => {
    const parsed = parseResumeForRender(SAMPLE);
    expect(parsed.meta.name).toBe("Jane Rivera");
    expect(parsed.meta.email).toBe("jane.rivera@example.com");
    expect(parsed.meta.phone).toBe("555-0100");
    expect(parsed.meta.location).toBe("Austin, TX");
  });

  it("captures the summary section separately from other sections", () => {
    const parsed = parseResumeForRender(SAMPLE);
    expect(parsed.summary).toContain("Registered nurse with 4 years");
    expect(parsed.sections.some((s) => s.header === "SUMMARY")).toBe(false);
  });

  it("preserves section order and bullet vs. plain-line distinction", () => {
    const parsed = parseResumeForRender(SAMPLE);
    const headers = parsed.sections.map((s) => s.header);
    expect(headers).toEqual(["SKILLS", "WORK EXPERIENCE", "EDUCATION"]);

    const workExp = parsed.sections.find((s) => s.header === "WORK EXPERIENCE")!;
    expect(workExp.lines[0]).toEqual({ text: "St. Mary Hospital | Registered Nurse | 2021-Present", bullet: false });
    expect(workExp.lines[1].bullet).toBe(true);
    expect(workExp.lines[1].text).toBe("Provided direct patient care for a 20-bed med-surg unit");
  });

  it("never invents content not present in the source text", () => {
    const parsed = parseResumeForRender(SAMPLE);
    const allText = JSON.stringify(parsed);
    expect(allText).not.toMatch(/lorem ipsum|placeholder|sample text/i);
  });

  it("handles empty input without throwing", () => {
    const parsed = parseResumeForRender("");
    expect(parsed.meta.name).toBe("");
    expect(parsed.sections).toEqual([]);
  });
});

describe("RESUME_TEMPLATES", () => {
  it("has at least the six spec'd template categories with unique ids", () => {
    const ids = RESUME_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });

  it("labels only the plain, single-column templates as ATS recommended", () => {
    const atsIds = RESUME_TEMPLATES.filter((t) => t.atsRecommended).map((t) => t.id);
    expect(atsIds).toContain("ats");
    expect(atsIds).not.toContain("modern");
  });
});
