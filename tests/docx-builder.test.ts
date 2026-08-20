import { describe, expect, it } from "vitest";
import { resumeTextToTemplatedDocxBuffer, STYLE_PROFILES } from "@/lib/export/docx-builder";
import { RESUME_TEMPLATES, TEMPLATE_SKELETONS } from "@/lib/resume-render";

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

describe("STYLE_PROFILES coverage", () => {
  it("has an explicit profile for every declared skeleton — no silent fallback", () => {
    for (const s of TEMPLATE_SKELETONS) {
      expect(STYLE_PROFILES[s.id], `missing STYLE_PROFILES entry for skeleton "${s.id}"`).toBeDefined();
    }
  });
});

describe("resumeTextToTemplatedDocxBuffer", () => {
  it("produces a valid non-empty .docx (zip) buffer for a template", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, "modern-band-blue");
    expect(buf.length).toBeGreaterThan(1000);
    // .docx files are zip archives — magic bytes "PK".
    expect(buf.slice(0, 2).toString("ascii")).toBe("PK");
  });

  it("falls back safely for an unknown template id instead of throwing", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, "not-a-real-template");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("generates a valid buffer for every skeleton at least once, across all color families", async () => {
    for (const skeleton of TEMPLATE_SKELETONS) {
      const template = RESUME_TEMPLATES.find((t) => t.skeletonId === skeleton.id)!;
      const buf = await resumeTextToTemplatedDocxBuffer(SAMPLE, template.id);
      expect(buf.length, `template ${template.id} produced a suspiciously small buffer`).toBeGreaterThan(1000);
    }
  });

  it("handles an empty resume without throwing", async () => {
    const buf = await resumeTextToTemplatedDocxBuffer("", "ats-classic-black");
    expect(buf.length).toBeGreaterThan(500);
  });
});
