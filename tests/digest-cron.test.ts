import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { createAccount, resetAccountsCache } from "@/lib/auth/accounts";
import { resetWorkspaceCache } from "@/lib/workspace-store";
import { parseResume } from "@/lib/parsers/resume-parser";
import { buildCareerVault } from "@/lib/engines/career-vault";
import { userIdFromEmail } from "@/lib/auth/user-id";
import { POST as digestPost } from "@/app/api/cron/digest/route";

const RESUME = `NAME: Jane Doe
EMAIL: jane@example.com
PHONE: 555-1212

WORK EXPERIENCE
Acme Corp, Senior Engineer, 2022-Present
- Built a real feature that shipped to production

SKILLS
Python, TypeScript, SQL`;

/** Fully sandboxes both the accounts store AND the per-user workspace
 *  directory tree for the digest cron route, which iterates every account
 *  and reads workspace files directly by id (bypassing the single
 *  RESUMEPROOF_WORKSPACE_FILE override every other test relies on) — so
 *  without this, a test here would read/write the real shared test
 *  accounts file and the real data/users/ directory on disk. */
async function withIsolatedAccountsAndData<T>(fn: (dataDir: string) => Promise<T>): Promise<T> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "digest-cron-test-"));
  const savedDataDir = process.env.RESUMEPROOF_DATA_DIR;
  const savedAccountsFile = process.env.RESUMEPROOF_ACCOUNTS_FILE;
  const savedCronSecret = process.env.CRON_SECRET;
  process.env.RESUMEPROOF_DATA_DIR = tmpDir;
  process.env.RESUMEPROOF_ACCOUNTS_FILE = path.join(tmpDir, "accounts.json");
  process.env.CRON_SECRET = "test-cron-secret";
  resetAccountsCache();
  resetWorkspaceCache();
  try {
    return await fn(tmpDir);
  } finally {
    if (savedDataDir) process.env.RESUMEPROOF_DATA_DIR = savedDataDir;
    else delete process.env.RESUMEPROOF_DATA_DIR;
    if (savedAccountsFile) process.env.RESUMEPROOF_ACCOUNTS_FILE = savedAccountsFile;
    else delete process.env.RESUMEPROOF_ACCOUNTS_FILE;
    if (savedCronSecret) process.env.CRON_SECRET = savedCronSecret;
    else delete process.env.CRON_SECRET;
    resetAccountsCache();
    resetWorkspaceCache();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function writeWorkspaceFor(dataDir: string, email: string, opts: { resumeText?: string; lastDigestSentAt?: string; lastDigestHealthPercent?: number } = {}) {
  const userId = userIdFromEmail(email);
  const dir = path.join(dataDir, "users", userId);
  fs.mkdirSync(dir, { recursive: true });
  const profile = parseResume("t1", opts.resumeText ?? RESUME);
  const vault = buildCareerVault(profile);
  const ws = {
    seeker: {
      profile,
      vault,
      versions: [],
      applications: [],
      activeJob: null,
      fit: null,
      suggestions: [],
      findings: [],
      lastDigestSentAt: opts.lastDigestSentAt,
      lastDigestHealthPercent: opts.lastDigestHealthPercent
    },
    agency: {
      name: "x",
      logoText: "x",
      brandColor: "#000",
      tier: "Coach",
      seats: [],
      customCandidates: [],
      customJobs: [],
      activeJobId: null
    }
  };
  fs.writeFileSync(path.join(dir, "workspace.json"), JSON.stringify(ws, null, 2));
  return userId;
}

function callDigestRoute(secret: string) {
  return digestPost(new Request("http://localhost/api/cron/digest", { method: "POST", headers: { authorization: `Bearer ${secret}` } }));
}

describe("POST /api/cron/digest", () => {
  it("rejects a request with no or wrong secret", async () => {
    await withIsolatedAccountsAndData(async () => {
      const wrongRes = await callDigestRoute("wrong-secret");
      expect(wrongRes.status).toBe(401);
      const noneRes = await digestPost(new Request("http://localhost/api/cron/digest", { method: "POST" }));
      expect(noneRes.status).toBe(401);
    });
  });

  it("sends a digest to an account with a saved resume and no prior digest", async () => {
    await withIsolatedAccountsAndData(async (dataDir) => {
      await createAccount("candidate-a@example.com", "password123");
      writeWorkspaceFor(dataDir, "candidate-a@example.com");

      const res = await callDigestRoute("test-cron-secret");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.processed).toBe(1);
      expect(data.sent).toBe(0); // no SMTP configured in test env — sendEmail() no-ops
      expect(data.results[0]).toMatchObject({ email: "candidate-a@example.com", sent: false });
    });
  });

  it("skips an account with no resume saved yet", async () => {
    await withIsolatedAccountsAndData(async (dataDir) => {
      await createAccount("empty-account@example.com", "password123");
      writeWorkspaceFor(dataDir, "empty-account@example.com", { resumeText: "" });

      const res = await callDigestRoute("test-cron-secret");
      const data = await res.json();
      expect(data.results[0]).toMatchObject({ email: "empty-account@example.com", sent: false, reason: "no_resume_saved" });
    });
  });

  it("skips an account digested too recently", async () => {
    await withIsolatedAccountsAndData(async (dataDir) => {
      await createAccount("recent-digest@example.com", "password123");
      writeWorkspaceFor(dataDir, "recent-digest@example.com", { lastDigestSentAt: new Date().toISOString(), lastDigestHealthPercent: 50 });

      const res = await callDigestRoute("test-cron-secret");
      const data = await res.json();
      expect(data.results[0]).toMatchObject({ email: "recent-digest@example.com", sent: false, reason: "too_soon" });
    });
  });

  it("does not skip an account whose last digest was over a week ago", async () => {
    await withIsolatedAccountsAndData(async (dataDir) => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await createAccount("stale-digest@example.com", "password123");
      writeWorkspaceFor(dataDir, "stale-digest@example.com", { lastDigestSentAt: eightDaysAgo, lastDigestHealthPercent: 50 });

      const res = await callDigestRoute("test-cron-secret");
      const data = await res.json();
      expect(data.results[0].reason).not.toBe("too_soon");
    });
  });

  it("handles an account with no workspace file at all without crashing", async () => {
    await withIsolatedAccountsAndData(async () => {
      await createAccount("no-workspace@example.com", "password123");
      const res = await callDigestRoute("test-cron-secret");
      const data = await res.json();
      expect(data.results[0]).toMatchObject({ email: "no-workspace@example.com", sent: false, reason: "no_workspace" });
    });
  });

  it("processes multiple accounts independently", async () => {
    await withIsolatedAccountsAndData(async (dataDir) => {
      await createAccount("multi-a@example.com", "password123");
      await createAccount("multi-b@example.com", "password123");
      writeWorkspaceFor(dataDir, "multi-a@example.com");
      writeWorkspaceFor(dataDir, "multi-b@example.com", { resumeText: "" });

      const res = await callDigestRoute("test-cron-secret");
      const data = await res.json();
      expect(data.processed).toBe(2);
      const byEmail = Object.fromEntries(data.results.map((r: { email: string; reason?: string }) => [r.email, r.reason]));
      expect(byEmail["multi-b@example.com"]).toBe("no_resume_saved");
    });
  });

  it("returns 501 when CRON_SECRET is not configured", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await digestPost(new Request("http://localhost/api/cron/digest", { method: "POST" }));
      expect(res.status).toBe(501);
    } finally {
      if (saved) process.env.CRON_SECRET = saved;
    }
  });
});
