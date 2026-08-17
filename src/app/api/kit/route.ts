import { NextResponse } from "next/server";
import { buildApplicationKit } from "@/lib/engines/application-kit";
import { hasBlockingFindings } from "@/lib/engines/verification";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { override?: boolean };
  const seeker = getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  if (hasBlockingFindings(seeker.findings) && !body.override) {
    return NextResponse.json(
      { error: "High-risk claims are still open. Resolve them or send override: true." },
      { status: 409 }
    );
  }
  const kit = buildApplicationKit(seeker.profile, seeker.activeJob, seeker.vault, seeker.suggestions);
  return NextResponse.json(kit);
}
