import { describe, expect, it } from "vitest";
import { buildCandidateBrief } from "@/lib/engines/candidate-brief";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { computeFitReport } from "@/lib/engines/fit-score";
import { buildCareerVault } from "@/lib/engines/career-vault";

const RESUME = `NAME: Jane Doe
EMAIL: jane@example.com
PHONE: 555-1212

WORK EXPERIENCE
Acme Corp, Senior Engineer, 2022-Present
- Built a real feature that shipped to production, cutting load time by 30%

SKILLS
Python, TypeScript, SQL, React`;

const JD = `POSITION: Software Engineer
COMPANY: Acme Corp

MANDATORY REQUIREMENTS:
- Python
- SQL

PREFERRED REQUIREMENTS:
- React`;

describe("buildCandidateBrief", () => {
  it("shows 'no target job' guidance when no job is selected", () => {
    const profile = parseResume("t1", RESUME);
    const brief = buildCandidateBrief(profile, null, null);
    expect(brief).toContain("Jane Doe");
    expect(brief).toMatch(/no active job selected/i);
    expect(brief).not.toContain("Fit Score:");
  });

  it("includes fit score, strong areas, and gaps once a job and fit report exist", () => {
    const profile = parseResume("t2", RESUME);
    const job = parseJD("job1", JD);
    const vault = buildCareerVault(profile);
    const fit = computeFitReport(profile, job, vault);
    const brief = buildCandidateBrief(profile, job, fit);
    expect(brief).toContain("Jane Doe");
    expect(brief).toContain("Software Engineer");
    expect(brief).toContain("Acme Corp");
    expect(brief).toMatch(/Fit Score:\*\* \d+%/);
    expect(brief).toContain("## Strong areas");
    expect(brief).toContain("## Gaps");
  });

  it("never invents skills not present in extractedSkills", () => {
    const profile = parseResume("t3", RESUME);
    const brief = buildCandidateBrief(profile, null, null);
    expect(brief).toContain("Python");
    expect(brief).not.toContain("Rust");
  });
});
