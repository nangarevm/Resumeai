import { describe, expect, it } from "vitest";
import { recordAuditEvent, getAuditLog } from "@/lib/audit-log";
import { DELETE as candidatesDelete } from "@/app/api/candidates/route";
import { DELETE as jobsDelete } from "@/app/api/jobs/route";
import { DELETE as agencyDelete, POST as agencyPost } from "@/app/api/agency/route";
import { GET as clientBriefGet } from "@/app/api/client-brief/route";
import { DELETE as privacyDelete } from "@/app/api/privacy/route";
import { GET as auditLogGet } from "@/app/api/audit-log/route";
import { addAgencyCandidate, addAgencyJob, attachClientFromPool, resetWorkspaceCache } from "@/lib/workspace-store";

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

describe("audit-log core", () => {
  it("records an event and reads it back for the same actor", async () => {
    const actor = uniqueUserId("audit-core");
    await recordAuditEvent(actor, "delete", "candidate:abc", "Jane Doe");
    const events = await getAuditLog(actor);
    expect(events.length).toBe(1);
    expect(events[0]).toMatchObject({ actor, action: "delete", target: "candidate:abc", detail: "Jane Doe" });
    expect(typeof events[0].id).toBe("string");
    expect(typeof events[0].timestamp).toBe("string");
  });

  it("never returns another actor's events", async () => {
    const actorA = uniqueUserId("audit-iso-a");
    const actorB = uniqueUserId("audit-iso-b");
    await recordAuditEvent(actorA, "delete", "own-vault");
    await recordAuditEvent(actorB, "view", "candidate-brief:xyz");
    const eventsA = await getAuditLog(actorA);
    const eventsB = await getAuditLog(actorB);
    expect(eventsA.length).toBe(1);
    expect(eventsA[0].target).toBe("own-vault");
    expect(eventsB.length).toBe(1);
    expect(eventsB[0].target).toBe("candidate-brief:xyz");
  });

  it("returns events newest-first", async () => {
    const actor = uniqueUserId("audit-order");
    await recordAuditEvent(actor, "delete", "candidate:1");
    await recordAuditEvent(actor, "delete", "candidate:2");
    await recordAuditEvent(actor, "delete", "candidate:3");
    const events = await getAuditLog(actor);
    expect(events.map((e) => e.target)).toEqual(["candidate:3", "candidate:2", "candidate:1"]);
  });

  it("respects the limit parameter", async () => {
    const actor = uniqueUserId("audit-limit");
    for (let i = 0; i < 5; i++) {
      await recordAuditEvent(actor, "delete", `candidate:${i}`);
    }
    const events = await getAuditLog(actor, 2);
    expect(events.length).toBe(2);
    expect(events.map((e) => e.target)).toEqual(["candidate:4", "candidate:3"]);
  });

  it("returns an empty array for an actor with no events", async () => {
    const events = await getAuditLog(uniqueUserId("audit-none"));
    expect(events).toEqual([]);
  });
});

describe("audit trail wired into routes", () => {
  it("logs a delete event when a candidate is removed", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-candidate"), async () => {
      const profile = await addAgencyCandidate("NAME: Route Test\nEMAIL: route-test@example.com\n\nWORK EXPERIENCE\nAcme | Engineer | 2022-Present\n- Built something real");
      await candidatesDelete(new Request(`http://localhost/api/candidates?id=${profile.id}`, { method: "DELETE" }));
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string; target: string }>;
      expect(events.some((e) => e.action === "delete" && e.target === `candidate:${profile.id}`)).toBe(true);
    });
  });

  it("does not log a delete event when the candidate id does not exist", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-candidate-miss"), async () => {
      await candidatesDelete(new Request("http://localhost/api/candidates?id=nonexistent", { method: "DELETE" }));
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string }>;
      expect(events.length).toBe(0);
    });
  });

  it("logs a delete event when a job is removed", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-job"), async () => {
      const jd = await addAgencyJob("POSITION: Engineer\nCOMPANY: Acme\n\nMANDATORY REQUIREMENTS:\n- SQL");
      await jobsDelete(new Request(`http://localhost/api/jobs?id=${jd.id}`, { method: "DELETE" }));
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string; target: string }>;
      expect(events.some((e) => e.action === "delete" && e.target === `job:${jd.id}`)).toBe(true);
    });
  });

  it("logs a delete event when a client seat is removed", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-seat"), async () => {
      const profile = await addAgencyCandidate("NAME: Seat Candidate\nEMAIL: seat-candidate@example.com\n\nWORK EXPERIENCE\nAcme | Engineer | 2022-Present\n- Built something real");
      await attachClientFromPool(profile.id);
      await agencyDelete(new Request(`http://localhost/api/agency?clientId=${profile.id}`, { method: "DELETE" }));
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string; target: string }>;
      expect(events.some((e) => e.action === "delete" && e.target === `seat:${profile.id}`)).toBe(true);
    });
  });

  it("logs an export event when a shortlist CSV export is recorded", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-export"), async () => {
      await agencyPost(
        new Request("http://localhost/api/agency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incrementUsage: "shortlistsExported" })
        })
      );
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string; target: string }>;
      expect(events.some((e) => e.action === "export" && e.target === "shortlist-csv")).toBe(true);
    });
  });

  it("does not log an export event for other usage counters", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-export-other"), async () => {
      await agencyPost(
        new Request("http://localhost/api/agency", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incrementUsage: "analyzesRun" })
        })
      );
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string }>;
      expect(events.some((e) => e.action === "export")).toBe(false);
    });
  });

  it("logs a view event when a client brief is generated", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-brief"), async () => {
      const profile = await addAgencyCandidate("NAME: Brief Candidate\nEMAIL: brief-candidate@example.com\n\nWORK EXPERIENCE\nAcme | Engineer | 2022-Present\n- Built something real");
      await clientBriefGet(new Request(`http://localhost/api/client-brief?candidateId=${profile.id}`));
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string; target: string; detail?: string }>;
      const entry = events.find((e) => e.action === "view" && e.target === `candidate-brief:${profile.id}`);
      expect(entry).toBeTruthy();
      expect(entry?.detail).toBe("Brief Candidate");
    });
  });

  it("logs a delete event for own-vault when the seeker deletes their data", async () => {
    await withIsolatedUser(uniqueUserId("audit-route-vault"), async () => {
      await privacyDelete();
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string; target: string }>;
      expect(events.some((e) => e.action === "delete" && e.target === "own-vault")).toBe(true);
    });
  });

  it("keeps audit trails isolated per account across routes", async () => {
    const userA = uniqueUserId("audit-cross-a");
    const userB = uniqueUserId("audit-cross-b");
    await withIsolatedUser(userA, async () => {
      await privacyDelete();
    });
    await withIsolatedUser(userB, async () => {
      const log = await auditLogGet();
      const events = (await log.json()) as Array<{ action: string }>;
      expect(events.length).toBe(0);
    });
  });
});
