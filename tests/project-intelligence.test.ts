import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { rankProjectsByRelevance } from "@/lib/engines/project-intelligence";

describe("rankProjectsByRelevance", () => {
  it("ranks a JD-matching project above an unrelated one", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nPROJECTS\nFlutter Chat App - Real-time chat built with Flutter, Dart, and Firebase.\nRecipe Blog - A static site listing family recipes.`;
    const profile = parseResume("t", resume);
    const jd = parseJD("j", "POSITION: Flutter Developer\nMANDATORY REQUIREMENTS:\n- Flutter\n- Dart\n- Firebase");
    const ranked = rankProjectsByRelevance(profile, jd);
    expect(ranked[0].project).toContain("Flutter Chat App");
    expect(ranked[0].tier).toBe("highly_relevant");
    expect(ranked[ranked.length - 1].project).toContain("Recipe Blog");
  });

  it("parses one-line-per-project format with no bullet marker (real-world resume format)", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nPROJECTS\nWarehouse Management System - Real-time inventory tracking with barcode scanning.\nHRMS App - Attendance and leave management.`;
    const profile = parseResume("t", resume);
    expect(profile.extractedProjects.length).toBe(2);
    expect(profile.extractedProjects[0]).toContain("Warehouse Management System");
  });

  it("only credits terms that actually appear in the project's own text", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nPROJECTS\nSimple Todo App - A basic todo list app.`;
    const profile = parseResume("t", resume);
    const jd = parseJD("j", "POSITION: Kubernetes Engineer\nMANDATORY REQUIREMENTS:\n- Kubernetes\n- Docker\n- Terraform");
    const ranked = rankProjectsByRelevance(profile, jd);
    expect(ranked[0].matchedTerms).toEqual([]);
    expect(ranked[0].tier).toBe("less_relevant");
  });

  it("returns an empty array when there are no projects", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com`;
    const profile = parseResume("t", resume);
    const jd = parseJD("j", "POSITION: Engineer\nMANDATORY REQUIREMENTS:\n- Python");
    expect(rankProjectsByRelevance(profile, jd)).toEqual([]);
  });
});
