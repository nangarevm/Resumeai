import { describe, expect, it } from "vitest";
import { GET as clientBriefGet } from "@/app/api/client-brief/route";
import { addAgencyCandidate, addAgencyJob, resetWorkspaceCache, setSeekerProfile } from "@/lib/workspace-store";
import { getSeedCandidates } from "@/lib/store";
import { parseResume } from "@/lib/parsers/resume-parser";

/** Same isolation pattern as agency-isolation.test.ts. */
async function withIsolatedUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const savedFile = process.env.RESUMEPROOF_WORKSPACE_FILE;
  delete process.env.RESUMEPROOF_WORKSPACE_FILE;
  resetWorkspaceCache();
  process.env.RESUMEPROOF_WORKSPACE_USER = userId;
  try {
    return await fn();
  } finally {
    delete process.env.RESUMEPROOF_WORKSPACE_USER;
    if (savedFile) process.env.RESUMEPROOF_WORKSPACE_FILE = savedFile;
    resetWorkspaceCache();
  }
}

async function getBrief(candidateId?: string): Promise<{ brief: string; candidateId: string; candidateName: string }> {
  const url = candidateId ? `http://localhost/api/client-brief?candidateId=${candidateId}` : "http://localhost/api/client-brief";
  const res = await clientBriefGet(new Request(url));
  return res.json();
}

describe("GET /api/client-brief", () => {
  it("briefs the requested pool candidate, not the logged-in account's own seeker profile", async () => {
    await withIsolatedUser("brief-a", async () => {
      // Set this account's own candidate (seeker) profile to something
      // clearly distinct from anyone in the agency pool — if the old bug
      // (getSeeker() instead of the selected candidate) were still present,
      // this name would leak into the brief instead of the pool candidate's.
      await setSeekerProfile(parseResume("own-profile", "NAME: My Own Seeker Profile\nEMAIL: self@example.com\nSKILLS:\n- Should not appear"));

      const seedCandidate = getSeedCandidates()[0];
      const data = await getBrief(seedCandidate.id);
      expect(data.candidateName).toBe(seedCandidate.name);
      expect(data.brief).toContain(seedCandidate.name);
      expect(data.brief).not.toContain("My Own Seeker Profile");
    });
  });

  it("defaults to the first pool candidate when no candidateId is given", async () => {
    await withIsolatedUser("brief-default", async () => {
      const data = await getBrief();
      expect(data.candidateName).toBe(getSeedCandidates()[0].name);
    });
  });

  it("includes a fit score and evidence sections when a job is active", async () => {
    await withIsolatedUser("brief-fit", async () => {
      await addAgencyJob(
        "POSITION: Backend Engineer\nCOMPANY: Test Co\nDOMAIN: Testing\n\nMANDATORY REQUIREMENTS:\nPython\n\nPREFERRED REQUIREMENTS:\nSQL"
      );
      const data = await getBrief(getSeedCandidates()[0].id);
      expect(data.brief).toMatch(/Fit Score:/);
      expect(data.brief).toMatch(/## Strong areas/);
      expect(data.brief).toMatch(/## Gaps/);
    });
  });

  it("only briefs candidates in this account's own pool — a candidateId from nowhere in the pool errors instead of silently falling back", async () => {
    await withIsolatedUser("brief-unknown", async () => {
      const res = await clientBriefGet(new Request("http://localhost/api/client-brief?candidateId=not-a-real-id"));
      expect(res.status).toBe(400);
    });
  });

  it("can brief a candidate this specific account added, using their real name", async () => {
    await withIsolatedUser("brief-custom", async () => {
      const added = await addAgencyCandidate("NAME: Custom Pool Candidate\nEMAIL: custom@example.com\nSKILLS:\nGo, Kubernetes");
      const data = await getBrief(added.id);
      expect(data.candidateName).toBe("Custom Pool Candidate");
    });
  });
});
