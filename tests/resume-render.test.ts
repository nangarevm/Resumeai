import { describe, expect, it } from "vitest";
import { findTemplate, parseResumeForRender, RESUME_TEMPLATES, TEMPLATE_COLORS, TEMPLATE_SKELETONS, templateColorOptionsForCategory } from "@/lib/resume-render";

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

describe("RESUME_TEMPLATES catalog", () => {
  it("generates between 250 and 400 unique templates", () => {
    expect(RESUME_TEMPLATES.length).toBeGreaterThanOrEqual(250);
    expect(RESUME_TEMPLATES.length).toBeLessThanOrEqual(400);
    const ids = RESUME_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every declared skeleton at least once", () => {
    const skeletonIdsInCatalog = new Set(RESUME_TEMPLATES.map((t) => t.skeletonId));
    for (const s of TEMPLATE_SKELETONS) {
      expect(skeletonIdsInCatalog.has(s.id)).toBe(true);
    }
  });

  it("only marks neutral skeletons as ATS recommended, and gives them grayscale-only ink shades", () => {
    const neutralSkeletonIds = new Set(TEMPLATE_SKELETONS.filter((s) => s.neutral).map((s) => s.id));
    for (const t of RESUME_TEMPLATES) {
      expect(t.atsRecommended).toBe(neutralSkeletonIds.has(t.skeletonId));
      if (t.atsRecommended) {
        // Grayscale/near-neutral ink — never one of the real palette hues.
        expect(TEMPLATE_COLORS.some((c) => c.hex === t.accent)).toBe(false);
      }
    }
  });

  it("gives every non-neutral skeleton the full color palette", () => {
    for (const s of TEMPLATE_SKELETONS.filter((sk) => !sk.neutral)) {
      const variants = RESUME_TEMPLATES.filter((t) => t.skeletonId === s.id);
      expect(variants.length).toBe(TEMPLATE_COLORS.length);
    }
  });

  it("findTemplate resolves a known id and falls back safely for an unknown one", () => {
    const known = RESUME_TEMPLATES[5];
    expect(findTemplate(known.id)).toEqual(known);
    expect(findTemplate("not-a-real-template-id")).toEqual(RESUME_TEMPLATES[0]);
  });

  it("ATS-Safe category only offers grayscale ink shades in the color picker", () => {
    const options = templateColorOptionsForCategory("ATS-Safe");
    expect(options.length).toBe(3);
    expect(options.every((c) => !TEMPLATE_COLORS.some((palette) => palette.id === c.id))).toBe(true);
  });
});
