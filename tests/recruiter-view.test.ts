import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { buildCareerVault } from "@/lib/engines/career-vault";
import { computeRecruiterView } from "@/lib/engines/recruiter-view";

describe("computeRecruiterView", () => {
  it("marks name, role, years, and top skills as immediately clear when they're near the top", () => {
    const resume = `NAME: Kajal Sharma
EMAIL: kajal@example.com
SUMMARY
Flutter Developer with 2+ years of experience building cross-platform apps.
SKILLS
Flutter, Dart, Firebase
WORK EXPERIENCE
Indicold | Software Developer | 2024-Present
- Built Flutter apps with 25% performance improvement`;
    const profile = parseResume("t", resume);
    const vault = buildCareerVault(profile);
    const jd = parseJD("j", "POSITION: Flutter Developer\nMANDATORY REQUIREMENTS:\n- Flutter\n- Dart");
    const view = computeRecruiterView(profile, vault, jd);
    expect(view.immediatelyClear.some((c) => c.includes("Kajal Sharma"))).toBe(true);
    expect(view.immediatelyClear.some((c) => c.includes("2+ years") || c.includes("2 years"))).toBe(true);
    expect(view.immediatelyClear.some((c) => c.includes("Flutter"))).toBe(true);
  });

  it("flags a buried target role as unclear when it's not near the top", () => {
    const resume = `NAME: Alex Chen
EMAIL: alex@example.com
SUMMARY
Recent graduate with a broad interest in software, testing, and general technology work who is looking to grow into a
full-time engineering role somewhere with a strong mentorship culture and room to learn new frameworks over time.
SKILLS
Python
WORK EXPERIENCE
Acme | Junior QA
- Some Flutter Developer contract work last year`;
    const profile = parseResume("t", resume);
    const vault = buildCareerVault(profile);
    const jd = parseJD("j", "POSITION: Flutter Developer\nMANDATORY REQUIREMENTS:\n- Flutter");
    const view = computeRecruiterView(profile, vault, jd);
    expect(view.missingOrUnclear.some((c) => c.toLowerCase().includes("target role"))).toBe(true);
  });

  it("flags limited measurable achievements when the vault has no metrics", () => {
    const resume = `NAME: Sam Lee
EMAIL: sam@example.com
SUMMARY
Software engineer.
SKILLS
Python`;
    const profile = parseResume("t", resume);
    const vault = buildCareerVault(profile);
    const view = computeRecruiterView(profile, vault);
    expect(view.missingOrUnclear.some((c) => c.toLowerCase().includes("measurable achievements"))).toBe(true);
  });

  it("caps missing/unclear findings at 6 items", () => {
    const resume = `NAME: Test User\nEMAIL: t@example.com`;
    const profile = parseResume("t", resume);
    const vault = buildCareerVault(profile);
    const jd = parseJD(
      "j",
      "POSITION: Anything\nMANDATORY REQUIREMENTS:\n- Python\n- SQL\n- Java\n- React\n- AWS\n- Docker\n- Kubernetes"
    );
    const view = computeRecruiterView(profile, vault, jd);
    expect(view.missingOrUnclear.length).toBeLessThanOrEqual(6);
  });
});
