import { describe, expect, it } from "vitest";
import { formatResumeDraft, applySummaryToResume, polishResumeDraft } from "@/lib/engines/resume-formatter";

const MESSY_RESUME = `Ravi Kumar
CONTACT
john@example.com | +91 98765 43210

PROFILE SUMMARY
QA Engineer with 8+ years in Functional Testing, API (Postman), and Automation (Selenium).
Led regression suites and CI pipelines.

KEY SKILLS
Functional Testing, API Testing, Postman, Selenium, CI/CD

WORK EXPERIENCE
Acme Corp | QA Engineer | 2018–Present
Built Playwright API automation reducing regression time 40%

EDUCATION
B.Tech Computer Science`;

describe("resume formatter", () => {
  it("normalizes CONTACT and PROFILE SUMMARY into standard headers", () => {
    const out = polishResumeDraft(MESSY_RESUME);
    expect(out).toMatch(/^NAME:/m);
    expect(out).toMatch(/^EMAIL:/m);
    expect(out).toMatch(/^PHONE:/m);
    expect(out).toContain("SUMMARY");
    expect(out).not.toContain("PROFILE SUMMARY");
    expect(out).not.toContain("CONTACT\n");
    expect(out).toContain("WORK EXPERIENCE");
  });

  it("applies summary without prepending before name", () => {
    const summary = "8+ years QA Engineer with evidenced API and Playwright automation strengths.";
    const out = applySummaryToResume(MESSY_RESUME, summary);
    expect(out.indexOf("NAME:")).toBeLessThan(out.indexOf("SUMMARY"));
    expect(out).toContain(summary);
  });

  it("formats skills as bullets", () => {
    const out = formatResumeDraft("SKILLS\nPython, Playwright, API testing");
    expect(out).toContain("- Python");
    expect(out).toContain("- Playwright");
  });

  it("keeps a 'Company | Role | Dates' sub-header as plain text, not a bullet", () => {
    const out = formatResumeDraft(
      "WORK EXPERIENCE\nSt. Mary Hospital | Registered Nurse | 2021-Present\n- Provided direct patient care"
    );
    expect(out).toContain("St. Mary Hospital | Registered Nurse | 2021-Present");
    expect(out).not.toContain("- St. Mary Hospital");
    expect(out).toContain("- Provided direct patient care");
  });
});
