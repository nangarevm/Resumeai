import { NextResponse } from "next/server";
import { planCareerChange } from "@/lib/engines/career-change";
import { getSeeker, updateVault } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { targetRole?: string };
  const seeker = await getSeeker();
  const role = body.targetRole || seeker.vault.targetRole || "software engineer";
  await updateVault({ targetRole: role });
  const updated = await getSeeker();
  return NextResponse.json(planCareerChange(updated.vault, role));
}
