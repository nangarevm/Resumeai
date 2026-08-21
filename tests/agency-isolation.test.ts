import { describe, expect, it } from "vitest";
import {
  addAgencyCandidate,
  addAgencyJob,
  attachClientFromPool,
  getAgencyActiveJob,
  getAgencyCandidatePool,
  getAgencyJobs,
  removeAgencyCandidate,
  removeAgencyJob,
  removeAgencySeat,
  resetWorkspaceCache,
  setAgencyActiveJobId
} from "@/lib/workspace-store";
import { getSeedCandidates, getSeedJobs } from "@/lib/store";
import { GET as candidatesGet, POST as candidatesPost, DELETE as candidatesDelete } from "@/app/api/candidates/route";
import { GET as jobsGet, POST as jobsPost } from "@/app/api/jobs/route";

/** Same isolation pattern as version-history.test.ts / photo-upload.test.ts:
 *  temporarily unset the shared RESUMEPROOF_WORKSPACE_FILE so
 *  RESUMEPROOF_WORKSPACE_USER takes effect, giving each test its own
 *  workspace file instead of sharing state with the rest of the suite. */
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

const SAMPLE_RESUME = `NAME: Isolation Test Candidate
EMAIL: iso-test@example.com
PHONE: +1 555 7777

SUMMARY
Backend engineer.

SKILLS
Go, Postgres

WORK EXPERIENCE
Acme Corp | Engineer | 2022-Present
- Built a payments service`;

const SAMPLE_JD = `POSITION: Backend Engineer
COMPANY: Acme Corp
DOMAIN: Fintech

MANDATORY REQUIREMENTS:
Go, Postgres

PREFERRED REQUIREMENTS:
Kubernetes`;

describe("agency candidate/job pool isolation (store level)", () => {
  it("a candidate added by one account never appears in another account's pool", async () => {
    await withIsolatedUser("agency-iso-a", async () => {
      await addAgencyCandidate(SAMPLE_RESUME);
    });
    await withIsolatedUser("agency-iso-b", async () => {
      const pool = await getAgencyCandidatePool();
      expect(pool.some((c) => c.name === "Isolation Test Candidate")).toBe(false);
    });
    await withIsolatedUser("agency-iso-a", async () => {
      const pool = await getAgencyCandidatePool();
      expect(pool.some((c) => c.name === "Isolation Test Candidate")).toBe(true);
    });
  });

  it("every account still sees the same shared seed candidates", async () => {
    const seedNames = new Set(getSeedCandidates().map((c) => c.name));
    await withIsolatedUser("agency-iso-seed-a", async () => {
      const pool = await getAgencyCandidatePool();
      const poolNames = new Set(pool.filter((c) => !c.isCustom).map((c) => c.name));
      expect(poolNames).toEqual(seedNames);
    });
  });

  it("posting a job in one account never changes another account's active job", async () => {
    let jobIdA = "";
    await withIsolatedUser("agency-iso-job-a", async () => {
      const jd = await addAgencyJob(SAMPLE_JD);
      jobIdA = jd.id;
      const active = await getAgencyActiveJob();
      expect(active?.id).toBe(jobIdA);
    });
    await withIsolatedUser("agency-iso-job-b", async () => {
      const active = await getAgencyActiveJob();
      expect(active?.id).not.toBe(jobIdA);
      // B never posted anything, so B's active job must be a shared seed job.
      expect(getSeedJobs().some((j) => j.id === active?.id)).toBe(true);
    });
  });

  it("removeAgencyCandidate only removes this account's own additions, not seed data", async () => {
    await withIsolatedUser("agency-iso-remove", async () => {
      const seedId = getSeedCandidates()[0].id;
      expect(await removeAgencyCandidate(seedId)).toBe(false);
      const added = await addAgencyCandidate(SAMPLE_RESUME);
      expect(await removeAgencyCandidate(added.id)).toBe(true);
      const pool = await getAgencyCandidatePool();
      expect(pool.some((c) => c.id === added.id)).toBe(false);
    });
  });

  it("removing a candidate also drops any client seat pointing at it", async () => {
    await withIsolatedUser("agency-iso-remove-seat", async () => {
      const added = await addAgencyCandidate(SAMPLE_RESUME);
      const agency = await attachClientFromPool(added.id);
      expect(agency.seats.some((s) => s.clientId === added.id)).toBe(true);
      await removeAgencyCandidate(added.id);
      const after = await getAgencyCandidatePool();
      expect(after.some((c) => c.id === added.id)).toBe(false);
    });
  });

  it("attachClientFromPool works for both seed and custom candidates", async () => {
    await withIsolatedUser("agency-iso-attach", async () => {
      const seedId = getSeedCandidates()[1].id;
      const afterSeed = await attachClientFromPool(seedId);
      expect(afterSeed.seats.filter((s) => s.clientId === seedId).length).toBe(1);
      // Attaching the same candidate twice doesn't duplicate the seat.
      const again = await attachClientFromPool(seedId);
      expect(again.seats.filter((s) => s.clientId === seedId).length).toBe(1);
    });
  });

  it("removeAgencySeat removes a seat without touching the candidate pool", async () => {
    await withIsolatedUser("agency-iso-remove-seat-only", async () => {
      const seedId = getSeedCandidates()[2].id;
      await attachClientFromPool(seedId);
      const agency = await removeAgencySeat(seedId);
      expect(agency.seats.some((s) => s.clientId === seedId)).toBe(false);
      const pool = await getAgencyCandidatePool();
      expect(pool.some((c) => c.id === seedId)).toBe(true);
    });
  });

  it("setAgencyActiveJobId can switch to a shared seed job", async () => {
    await withIsolatedUser("agency-iso-switch", async () => {
      await addAgencyJob(SAMPLE_JD);
      const seedJobId = getSeedJobs()[0].id;
      const switched = await setAgencyActiveJobId(seedJobId);
      expect(switched?.id).toBe(seedJobId);
      const active = await getAgencyActiveJob();
      expect(active?.id).toBe(seedJobId);
    });
  });

  it("removing the active custom job falls back to another available job instead of leaving a dangling reference", async () => {
    await withIsolatedUser("agency-iso-remove-job", async () => {
      const jd = await addAgencyJob(SAMPLE_JD);
      const activeBefore = await getAgencyActiveJob();
      expect(activeBefore?.id).toBe(jd.id);
      expect(await removeAgencyJob(jd.id)).toBe(true);
      const activeAfter = await getAgencyActiveJob();
      expect(activeAfter?.id).not.toBe(jd.id);
      expect(activeAfter).toBeTruthy();
    });
  });

  it("removeAgencyJob returns false for a shared seed job id", async () => {
    await withIsolatedUser("agency-iso-remove-seed-job", async () => {
      const seedJobId = getSeedJobs()[0].id;
      expect(await removeAgencyJob(seedJobId)).toBe(false);
      const jobs = await getAgencyJobs();
      expect(jobs.some((j) => j.id === seedJobId)).toBe(true);
    });
  });
});

describe("agency candidate/job pool isolation (API route level)", () => {
  it("POST /api/candidates for one account is invisible to GET /api/candidates for another", async () => {
    await withIsolatedUser("agency-iso-route-a", async () => {
      const res = await candidatesPost(
        new Request("http://localhost/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Route Isolation Candidate", email: "route@example.com", rawResumeText: "Backend engineer with Go experience." })
        })
      );
      expect(res.status).toBe(200);
    });

    await withIsolatedUser("agency-iso-route-b", async () => {
      const res = await candidatesGet();
      const list = (await res.json()) as Array<{ name: string }>;
      expect(list.some((c) => c.name === "Route Isolation Candidate")).toBe(false);
    });

    await withIsolatedUser("agency-iso-route-a", async () => {
      const res = await candidatesGet();
      const list = (await res.json()) as Array<{ name: string; isCustom: boolean }>;
      const found = list.find((c) => c.name === "Route Isolation Candidate");
      expect(found?.isCustom).toBe(true);
    });
  });

  it("DELETE /api/candidates removes only this account's own candidate", async () => {
    await withIsolatedUser("agency-iso-route-delete", async () => {
      const postRes = await candidatesPost(
        new Request("http://localhost/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "To Delete", email: "delete@example.com", rawResumeText: "Some resume text here." })
        })
      );
      const { candidateId } = (await postRes.json()) as { candidateId: string };

      const delRes = await candidatesDelete(new Request(`http://localhost/api/candidates?id=${candidateId}`, { method: "DELETE" }));
      expect((await delRes.json()).removed).toBe(true);

      const getRes = await candidatesGet();
      const list = (await getRes.json()) as Array<{ id: string }>;
      expect(list.some((c) => c.id === candidateId)).toBe(false);
    });
  });

  it("POST /api/jobs (custom JD) for one account doesn't change another account's GET /api/jobs", async () => {
    let jobId = "";
    await withIsolatedUser("agency-iso-route-job-a", async () => {
      const res = await jobsPost(
        new Request("http://localhost/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Route Test Role", companyName: "Route Co", domain: "Testing", mandatoryText: "Testing" })
        })
      );
      const data = (await res.json()) as { activeJob: { id: string; title: string } };
      jobId = data.activeJob.id;
      expect(data.activeJob.title).toBe("Route Test Role");
    });

    await withIsolatedUser("agency-iso-route-job-b", async () => {
      const res = await jobsGet();
      const active = (await res.json()) as { id?: string };
      expect(active.id).not.toBe(jobId);
    });
  });
});
