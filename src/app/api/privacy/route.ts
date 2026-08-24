import { NextResponse } from "next/server";
import { exportWorkspace, resetSeekerWorkspace } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { recordAuditEvent } from "@/lib/audit-log";
import { revokeShare } from "@/lib/shares";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await exportWorkspace());
}

export async function DELETE() {
  const userId = await bindWorkspaceUser();
  revokeShare(userId);
  const seeker = await resetSeekerWorkspace();
  await recordAuditEvent(userId, "delete", "own-vault");
  return NextResponse.json({ seeker, deleted: true });
}
