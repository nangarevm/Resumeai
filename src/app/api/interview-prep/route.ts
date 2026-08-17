import { NextResponse } from "next/server";
import { buildInterviewPrep } from "@/lib/engines/interview-prep";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST() {
  const seeker = getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  return NextResponse.json(buildInterviewPrep(seeker.profile, seeker.activeJob, seeker.vault));
}
