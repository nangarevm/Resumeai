import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import { setSeekerProfile, snapshot, restoreVersion, getSeeker, resetWorkspaceCache } from "@/lib/workspace-store";

/** Isolates each test to its own per-user workspace file, following the
 *  same pattern platform.test.ts already uses — temporarily unset the
 *  shared RESUMEPROOF_WORKSPACE_FILE so RESUMEPROOF_WORKSPACE_USER takes
 *  effect, then restore it afterward. */
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

describe("resume version history", () => {
  it("snapshots on every setSeekerProfile save, most recent first", async () => {
    await withIsolatedUser("ver-test-a", async () => {
      await setSeekerProfile(parseResume("a", "NAME: A\nEMAIL: a@test.com\nSUMMARY\nFirst draft."));
      await setSeekerProfile(parseResume("a", "NAME: A\nEMAIL: a@test.com\nSUMMARY\nSecond draft."));
      const seeker = await getSeeker();
      expect(seeker.versions.length).toBeGreaterThanOrEqual(2);
      expect(seeker.versions[0].snapshot).toContain("Second draft");
      expect(seeker.versions[1].snapshot).toContain("First draft");
    });
  });

  it("caps auto-history at 20 entries (pinned resumes are capped separately — see named-resumes.test.ts)", async () => {
    await withIsolatedUser("ver-test-cap", async () => {
      for (let i = 0; i < 35; i++) {
        await snapshot(`save ${i}`, `SUMMARY\nDraft ${i}`);
      }
      const seeker = await getSeeker();
      expect(seeker.versions.length).toBe(20);
      expect(seeker.versions[0].reason).toBe("save 34");
    });
  });

  it("restores an earlier version and preserves the pre-restore state as its own version", async () => {
    await withIsolatedUser("ver-test-restore", async () => {
      await setSeekerProfile(parseResume("r", "NAME: R\nEMAIL: r@test.com\nSUMMARY\nOriginal summary."));
      const afterFirst = await getSeeker();
      const originalVersionId = afterFirst.versions[0].id;

      await setSeekerProfile(parseResume("r", "NAME: R\nEMAIL: r@test.com\nSUMMARY\nEdited summary."));
      const beforeRestore = await getSeeker();
      expect(beforeRestore.profile.rawResumeText).toContain("Edited summary");

      const result = await restoreVersion(originalVersionId);
      expect(result).not.toBe("not_found");
      if (result === "not_found") return;
      expect(result.profile.rawResumeText).toContain("Original summary");
      expect(result.versions[0].reason).toMatch(/^Restored from/);
      // The edited version is still in history, not destroyed by the restore.
      expect(result.versions.some((v) => v.snapshot.includes("Edited summary"))).toBe(true);
    });
  });

  it("returns not_found for an unknown version id", async () => {
    await withIsolatedUser("ver-test-missing", async () => {
      await setSeekerProfile(parseResume("m", "NAME: M\nEMAIL: m@test.com"));
      expect(await restoreVersion("ver-does-not-exist")).toBe("not_found");
    });
  });
});
