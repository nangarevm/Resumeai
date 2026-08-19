import { describe, expect, it } from "vitest";
import { normalizeBoardPaste } from "@/lib/parsers/board-paste-normalizer";

describe("board paste normalizer", () => {
  it("detects and normalizes Naukri-style paste", () => {
    const raw = `Job Title: SDET Engineer
Company: Acme Tech
Location: Bangalore
Key Skills
Python, Playwright, CI/CD
Job Description
Build API automation frameworks
Role & Responsibilities
- Design test suites
- Work with dev teams`;
    const { text, source } = normalizeBoardPaste(raw);
    expect(source).toBe("Naukri");
    expect(text).toContain("POSITION: SDET Engineer");
    expect(text).toContain("MANDATORY REQUIREMENTS:");
    expect(text).toContain("Python");
  });

  it("detects and normalizes Instahyre-style paste", () => {
    const raw = `Role: ML Engineer
Company: DataCo
Must have skills
Python, TensorFlow
Good to have
PyTorch, Kubernetes
About the role
Train models on production data`;
    const { text, source } = normalizeBoardPaste(raw);
    expect(source).toBe("Instahyre");
    expect(text).toContain("POSITION: ML Engineer");
    expect(text).toContain("PREFERRED REQUIREMENTS:");
    expect(text).toContain("PyTorch");
  });

  it("passes through generic JD unchanged", () => {
    const raw = "POSITION: Intern\nMANDATORY REQUIREMENTS:\n- Python";
    const { text, source } = normalizeBoardPaste(raw);
    expect(source).toBeUndefined();
    expect(text).toBe(raw);
  });
});
