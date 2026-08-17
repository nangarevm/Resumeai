import { describe, expect, it } from "vitest";
import { POST as vaultPost } from "@/app/api/vault/route";
import { POST as jobIntelPost } from "@/app/api/job-intel/route";
import { POST as kitPost } from "@/app/api/kit/route";

const SAMPLE_RESUME = `NAME: API Test User
EMAIL: test@example.com
PHONE: +91 98765 43210

SKILLS
Python, Playwright, API testing, CI/CD

WORK EXPERIENCE
Acme Corp | SDET | 2022–Present
- Built Playwright API automation for payment services
- Reduced regression time 40% with CI/CD pipelines

EDUCATION
B.Tech Computer Science`;

const SAMPLE_JD = `POSITION: SDET
COMPANY: Test Corp
MANDATORY REQUIREMENTS:
- Python
- Playwright
- API testing
- CI/CD`;

describe("API smoke tests", () => {
  it("POST /api/vault imports resume and returns seeker workspace", async () => {
    const res = await vaultPost(
      new Request("http://localhost/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: SAMPLE_RESUME, targetRole: "SDET", goals: "API automation role" })
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.name).toContain("API Test User");
    expect(data.vault.evidence.length).toBeGreaterThan(0);
  });

  it("POST /api/job-intel parses JD and returns fit report", async () => {
    const res = await jobIntelPost(
      new Request("http://localhost/api/job-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: SAMPLE_JD })
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.job.title).toContain("SDET");
    expect(data.fit.score).toBeGreaterThan(0);
    expect(data.fit.disclaimer).toBeTruthy();
  });

  it("POST /api/kit returns application kit after vault + job-intel", async () => {
    await vaultPost(
      new Request("http://localhost/api/vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: SAMPLE_RESUME })
      })
    );
    await jobIntelPost(
      new Request("http://localhost/api/job-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: SAMPLE_JD })
      })
    );
    const res = await kitPost(
      new Request("http://localhost/api/kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ override: true })
      })
    );
    expect(res.status).toBe(200);
    const kit = await res.json();
    expect(kit.tailoredResume).toBeTruthy();
    expect(kit.whatsappNote).toBeTruthy();
    expect(kit.checklist.length).toBeGreaterThan(0);
  });
});
