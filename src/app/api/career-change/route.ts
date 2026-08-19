import { NextResponse } from "next/server";
import { planCareerChange } from "@/lib/engines/career-change";
import { getSeeker, updateVault } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { targetRole?: string };
  const role = body.targetRole || getSeeker().vault.targetRole || "software engineer";
  updateVault({ targetRole: role });
  return NextResponse.json(planCareerChange(getSeeker().vault, role));
}
