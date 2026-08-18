import fs from "fs";
import os from "os";
import path from "path";

const testWorkspace = path.join(os.tmpdir(), `resumeproof-test-${process.pid}-${Date.now()}.json`);

process.env.RESUMEPROOF_WORKSPACE_FILE = testWorkspace;
process.env.RESUMEPROOF_TEST_MODE = "1";
process.env.NEXTAUTH_SECRET = "resumeproof-test-secret";

import { beforeEach } from "vitest";
import { resetWorkspaceCache } from "@/lib/workspace-store";

beforeEach(() => {
  resetWorkspaceCache();
});

if (fs.existsSync(testWorkspace)) {
  fs.unlinkSync(testWorkspace);
}
