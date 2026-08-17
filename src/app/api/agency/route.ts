import { NextResponse } from "next/server";
import { attachClientFromPool, getAgency, updateAgency } from "@/lib/workspace-store";
import type { AgencyWorkspace } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAgency());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<AgencyWorkspace> & { clientId?: string };
  if (body.clientId) return NextResponse.json(attachClientFromPool(body.clientId));
  return NextResponse.json(updateAgency(body));
}
