import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import {
  buildResumeText,
  categorizeSkills,
  emptyGuidedProfile,
  sentenceToBullet,
  suggestedCertifications,
  wizardStepOrder
} from "@/lib/wizard/guided-profile";

describe("sentenceToBullet", () => {
  it("strips filler openers and capitalizes", () => {
    expect(sentenceToBullet("I tested web applications.")).toBe("Tested web applications");
  });

  it("appends only explicitly selected tools not already mentioned", () => {
    const out = sentenceToBullet("Tested web applications", ["Selenium", "Playwright"]);
    expect(out).toBe("Tested web applications using Selenium, Playwright");
  });

  it("does not duplicate a tool already named in the sentence", () => {
    const out = sentenceToBullet("Automated tests with Selenium", ["Selenium"]);
    expect(out.match(/Selenium/g)?.length).toBe(1);
  });

  it("appends an impact clause only when explicitly chosen", () => {
    const out = sentenceToBullet("Automated regression tests", [], "reduced_errors");
    expect(out).toContain("reducing defects");
  });

  it("never adds an impact clause for 'not sure'", () => {
    const out = sentenceToBullet("Automated regression tests", [], "not_sure");
    expect(out).toBe("Automated regression tests");
  });

  it("returns empty string for empty input — no fabrication", () => {
    expect(sentenceToBullet("   ")).toBe("");
  });
});

describe("categorizeSkills", () => {
  it("buckets known tools into categories", () => {
    const groups = categorizeSkills("Selenium, Java, AWS, Jira, Random Thing");
    const labels = groups.map((g) => g.category);
    expect(labels).toContain("Automation & Testing");
    expect(labels).toContain("Languages");
    expect(labels).toContain("Cloud & DevOps");
    expect(labels).toContain("Tools");
    expect(labels).toContain("Other");
  });

  it("never invents a skill not in the input", () => {
    const groups = categorizeSkills("Python, SQL");
    const all = groups.flatMap((g) => g.skills);
    expect(all.sort()).toEqual(["Python", "SQL"].sort());
  });
});

describe("suggestedCertifications", () => {
  it("suggests role-relevant certs without adding them", () => {
    expect(suggestedCertifications("QA Engineer").length).toBeGreaterThan(0);
    expect(suggestedCertifications("Xylophone Repair Specialist")).toEqual([]);
  });
});

describe("wizardStepOrder", () => {
  it("puts education/projects before experience for freshers", () => {
    const order = wizardStepOrder("fresher");
    expect(order.indexOf("education")).toBeLessThan(order.indexOf("experience"));
  });

  it("puts experience first for experienced candidates", () => {
    const order = wizardStepOrder("3-5");
    expect(order.indexOf("experience")).toBeLessThan(order.indexOf("education"));
  });

  it("always asks basics then goal first, regardless of level", () => {
    expect(wizardStepOrder("fresher").slice(0, 2)).toEqual(["basics", "goal"]);
    expect(wizardStepOrder("8+").slice(0, 2)).toEqual(["basics", "goal"]);
  });
});

describe("buildResumeText — integration with the real resume parser", () => {
  it("produces text the existing parser reads back correctly, with zero fabrication", () => {
    const data = emptyGuidedProfile();
    data.name = "Jane Rivera";
    data.email = "jane.rivera@example.com";
    data.phone = "555-0100";
    data.location = "Austin, TX";
    data.targetTitle = "Registered Nurse";
    data.experienceLevel = "3-5";
    data.skillsRaw = "Patient care, EHR, BLS certification";
    data.experiences = [
      {
        id: "e1",
        title: "Registered Nurse",
        company: "St. Mary Hospital",
        location: "Austin, TX",
        startDate: "2021",
        endDate: "",
        current: true,
        rawDescription: "I provided direct patient care for a 20-bed unit",
        tools: [],
        impact: "not_sure"
      }
    ];
    data.educations = [{ id: "ed1", degree: "BSN", school: "State University", location: "", year: "2020", grade: "" }];

    const text = buildResumeText(data);
    expect(text).toContain("NAME: Jane Rivera");
    expect(text).toContain("EMAIL: jane.rivera@example.com");
    expect(text).toContain("Provided direct patient care for a 20-bed unit");
    expect(text).not.toMatch(/\d+%|\$\d|reduc(ed|ing)|increas(ed|ing)|improv(ed|ing)/i);

    const profile = parseResume("test", text);
    expect(profile.name).toBe("Jane Rivera");
    expect(profile.email).toBe("jane.rivera@example.com");
    expect(profile.extractedSkills).toContain("Patient care");
    expect(profile.extractedSkills).toContain("BLS certification");
  });

  it("omits empty sections instead of emitting blank headers", () => {
    const data = emptyGuidedProfile();
    data.name = "Sam";
    data.email = "sam@example.com";
    data.phone = "555-0000";
    const text = buildResumeText(data);
    expect(text).not.toContain("WORK EXPERIENCE");
    expect(text).not.toContain("PROJECTS");
    expect(text).not.toContain("EDUCATION");
    expect(text).not.toContain("SKILLS");
    expect(text).not.toContain("CERTIFICATIONS");
  });
});
