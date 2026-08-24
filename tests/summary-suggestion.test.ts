import { describe, expect, it } from "vitest";
import { suggestSummaryLine } from "@/lib/engines/summary-suggestion";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";

const JD = parseJD("job", `POSITION: QA Engineer Intern\nMANDATORY REQUIREMENTS\n- Python\n- SQL`);

describe("suggestSummaryLine", () => {
  it("uses an explicit year count when the resume states one", () => {
    const profile = parseResume(
      "p",
      `NAME: Jane Rivera\nEMAIL: jane@example.com\nPHONE: 555-0100\nSUMMARY\n4 years of nursing experience.\nSKILLS\nPatient care`
    );
    const line = suggestSummaryLine(profile, JD, ["Patient care"]);
    expect(line).toContain("4+ years");
  });

  it("says 'Experienced' only when the resume has real work-experience content", () => {
    const profile = parseResume(
      "p",
      `NAME: Sam Lee\nEMAIL: sam@example.com\nPHONE: 555-0100\nSKILLS\nPython\nWORK EXPERIENCE\nAcme Corp | QA Engineer | 2021-Present\n- Tested applications`
    );
    const line = suggestSummaryLine(profile, JD, ["Python"]);
    expect(line).toContain("Experienced");
  });

  it("never claims 'Experienced' for a fresher with no work-experience section", () => {
    const profile = parseResume(
      "p",
      `NAME: Alex Chen\nEMAIL: alex@example.com\nPHONE: 555-0199\nSKILLS\nPython, SQL\nPROJECTS\n- Test automation framework\nEDUCATION\n- B.S. Computer Science, 2025`
    );
    const line = suggestSummaryLine(profile, JD, ["Python", "SQL"]);
    expect(line).not.toContain("Experienced");
    expect(line).toContain("Aspiring");
  });
});
