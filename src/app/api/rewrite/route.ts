import { NextResponse } from "next/server";
import { strengthenBullets } from "@/lib/engines/evidence-rewrite";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST() {
  const seeker = await getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  const rewrites = strengthenBullets(seeker.profile, seeker.activeJob, seeker.vault);
  return NextResponse.json({
    rewrites,
    notice: "Evidence-bound rewrites only — same facts, stronger order. No LLM, no invented metrics."
  });
}
