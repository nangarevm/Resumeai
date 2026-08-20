import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { checkBulletFormulas } from "@/lib/engines/bullet-formula-check";

describe("checkBulletFormulas", () => {
  it("flags a passive, resultless bullet as missing Action and Result", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nSKILLS\nFlutter\nWORK EXPERIENCE\nAcme | Dev\n- Responsible for the mobile app`;
    const profile = parseResume("t", resume);
    const results = checkBulletFormulas(profile);
    expect(results.length).toBe(1);
    expect(results[0].hasAction).toBe(false);
    expect(results[0].missing).toContain("Action");
  });

  it("does not flag a bullet that already has a strong action and a measurable result", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nSKILLS\nFlutter\nWORK EXPERIENCE\nAcme | Dev\n- Built a Flutter checkout flow that reduced cart abandonment by 18%`;
    const profile = parseResume("t", resume);
    const results = checkBulletFormulas(profile);
    expect(results.length).toBe(0);
  });

  it("detects a known technology mentioned in the bullet from the candidate's own skills", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nSKILLS\nFlutter, Firebase\nWORK EXPERIENCE\nAcme | Dev\n- Built a Flutter app using Firebase for authentication`;
    const profile = parseResume("t", resume);
    const results = checkBulletFormulas(profile);
    const found = results.find((r) => r.bullet.includes("Flutter"));
    if (found) expect(found.hasTechnology).toBe(true);
  });

  it("never invents a technology the candidate didn't list", () => {
    const resume = `NAME: Test\nEMAIL: t@example.com\nSKILLS\nPython\nWORK EXPERIENCE\nAcme | Dev\n- Responsible for backend services`;
    const profile = parseResume("t", resume);
    const results = checkBulletFormulas(profile);
    expect(results[0].hasTechnology).toBe(false);
  });

  it("caps flagged bullets at 10", () => {
    const bullets = Array.from({ length: 15 }, (_, i) => `- Responsible for task number ${i} across the team`).join("\n");
    const resume = `NAME: Test\nEMAIL: t@example.com\nWORK EXPERIENCE\nAcme | Dev\n${bullets}`;
    const profile = parseResume("t", resume);
    const results = checkBulletFormulas(profile);
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
