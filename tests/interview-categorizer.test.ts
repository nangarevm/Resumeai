import { describe, expect, it } from "vitest";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { bucketForCategory, standardHrQuestions, categorizeInterviewQuestions, BUCKET_ORDER } from "@/lib/engines/interview-categorizer";
import type { InterviewQuestion } from "@/lib/models";

const JD = "POSITION: Flutter Developer\nCOMPANY: Acme\nMANDATORY REQUIREMENTS:\n- Flutter";

describe("bucketForCategory", () => {
  it("maps known engine categories to the right bucket", () => {
    expect(bucketForCategory("Domain Expertise Deep-Dive")).toBe("Technical");
    expect(bucketForCategory("Mastery & Optimization")).toBe("Technical");
    expect(bucketForCategory("Claim Verification")).toBe("Resume");
    expect(bucketForCategory("Skill Gap Assessment")).toBe("Gap");
  });

  it("falls back to Technical for an unrecognized category", () => {
    expect(bucketForCategory("Something New")).toBe("Technical");
  });
});

describe("standardHrQuestions", () => {
  it("returns generic prompts personalized with the job title and company, not candidate claims", () => {
    const jd = parseJD("j", JD);
    const questions = standardHrQuestions(jd);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.every((q) => q.category === "HR")).toBe(true);
    expect(questions.some((q) => q.question.includes("Flutter Developer"))).toBe(true);
  });
});

describe("categorizeInterviewQuestions", () => {
  it("groups questions into their bucket and always includes HR", () => {
    const jd = parseJD("j", JD);
    const questions: InterviewQuestion[] = [
      { target: "Flutter", question: "Q1", category: "Domain Expertise Deep-Dive", priority: 1 },
      { target: "claim", question: "Q2", category: "Claim Verification", priority: 1 },
      { target: "gap", question: "Q3", category: "Skill Gap Assessment", priority: 1 }
    ];
    const grouped = categorizeInterviewQuestions(questions, jd);
    expect(grouped.Technical?.length).toBe(1);
    expect(grouped.Resume?.length).toBe(1);
    expect(grouped.Gap?.length).toBe(1);
    expect(grouped.HR?.length).toBeGreaterThan(0);
  });

  it("BUCKET_ORDER lists all four buckets in the spec's order", () => {
    expect(BUCKET_ORDER).toEqual(["Technical", "Resume", "Gap", "HR"]);
  });
});
