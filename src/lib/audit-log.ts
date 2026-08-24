import fs from "fs";
import path from "path";
import { dataDir } from "./data-dir";

export type AuditAction = "view" | "export" | "delete";

export interface AuditEvent {
  id: string;
  actor: string;
  action: AuditAction;
  target: string;
  detail?: string;
  timestamp: string;
}

function auditLogFile(): string {
  return process.env.RESUMEPROOF_AUDIT_LOG_FILE || path.join(dataDir(), "audit", "audit-log.jsonl");
}

/** Append-only JSONL log — one event per line, never rewritten or
 *  truncated. Deliberately no in-memory cache and no read-modify-write:
 *  each call is a single fs.appendFileSync, so concurrent writers from
 *  different requests can never clobber each other's entries the way a
 *  read-whole-file-then-write-whole-file store could. */
export async function recordAuditEvent(actor: string, action: AuditAction, target: string, detail?: string): Promise<void> {
  const file = auditLogFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(/* turbopackIgnore: true */ dir)) fs.mkdirSync(dir, { recursive: true });
  const event: AuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actor,
    action,
    target,
    detail,
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync(/* turbopackIgnore: true */ file, `${JSON.stringify(event)}\n`);
}

/** Always scoped to one actor — there's no admin/cross-account role in this
 *  app, and given the cross-tenant isolation bug fixed earlier this
 *  session, an audit log endpoint that could return another account's
 *  events would just be the same class of bug again. Callers pass the
 *  requesting account's own resolved user id, never an arbitrary one. */
export async function getAuditLog(actor: string, limit = 50): Promise<AuditEvent[]> {
  const file = auditLogFile();
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) return [];
  const lines = fs
    .readFileSync(/* turbopackIgnore: true */ file, "utf8")
    .split("\n")
    .filter(Boolean);
  const events: AuditEvent[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line) as AuditEvent);
    } catch {
      /* skip a malformed line rather than fail the whole read */
    }
  }
  return events
    .filter((e) => e.actor === actor)
    .reverse()
    .slice(0, limit);
}
