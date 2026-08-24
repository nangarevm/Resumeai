import { describe, expect, it } from "vitest";
import { resetWorkspaceCache } from "@/lib/workspace-store";
import { getSeedCandidates } from "@/lib/store";
import { POST as candidatesPost } from "@/app/api/candidates/route";
import { POST as bulkCandidatesPost } from "@/app/api/bulk-candidates/route";
import { POST as agencyPost } from "@/app/api/agency/route";
import { TIER_LIMITS } from "@/lib/agency/tier-limits";

/** Same isolation pattern as agency-isolation.test.ts / duplicate-detection.test.ts. */
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

function uniqueUserId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resume(name: string, email: string): string {
  return `NAME: ${name}\nEMAIL: ${email}\nSKILLS:\nPython, SQL\n\nWORK EXPERIENCE\nAcme, Engineer, 2022-Present\n- Built something real`;
}

async function setAgencyState(patch: Record<string, unknown>) {
  return agencyPost(
    new Request("http://localhost/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    })
  );
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

describe("agency tier enforcement — candidates", () => {
  it("blocks adding a single candidate once the monthly limit is reached", async () => {
    await withIsolatedUser(uniqueUserId("tier-cand-block"), async () => {
      const limit = TIER_LIMITS.Coach.maxCandidatesPerMonth;
      await setAgencyState({ tier: "Coach", usageMeters: { monthKey: CURRENT_MONTH, candidatesAdded: limit, analyzesRun: 0, shortlistsExported: 0 } });
      const res = await candidatesPost(
        new Request("http://localhost/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Blocked Candidate", email: "blocked@example.com", rawResumeText: resume("Blocked Candidate", "blocked@example.com") })
        })
      );
      expect(res.status).toBe(402);
      const data = await res.json();
      expect(data.error).toMatch(/Coach/);
      expect(data.error).toMatch(String(limit));
    });
  });

  it("allows adding a candidate one below the monthly limit", async () => {
    await withIsolatedUser(uniqueUserId("tier-cand-allow"), async () => {
      const limit = TIER_LIMITS.Coach.maxCandidatesPerMonth;
      await setAgencyState({ tier: "Coach", usageMeters: { monthKey: CURRENT_MONTH, candidatesAdded: limit - 1, analyzesRun: 0, shortlistsExported: 0 } });
      const res = await candidatesPost(
        new Request("http://localhost/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Allowed Candidate", email: "allowed@example.com", rawResumeText: resume("Allowed Candidate", "allowed@example.com") })
        })
      );
      expect(res.status).toBe(200);
    });
  });

  it("stops a bulk upload partway through once the remaining monthly capacity is used up", async () => {
    await withIsolatedUser(uniqueUserId("tier-cand-bulk"), async () => {
      const limit = TIER_LIMITS.Coach.maxCandidatesPerMonth;
      await setAgencyState({ tier: "Coach", usageMeters: { monthKey: CURRENT_MONTH, candidatesAdded: limit - 2, analyzesRun: 0, shortlistsExported: 0 } });
      const resumes = [
        resume("Bulk One", "bulk-one@example.com"),
        resume("Bulk Two", "bulk-two@example.com"),
        resume("Bulk Three", "bulk-three@example.com"),
        resume("Bulk Four", "bulk-four@example.com")
      ];
      const res = await bulkCandidatesPost(
        new Request("http://localhost/api/bulk-candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumes })
        })
      );
      const data = await res.json();
      expect(data.count).toBe(2);
      expect(data.errors.some((e: string) => e.includes("limit reached"))).toBe(true);
      expect(data.errors.filter((e: string) => e.includes("limit reached")).length).toBe(2);
    });
  });
});

describe("agency tier enforcement — client seats", () => {
  it("blocks adding a new client seat once the seat limit is reached", async () => {
    await withIsolatedUser(uniqueUserId("tier-seat-block"), async () => {
      const limit = TIER_LIMITS.Coach.maxSeats;
      const fakeSeats = Array.from({ length: limit }, (_, i) => ({
        clientId: `fake-seat-${i}`,
        clientName: `Fake Seat ${i}`,
        status: "Active",
        progress: "In review"
      }));
      await setAgencyState({ tier: "Coach", seats: fakeSeats });
      const candidateId = getSeedCandidates()[0].id;
      const res = await setAgencyState({ clientId: candidateId });
      expect(res.status).toBe(402);
      const data = await res.json();
      expect(data.error).toMatch(/Coach/);
      expect(data.error).toMatch(String(limit));
    });
  });

  it("does not block re-adding a client who already has a seat, even at the limit", async () => {
    await withIsolatedUser(uniqueUserId("tier-seat-noop"), async () => {
      const limit = TIER_LIMITS.Coach.maxSeats;
      const seedId = getSeedCandidates()[0].id;
      const fakeSeats = [
        { clientId: seedId, clientName: "Already Seated", status: "Active", progress: "In review" },
        ...Array.from({ length: limit - 1 }, (_, i) => ({
          clientId: `fake-seat-${i}`,
          clientName: `Fake Seat ${i}`,
          status: "Active",
          progress: "In review"
        }))
      ];
      await setAgencyState({ tier: "Coach", seats: fakeSeats });
      const res = await setAgencyState({ clientId: seedId });
      expect(res.status).toBe(200);
    });
  });
});
