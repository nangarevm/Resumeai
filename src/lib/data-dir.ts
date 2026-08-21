import path from "path";

/** Base directory for all file-backed data storage (per-user workspaces,
 *  accounts, shares, market caches). Defaults to <cwd>/data, matching this
 *  app's original behavior. Set RESUMEPROOF_DATA_DIR to relocate all of it
 *  at once — e.g. onto a persistent volume mount on a hosting platform —
 *  instead of needing a separate override for every individual store file.
 *  Per-store overrides (RESUMEPROOF_WORKSPACE_FILE etc.) still take
 *  priority over this when set, for existing test isolation. */
export function dataDir(): string {
  return process.env.RESUMEPROOF_DATA_DIR || path.join(process.cwd(), "data");
}
