import { describe, expect, it } from "vitest";
import { POST as photoPost, DELETE as photoDelete } from "@/app/api/photo/route";
import { setSeekerPhoto, getSeeker, resetWorkspaceCache } from "@/lib/workspace-store";

/** Same isolation pattern as version-history.test.ts / named-resumes.test.ts:
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

const TINY_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function pngFormData(base64 = TINY_PNG_BASE64, filename = "headshot.png"): FormData {
  const bytes = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/png" }), filename);
  return form;
}

describe("setSeekerPhoto (workspace-store)", () => {
  it("sets a photo without touching versions or vault", async () => {
    await withIsolatedUser("photo-store-a", async () => {
      const before = await getSeeker();
      const versionCountBefore = before.versions.length;
      await setSeekerPhoto("data:image/png;base64,abc123");
      const after = await getSeeker();
      expect(after.profile.photoDataUrl).toBe("data:image/png;base64,abc123");
      expect(after.versions.length).toBe(versionCountBefore);
    });
  });

  it("clears a photo when passed null", async () => {
    await withIsolatedUser("photo-store-b", async () => {
      await setSeekerPhoto("data:image/png;base64,abc123");
      await setSeekerPhoto(null);
      const seeker = await getSeeker();
      expect(seeker.profile.photoDataUrl).toBeUndefined();
    });
  });
});

describe("POST /api/photo", () => {
  it("uploads a valid PNG and persists it as a data URI", async () => {
    await withIsolatedUser("photo-api-a", async () => {
      const res = await photoPost(new Request("http://localhost/api/photo", { method: "POST", body: pngFormData() }));
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.profile.photoDataUrl).toMatch(/^data:image\/png;base64,/);

      const seeker = await getSeeker();
      expect(seeker.profile.photoDataUrl).toBe(data.profile.photoDataUrl);
    });
  });

  it("rejects a non-image file", async () => {
    await withIsolatedUser("photo-api-b", async () => {
      const form = new FormData();
      form.append("file", new Blob(["not a photo"], { type: "text/plain" }), "notes.txt");
      const res = await photoPost(new Request("http://localhost/api/photo", { method: "POST", body: form }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/JPEG, PNG, or WEBP/);
    });
  });

  it("rejects a file over the size cap", async () => {
    await withIsolatedUser("photo-api-c", async () => {
      const big = new Uint8Array(1.6 * 1024 * 1024);
      const form = new FormData();
      form.append("file", new Blob([big], { type: "image/png" }), "huge.png");
      const res = await photoPost(new Request("http://localhost/api/photo", { method: "POST", body: form }));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/too large/);
    });
  });

  it("requires a file field", async () => {
    await withIsolatedUser("photo-api-d", async () => {
      const res = await photoPost(new Request("http://localhost/api/photo", { method: "POST", body: new FormData() }));
      expect(res.status).toBe(400);
    });
  });
});

describe("DELETE /api/photo", () => {
  it("removes a previously uploaded photo", async () => {
    await withIsolatedUser("photo-api-e", async () => {
      await photoPost(new Request("http://localhost/api/photo", { method: "POST", body: pngFormData() }));
      const res = await photoDelete();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.profile.photoDataUrl).toBeUndefined();

      const seeker = await getSeeker();
      expect(seeker.profile.photoDataUrl).toBeUndefined();
    });
  });
});
