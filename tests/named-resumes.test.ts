import { describe, expect, it } from "vitest";
import { parseResume } from "@/lib/parsers/resume-parser";
import {
  setSeekerProfile,
  snapshot,
  pinCurrentResume,
  renamePinnedVersion,
  deletePinnedVersion,
  restoreVersion,
  getSeeker,
  resetWorkspaceCache
} from "@/lib/workspace-store";

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

describe("named / pinned resumes (multi-resume support)", () => {
  it("pins the current resume under a given name", async () => {
    await withIsolatedUser("named-a", async () => {
      await setSeekerProfile(parseResume("a", "NAME: A\nEMAIL: a@test.com\nSUMMARY\nFrontend-flavored resume."));
      const pinned = await pinCurrentResume("Frontend Resume");
      expect(pinned.pinned).toBe(true);
      expect(pinned.reason).toBe("Frontend Resume");

      const seeker = await getSeeker();
      const found = seeker.versions.find((v) => v.id === pinned.id);
      expect(found?.snapshot).toContain("Frontend-flavored resume");
    });
  });

  it("switching to a named resume makes it the current profile, labeled distinctly from a plain restore", async () => {
    await withIsolatedUser("named-b", async () => {
      await setSeekerProfile(parseResume("b", "NAME: B\nEMAIL: b@test.com\nSUMMARY\nOriginal."));
      const pinned = await pinCurrentResume("Backend Resume");

      await setSeekerProfile(parseResume("b", "NAME: B\nEMAIL: b@test.com\nSUMMARY\nSomething else entirely."));

      const result = await restoreVersion(pinned.id);
      expect(result).not.toBe("not_found");
      if (result === "not_found") return;
      expect(result.profile.rawResumeText).toContain("Original");
      expect(result.versions[0].reason).toBe('Switched to "Backend Resume"');
    });
  });

  it("renames and deletes a pinned resume", async () => {
    await withIsolatedUser("named-c", async () => {
      await setSeekerProfile(parseResume("c", "NAME: C\nEMAIL: c@test.com"));
      const pinned = await pinCurrentResume("Draft Name");

      const renamed = await renamePinnedVersion(pinned.id, "Final Name");
      expect(renamed).not.toBe("not_found");
      if (renamed === "not_found") return;
      expect(renamed.reason).toBe("Final Name");

      const deleted = await deletePinnedVersion(pinned.id);
      expect(deleted).toBe(true);
      const seeker = await getSeeker();
      expect(seeker.versions.some((v) => v.id === pinned.id)).toBe(false);
    });
  });

  it("rename/delete return not_found / false for a non-pinned or missing id", async () => {
    await withIsolatedUser("named-d", async () => {
      const autoSave = await setSeekerProfile(parseResume("d", "NAME: D\nEMAIL: d@test.com"));
      const autoVersionId = autoSave.versions[0].id;

      // Auto-save entries aren't pinned — rename/delete must reject them.
      expect(await renamePinnedVersion(autoVersionId, "Should not work")).toBe("not_found");
      expect(await deletePinnedVersion(autoVersionId)).toBe(false);
      expect(await renamePinnedVersion("ver-does-not-exist", "x")).toBe("not_found");
    });
  });

  it("pinned resumes are exempt from the auto-history cap", async () => {
    await withIsolatedUser("named-e", async () => {
      await setSeekerProfile(parseResume("e", "NAME: E\nEMAIL: e@test.com"));
      const pinned = await pinCurrentResume("Keep Me Forever");

      // Push well past the auto-history cap with ordinary (unpinned) saves.
      for (let i = 0; i < 25; i++) {
        await snapshot(`auto save ${i}`, `SUMMARY\nDraft ${i}`);
      }

      const seeker = await getSeeker();
      expect(seeker.versions.some((v) => v.id === pinned.id)).toBe(true);
      const autoCount = seeker.versions.filter((v) => !v.pinned).length;
      expect(autoCount).toBeLessThanOrEqual(20);
    });
  });

  it("caps the number of pinned resumes independently", async () => {
    await withIsolatedUser("named-f", async () => {
      await setSeekerProfile(parseResume("f", "NAME: F\nEMAIL: f@test.com"));
      for (let i = 0; i < 15; i++) {
        await pinCurrentResume(`Resume ${i}`);
      }
      const seeker = await getSeeker();
      const pinnedCount = seeker.versions.filter((v) => v.pinned).length;
      expect(pinnedCount).toBeLessThanOrEqual(10);
      // Most recently pinned ones survive, not the earliest.
      expect(seeker.versions.some((v) => v.pinned && v.reason === "Resume 14")).toBe(true);
    });
  });
});
