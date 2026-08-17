import { NextResponse } from "next/server";
import { attachClientFromPool, getAgency, incrementAgencyUsage, updateAgency, updateSeatNotes } from "@/lib/workspace-store";
import type { AgencyWorkspace } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAgency());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AgencyWorkspace> & {
    clientId?: string;
    notes?: string;
    incrementUsage?: "analyzesRun" | "candidatesAdded" | "shortlistsExported";
  };
  if (body.incrementUsage) {
    return NextResponse.json(incrementAgencyUsage(body.incrementUsage));
  }
  if (body.clientId && typeof body.notes === "string") {
    return NextResponse.json(updateSeatNotes(body.clientId, body.notes));
  }
  if (body.clientId) return NextResponse.json(attachClientFromPool(body.clientId));
  return NextResponse.json(updateAgency(body));
}
