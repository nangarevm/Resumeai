import { describe, expect, it } from "vitest";
import { POST as bulkCandidatesPost } from "@/app/api/bulk-candidates/route";
import { resetWorkspaceCache } from "@/lib/workspace-store";
import { getSeedCandidates } from "@/lib/store";

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

// Every test here asserts an exact count/duplicate-list, and
// addAgencyCandidate is not idempotent — a fixed user id would silently
// accumulate real leftover candidates across separate local test runs
// (data/users/** isn't wiped between invocations), so each test gets its
// own always-fresh directory instead.
function uniqueUserId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resume(name: string, email: string): string {
  return `NAME: ${name}\nEMAIL: ${email}\nSKILLS:\nPython, SQL\n\nWORK EXPERIENCE\nAcme | Engineer | 2022-Present\n- Built something real`;
}

async function bulkUpload(resumes: string[]) {
  const res = await bulkCandidatesPost(
    new Request("http://localhost/api/bulk-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumes })
    })
  );
  return res.json() as Promise<{ added: Array<{ name: string }>; duplicates: Array<{ name: string; email: string }>; errors: string[]; count: number }>;
}

describe("POST /api/bulk-candidates duplicate detection", () => {
  it("flags a bulk-uploaded candidate whose email already exists in the pool as a duplicate, not a new add", async () => {
    await withIsolatedUser(uniqueUserId("dup-existing"), async () => {
      const seedEmail = getSeedCandidates()[0].email;
      const data = await bulkUpload([resume("Impersonator", seedEmail)]);
      expect(data.count).toBe(0);
      expect(data.duplicates.length).toBe(1);
      expect(data.duplicates[0].email.toLowerCase()).toBe(seedEmail.toLowerCase());
    });
  });

  it("flags the second occurrence of the same email within one batch, keeping the first", async () => {
    await withIsolatedUser(uniqueUserId("dup-intra-batch"), async () => {
      const data = await bulkUpload([resume("Original", "dupe@example.com"), resume("Duplicate Copy", "dupe@example.com")]);
      expect(data.count).toBe(1);
      expect(data.added[0].name).toBe("Original");
      expect(data.duplicates.length).toBe(1);
      expect(data.duplicates[0].name).toBe("Duplicate Copy");
    });
  });

  it("is case-insensitive when matching emails", async () => {
    await withIsolatedUser(uniqueUserId("dup-case"), async () => {
      await bulkUpload([resume("First", "Case@Example.com")]);
      const data = await bulkUpload([resume("Second", "case@example.com")]);
      expect(data.count).toBe(0);
      expect(data.duplicates.length).toBe(1);
    });
  });

  it("does not flag two candidates with no email as duplicates of each other", async () => {
    await withIsolatedUser(uniqueUserId("dup-no-email"), async () => {
      const data = await bulkUpload([
        "NAME: No Email One\nSKILLS:\nPython\n\nWORK EXPERIENCE\nAcme | Engineer | 2022-Present\n- Did real engineering work here",
        "NAME: No Email Two\nSKILLS:\nSQL\n\nWORK EXPERIENCE\nAcme | Engineer | 2022-Present\n- Did other real engineering work"
      ]);
      expect(data.count).toBe(2);
      expect(data.duplicates.length).toBe(0);
    });
  });

  it("adds a genuinely new candidate normally when there's no duplicate", async () => {
    await withIsolatedUser(uniqueUserId("dup-new"), async () => {
      const data = await bulkUpload([resume("Brand New Candidate", "brand-new@example.com")]);
      expect(data.count).toBe(1);
      expect(data.duplicates.length).toBe(0);
      expect(data.added[0].name).toBe("Brand New Candidate");
    });
  });
});
