import fs from "fs";
import os from "os";
import path from "path";

const testWorkspace = path.join(os.tmpdir(), `resumeproof-test-${process.pid}-${Date.now()}.json`);
const testAccounts = path.join(os.tmpdir(), `resumeproof-test-accounts-${process.pid}-${Date.now()}.json`);

process.env.RESUMEPROOF_WORKSPACE_FILE = testWorkspace;
process.env.RESUMEPROOF_ACCOUNTS_FILE = testAccounts;
process.env.RESUMEPROOF_TEST_MODE = "1";
process.env.NEXTAUTH_SECRET = "resumeproof-test-secret";

import { beforeEach } from "vitest";
import { resetWorkspaceCache } from "@/lib/workspace-store";
import { resetAccountsCache } from "@/lib/auth/accounts";

beforeEach(() => {
  resetWorkspaceCache();
  resetAccountsCache();
});

if (fs.existsSync(testWorkspace)) {
  fs.unlinkSync(testWorkspace);
}
if (fs.existsSync(testAccounts)) {
  fs.unlinkSync(testAccounts);
}
