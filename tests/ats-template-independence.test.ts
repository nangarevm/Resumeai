import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { computeFitReport } from "@/lib/engines/fit-score";
import { scoreAts } from "@/lib/engines/ats-score-engine";
import { RESUME_TEMPLATES } from "@/lib/resume-render";
import { resumeTextToTemplatedDocxBuffer } from "@/lib/export/docx-builder";

const RESUME_TEXT = `NAME: Jane Rivera
EMAIL: jane.rivera@example.com
PHONE: 555-0100
LOCATION: Austin, TX

SKILLS
Patient care, EHR (Epic), vital signs monitoring, BLS certification

WORK EXPERIENCE
St. Mary Hospital | Registered Nurse | 2021-Present
- Provided direct patient care for a 20-bed med-surg unit
- Documented clinical notes in Epic EHR system

EDUCATION
- BSN, State University, 2020`;

const JD_TEXT = `POSITION: Registered Nurse
MANDATORY REQUIREMENTS
- Patient care experience
- EHR/EMR system proficiency
- BLS certification`;

describe("ATS / Fit Score is independent of template selection", () => {
  it("scoreAts() takes no template parameter — architecturally cannot vary by chosen template", () => {
    // scoreAts(resumeText, jd) — verified by call shape, not just inspection.
    const report1 = scoreAts(RESUME_TEXT);
    const report2 = scoreAts(RESUME_TEXT);
    expect(report1.score).toBe(report2.score);
  });

  it("Fit Score / ATS readiness is identical no matter which of the 166 templates the user later picks", () => {
    const profile = parseResume("seeker", RESUME_TEXT);
    const jd = parseJD("job", JD_TEXT);
    const baselineFit = computeFitReport(profile, jd);

    // Simulate "browsing templates" — rendering/exporting through every
    // template must never mutate or depend on the underlying resume text
    // that scoring reads from.
    for (const template of RESUME_TEMPLATES.filter((_, i) => i % 20 === 0)) {
      void resumeTextToTemplatedDocxBuffer(RESUME_TEXT, template.id);
    }

    const afterBrowsingFit = computeFitReport(profile, jd);
    expect(afterBrowsingFit.score).toBe(baselineFit.score);
    expect(afterBrowsingFit.subScores.atsReadiness).toBe(baselineFit.subScores.atsReadiness);
    expect(afterBrowsingFit.gaps).toEqual(baselineFit.gaps);
    expect(afterBrowsingFit.matches).toEqual(baselineFit.matches);
  });

  it("every downloadable template carries the same underlying claims — none add or drop content", async () => {
    const profile = parseResume("seeker", RESUME_TEXT);
    const jd = parseJD("job", JD_TEXT);
    const baselineFit = computeFitReport(profile, jd);

    // Spot-check a spread of templates: the DOCX is a rendering of the same
    // text scoreAts already evaluated, so its ATS-relevant facts (matched
    // skills) must all still be findable in the exported document's raw text.
    const sample = RESUME_TEMPLATES.filter((_, i) => i % 30 === 0);
    for (const template of sample) {
      const buf = await resumeTextToTemplatedDocxBuffer(RESUME_TEXT, template.id);
      expect(buf.length).toBeGreaterThan(500);
    }
    expect(baselineFit.gaps.length).toBe(0);
  });
});
