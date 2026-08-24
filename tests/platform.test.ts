import { describe, expect, it } from "vitest";
import { createMagicToken, verifyMagicToken } from "@/lib/auth/magic-link";
import { userIdFromEmail } from "@/lib/auth/config";
import { mergeLiveWithStatic } from "@/lib/engines/live-market-feed";
import { getMarketSignals } from "@/lib/engines/market-intelligence";
import {
  injectSummaryTailorSuggestion,
  applySummaryToResume
} from "@/lib/engines/tailoring";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { computeFitReport } from "@/lib/engines/fit-score";
import { buildCareerVault } from "@/lib/engines/career-vault";
import {
  getWorkspaceFilePath,
  resetWorkspaceCache,
  resetSeekerWorkspace,
  setSeekerProfile
} from "@/lib/workspace-store";
import fs from "fs";

const RESUME = `NAME: Platform Test
EMAIL: plat@example.com
SKILLS
Python, Playwright
SUMMARY
QA engineer with API focus
WORK EXPERIENCE
Acme | SDET | 2022–Present
- Playwright API automation`;

const JD = `POSITION: SDET
COMPANY: Corp
MANDATORY REQUIREMENTS:
- Python
- Playwright`;

describe("platform deep features", () => {
  it("magic link tokens verify email", async () => {
    const token = await createMagicToken("user@example.com");
    const email = await verifyMagicToken(token);
    expect(email).toBe("user@example.com");
    expect(userIdFromEmail("user@example.com")).toMatch(/^user-/);
  });

  it("workspace tests use isolated temp file", async () => {
    const path = await getWorkspaceFilePath();
    expect(path).toContain("resumeproof-test");
    expect(path).not.toContain("data/runtime/workspace.json");
  });

  it("merge live overlay with static market signals", () => {
    const staticSignals = getMarketSignals("SDET", "Tech");
    const merged = mergeLiveWithStatic(staticSignals, {
      fastGrowing: ["live-skill-alpha"],
      increasingDemand: ["live-skill-beta"],
      emerging: ["live-emerging"],
      source: "test",
      fetchedAt: new Date().toISOString(),
      fromCache: false
    });
    expect(merged.fastGrowing[0]).toBe("live-skill-alpha");
    expect(merged.fastGrowing.length).toBeGreaterThan(1);
  });

  it("tailor injects summary suggestion", () => {
    const profile = parseResume("t", RESUME);
    const jd = parseJD("j", JD);
    const vault = buildCareerVault(profile);
    const fit = computeFitReport(profile, jd, vault);
    const suggestions = injectSummaryTailorSuggestion(profile, jd, fit, []);
    expect(suggestions.some((s) => s.kind === "summary")).toBe(true);
    const summary = suggestions.find((s) => s.kind === "summary")!;
    const updated = applySummaryToResume(profile.rawResumeText, summary.proposed);
    expect(updated).toContain(summary.proposed);
    expect(updated).toMatch(/SUMMARY/i);
  });

  it("resetSeekerWorkspace clears to a minimal empty profile, not seed demo data", async () => {
    await setSeekerProfile(
      parseResume(
        "big",
        "NAME: Big User\nEMAIL: big@test.com\nPREFERRED ROLE: AI/ML Intern\nSKILLS\nPython\nWORK EXPERIENCE\nAcme Corp"
      )
    );
    const reset = await resetSeekerWorkspace();
    expect(reset.profile.name).toBe("New user");
    expect(reset.vault.targetRole).toBe("");
    expect(reset.profile.rawResumeText).not.toContain("Anuja");
    expect(reset.profile.rawResumeText).not.toContain("AI/ML Intern");
  });

  it("per-user workspace path is separate from legacy", async () => {
    const savedFile = process.env.RESUMEPROOF_WORKSPACE_FILE;
    delete process.env.RESUMEPROOF_WORKSPACE_FILE;

    resetWorkspaceCache();
    process.env.RESUMEPROOF_WORKSPACE_USER = "user-test-a";
    await setSeekerProfile(parseResume("a", "NAME: User A\nEMAIL: a@test.com\nSKILLS: Java"));
    const pathA = await getWorkspaceFilePath();
    expect(fs.existsSync(pathA)).toBe(true);

    resetWorkspaceCache();
    process.env.RESUMEPROOF_WORKSPACE_USER = "user-test-b";
    await setSeekerProfile(parseResume("b", "NAME: User B\nEMAIL: b@test.com\nSKILLS: Go"));
    const pathB = await getWorkspaceFilePath();
    expect(pathA).not.toBe(pathB);
    const contentB = fs.readFileSync(pathB, "utf8");
    expect(contentB).toContain("User B");

    delete process.env.RESUMEPROOF_WORKSPACE_USER;
    if (savedFile) process.env.RESUMEPROOF_WORKSPACE_FILE = savedFile;
    resetWorkspaceCache();
  });
});
