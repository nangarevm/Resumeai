import { NextResponse } from "next/server";
import { generateTailoringSuggestions } from "@/lib/engines/tailoring";
import { getSeeker, setSuggestions, snapshot } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST() {
  const seeker = getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  snapshot("Pre-tailoring snapshot", seeker.profile.rawResumeText);
  const suggestions = generateTailoringSuggestions(seeker.profile, seeker.activeJob, seeker.vault);
  setSuggestions(suggestions);
  return NextResponse.json({ suggestions, versionCount: getSeeker().versions.length });
}
