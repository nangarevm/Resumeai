import { NextResponse } from "next/server";
import { attachClientFromPool, getAgency, incrementAgencyUsage, updateAgency, updateSeatNotes } from "@/lib/workspace-store";
import type { AgencyWorkspace } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAgency());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AgencyWorkspace> & {
    clientId?: string;
    notes?: string;
    incrementUsage?: "analyzesRun" | "candidatesAdded" | "shortlistsExported";
  };
  if (body.incrementUsage) {
    return NextResponse.json(await incrementAgencyUsage(body.incrementUsage));
  }
  if (body.clientId && typeof body.notes === "string") {
    return NextResponse.json(await updateSeatNotes(body.clientId, body.notes));
  }
  if (body.clientId) return NextResponse.json(await attachClientFromPool(body.clientId));
  return NextResponse.json(await updateAgency(body));
}
