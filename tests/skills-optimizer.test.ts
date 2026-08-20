import { describe, expect, it } from "vitest";
import { categorizeSkills, buildCategorizedSkillsBlock, applyCategorizedSkillsToResume } from "@/lib/engines/skills-optimizer";

describe("categorizeSkills", () => {
  it("groups mobile, state management, and backend skills into distinct categories", () => {
    const groups = categorizeSkills(["Flutter", "GetX", "Node.js", "MySQL", "AWS", "Git"]);
    const byKey = Object.fromEntries(groups.map((g) => [g.key, g.skills]));
    expect(byKey["mobile"]).toContain("Flutter");
    expect(byKey["state-management"]).toContain("GetX");
    expect(byKey["backend-api"]).toContain("Node.js");
    expect(byKey["database"]).toContain("MySQL");
    expect(byKey["cloud-devops"]).toContain("AWS");
    expect(byKey["tools-testing"]).toContain("Git");
  });

  it("never drops or invents a skill — every input skill appears exactly once", () => {
    const skills = ["Flutter", "Dart", "Firebase", "REST API", "Some Obscure Tool"];
    const groups = categorizeSkills(skills);
    const all = groups.flatMap((g) => g.skills);
    expect(all.length).toBe(skills.length);
    for (const s of skills) expect(all).toContain(s);
  });

  it("puts unmatched skills into Other rather than dropping them", () => {
    const groups = categorizeSkills(["Some Obscure Tool"]);
    const other = groups.find((g) => g.key === "other");
    expect(other?.skills).toContain("Some Obscure Tool");
  });

  it("returns no empty categories", () => {
    const groups = categorizeSkills(["Flutter"]);
    expect(groups.every((g) => g.skills.length > 0)).toBe(true);
    expect(groups.length).toBe(1);
  });
});

describe("buildCategorizedSkillsBlock", () => {
  it("builds a SKILLS header followed by one line per category", () => {
    const block = buildCategorizedSkillsBlock(["Flutter", "Dart", "MySQL"]);
    expect(block.split("\n")[0]).toBe("SKILLS");
    expect(block).toContain("Mobile: Flutter");
    expect(block).toContain("Languages: Dart");
    expect(block).toContain("Database: MySQL");
  });
});

describe("applyCategorizedSkillsToResume", () => {
  it("replaces an existing SKILLS section body without touching other sections", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\n\nSKILLS\nFlutter, Dart, MySQL\n\nEDUCATION\nB.S. CS`;
    const next = applyCategorizedSkillsToResume(resume, ["Flutter", "Dart", "MySQL"]);
    expect(next).toContain("Mobile: Flutter");
    expect(next).toContain("NAME: Test");
    expect(next).toContain("EDUCATION");
    expect(next).toContain("B.S. CS");
    expect(next.match(/SKILLS/g)?.length).toBe(1);
  });

  it("inserts a SKILLS section before EDUCATION when none exists", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\n\nEDUCATION\nB.S. CS`;
    const next = applyCategorizedSkillsToResume(resume, ["Flutter"]);
    const skillsIdx = next.indexOf("SKILLS");
    const eduIdx = next.indexOf("EDUCATION");
    expect(skillsIdx).toBeGreaterThan(-1);
    expect(skillsIdx).toBeLessThan(eduIdx);
  });
});
