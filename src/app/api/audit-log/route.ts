import { NextResponse } from "next/server";
import { getAuditLog } from "@/lib/audit-log";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await bindWorkspaceUser();
  return NextResponse.json(await getAuditLog(userId, 20));
}
