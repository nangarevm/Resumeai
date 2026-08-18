import { NextResponse } from "next/server";
import { scanVerification } from "@/lib/engines/verification";
import { applyAcceptedSuggestions, applySummaryToResume } from "@/lib/engines/tailoring";
import { polishResumeDraft } from "@/lib/engines/resume-formatter";
import { getSeeker, setFindings, setSuggestions, setTailoredDraft } from "@/lib/workspace-store";
import type { TailorSuggestion } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { suggestions?: TailorSuggestion[]; draft?: string };
  const seeker = getSeeker();
  if (body.suggestions) setSuggestions(body.suggestions);
  const current = getSeeker();
  const auto = applyAcceptedSuggestions(current.profile.rawResumeText, current.suggestions);
  const draft = polishResumeDraft(typeof body.draft === "string" ? body.draft : auto);
  setTailoredDraft(draft);
  const findings = scanVerification(draft, current.vault, current.profile);
  setFindings(findings);
  return NextResponse.json({ findings, draft });
}
