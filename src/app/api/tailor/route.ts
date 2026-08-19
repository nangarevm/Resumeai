import { NextResponse } from "next/server";
import {
  generateTailoringSuggestions,
  injectSummaryTailorSuggestion,
  applySummaryToResume
} from "@/lib/engines/tailoring";
import { getSeeker, setSuggestions, snapshot, setTailoredDraft } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function POST() {
  await bindWorkspaceUser();
  const seeker = getSeeker();
  if (!seeker.activeJob) return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  snapshot("Pre-tailoring snapshot", seeker.profile.rawResumeText);

  let suggestions = generateTailoringSuggestions(seeker.profile, seeker.activeJob, seeker.vault);
  suggestions = injectSummaryTailorSuggestion(seeker.profile, seeker.activeJob, seeker.fit, suggestions);

  const summarySug = suggestions.find((s) => s.kind === "summary");
  let summaryApplied = false;
  let tailoredPreview = seeker.profile.rawResumeText;

  if (summarySug && !summarySug.blocked) {
    tailoredPreview = applySummaryToResume(seeker.profile.rawResumeText, summarySug.proposed);
    summarySug.status = "accepted";
    summaryApplied = true;
    setTailoredDraft(tailoredPreview);
  }

  setSuggestions(suggestions);
  return NextResponse.json({
    suggestions,
    versionCount: getSeeker().versions.length,
    summaryApplied,
    summarySuggestion: summarySug?.proposed,
    tailoredPreview
  });
}
