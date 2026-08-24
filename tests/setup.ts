import fs from "fs";
import os from "os";
import path from "path";

const testWorkspace = path.join(os.tmpdir(), `resumeproof-test-${process.pid}-${Date.now()}.json`);
const testAccounts = path.join(os.tmpdir(), `resumeproof-test-accounts-${process.pid}-${Date.now()}.json`);
const testShares = path.join(os.tmpdir(), `resumeproof-test-shares-${process.pid}-${Date.now()}.json`);
const testAuditLog = path.join(os.tmpdir(), `resumeproof-test-audit-${process.pid}-${Date.now()}.jsonl`);

process.env.RESUMEPROOF_WORKSPACE_FILE = testWorkspace;
process.env.RESUMEPROOF_ACCOUNTS_FILE = testAccounts;
process.env.RESUMEPROOF_SHARES_FILE = testShares;
process.env.RESUMEPROOF_AUDIT_LOG_FILE = testAuditLog;
process.env.RESUMEPROOF_TEST_MODE = "1";
process.env.NEXTAUTH_SECRET = "resumeproof-test-secret";

import { beforeEach } from "vitest";
import { resetWorkspaceCache } from "@/lib/workspace-store";
import { resetAccountsCache } from "@/lib/auth/accounts";
import { resetSharesCache } from "@/lib/shares";
import { resetRateLimits } from "@/lib/auth/rate-limit";

beforeEach(() => {
  resetWorkspaceCache();
  resetAccountsCache();
  resetSharesCache();
  resetRateLimits();
});

if (fs.existsSync(testWorkspace)) {
  fs.unlinkSync(testWorkspace);
}
if (fs.existsSync(testAccounts)) {
  fs.unlinkSync(testAccounts);
}
if (fs.existsSync(testShares)) {
  fs.unlinkSync(testShares);
}
if (fs.existsSync(testAuditLog)) {
  fs.unlinkSync(testAuditLog);
}
