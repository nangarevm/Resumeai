import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { buildJobContext, buildContextBlock } from "@/lib/engines/ai-generate";

const RESUME = `NAME: Test User\nEMAIL: t@example.com\nSKILLS\nFlutter, Dart\nWORK EXPERIENCE\nAcme | Dev\n- Built a Flutter app`;
const JD = [
  "POSITION: Flutter Developer",
  "COMPANY: Acme",
  "SENIORITY: Mid",
  "MANDATORY REQUIREMENTS:",
  "- Flutter",
  "- Dart",
  "PREFERRED REQUIREMENTS:",
  "- Firebase",
  "RESPONSIBILITIES:",
  "- Ship mobile features",
  "We are an equal opportunity employer. Benefits include health insurance, 401k matching, and unlimited PTO.",
  "To apply, submit your resume through our careers portal."
].join("\n");

describe("buildJobContext", () => {
  it("includes title, company, and requirements from structured JD fields", () => {
    const jd = parseJD("j", JD);
    const ctx = buildJobContext(jd);
    expect(ctx).toContain(jd.title);
    expect(ctx).toContain(jd.companyName);
    expect(ctx).toContain("Flutter");
  });

  it("does not carry over JD boilerplate (benefits/EEO/application instructions)", () => {
    const jd = parseJD("j", JD);
    const ctx = buildJobContext(jd);
    expect(ctx.toLowerCase()).not.toContain("equal opportunity");
    expect(ctx.toLowerCase()).not.toContain("401k");
    expect(ctx.toLowerCase()).not.toContain("careers portal");
  });

  it("caps requirements and responsibilities so the block stays bounded", () => {
    const manyReqs = Array.from({ length: 20 }, (_, i) => `- Skill${i}`).join("\n");
    const jd = parseJD("j", `POSITION: Engineer\nMANDATORY REQUIREMENTS:\n${manyReqs}`);
    const ctx = buildJobContext(jd);
    const matches = ctx.match(/Skill\d+/g) || [];
    expect(matches.length).toBeLessThanOrEqual(8);
  });
});

describe("buildContextBlock", () => {
  it("includes the candidate name, resume text, and job context", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD("j", JD);
    const block = buildContextBlock({ kind: "cover_letter", profile, job: jd });
    expect(block).toContain(profile.name);
    expect(block).toContain("Flutter app");
    expect(block).toContain(jd.title);
  });

  it("omits the job section entirely when there's no active job", () => {
    const profile = parseResume("t", RESUME);
    const block = buildContextBlock({ kind: "summary", profile, job: null });
    expect(block).not.toContain("TARGET JOB");
  });
});
