import { NextResponse } from "next/server";
import { scanVerification } from "@/lib/engines/verification";
import { getSeeker, setFindings } from "@/lib/workspace-store";
import type { TailorSuggestion } from "@/lib/srs-models";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";
import { setSuggestions } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { suggestions?: TailorSuggestion[] };
  const seeker = getSeeker();
  if (body.suggestions) setSuggestions(body.suggestions);
  const current = getSeeker();
  const draft = applyAcceptedSuggestions(current.profile.rawResumeText, current.suggestions);
  const findings = scanVerification(draft, current.vault, current.profile);
  setFindings(findings);
  return NextResponse.json({ findings, draft });
}
