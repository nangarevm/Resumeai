import { NextResponse } from "next/server";
import { computeOutcomeStats } from "@/lib/engines/outcome-tracker";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const seeker = await getSeeker();
  return NextResponse.json(computeOutcomeStats(seeker.applications));
}
