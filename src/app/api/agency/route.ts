import { NextResponse } from "next/server";
import { attachClientFromPool, getAgency, incrementAgencyUsage, removeAgencySeat, updateAgency, updateSeatNotes } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { recordAuditEvent } from "@/lib/audit-log";
import type { AgencyWorkspace } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  await bindWorkspaceUser();
  return NextResponse.json(await getAgency());
}

export async function DELETE(request: Request) {
  const userId = await bindWorkspaceUser();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });
  const agency = await removeAgencySeat(clientId);
  await recordAuditEvent(userId, "delete", `seat:${clientId}`);
  return NextResponse.json(agency);
}

export async function POST(request: Request) {
  const userId = await bindWorkspaceUser();
  const body = (await request.json()) as Partial<AgencyWorkspace> & {
    clientId?: string;
    notes?: string;
    incrementUsage?: "analyzesRun" | "candidatesAdded" | "shortlistsExported";
  };
  if (body.incrementUsage) {
    if (body.incrementUsage === "shortlistsExported") await recordAuditEvent(userId, "export", "shortlist-csv");
    return NextResponse.json(await incrementAgencyUsage(body.incrementUsage));
  }
  if (body.clientId && typeof body.notes === "string") {
    return NextResponse.json(await updateSeatNotes(body.clientId, body.notes));
  }
  if (body.clientId) return NextResponse.json(await attachClientFromPool(body.clientId));
  return NextResponse.json(await updateAgency(body));
}
