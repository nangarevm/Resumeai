import { NextResponse } from "next/server";
import { buildApplicationKit } from "@/lib/engines/application-kit";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";
import { hasBlockingFindings } from "@/lib/engines/verification";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { override?: boolean; draft?: string };
  const seeker = getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  if (hasBlockingFindings(seeker.findings) && !body.override) {
    return NextResponse.json(
      { error: "High-risk claims are still open. Resolve them or send override: true." },
      { status: 409 }
    );
  }
  const fallback = applyAcceptedSuggestions(seeker.profile.rawResumeText, seeker.suggestions);
  const tailored =
    typeof body.draft === "string" ? body.draft : seeker.tailoredDraft?.trim() || fallback;
  const kit = buildApplicationKit(seeker.profile, seeker.activeJob, seeker.vault, seeker.suggestions, tailored);
  return NextResponse.json(kit);
}
