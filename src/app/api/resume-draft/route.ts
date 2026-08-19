import { NextResponse } from "next/server";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";
import { polishResumeDraft } from "@/lib/engines/resume-formatter";
import { scanVerification } from "@/lib/engines/verification";
import { getSeeker, setFindings, setSuggestions, setTailoredDraft, snapshot } from "@/lib/workspace-store";
import type { TailorSuggestion } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  const seeker = getSeeker();
  const preview = applyAcceptedSuggestions(seeker.profile.rawResumeText, seeker.suggestions);
  return NextResponse.json({
    source: seeker.profile.rawResumeText,
    preview,
    draft: seeker.tailoredDraft || preview
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    draft?: string;
    suggestions?: TailorSuggestion[];
    action?: "preview" | "save" | "rescan";
  };

  const seeker = getSeeker();
  if (body.suggestions) setSuggestions(body.suggestions);

  const current = getSeeker();
  const auto = applyAcceptedSuggestions(current.profile.rawResumeText, current.suggestions);
  const draft = polishResumeDraft(typeof body.draft === "string" ? body.draft : auto);

  if (body.action === "preview" || !body.action) {
    return NextResponse.json({ preview: auto, draft });
  }

  if (body.action === "save") {
    setTailoredDraft(draft);
    snapshot("Tailored resume draft", draft);
    return NextResponse.json({ draft, saved: true });
  }

  if (body.action === "rescan") {
    setTailoredDraft(draft);
    const findings = scanVerification(draft, current.vault, current.profile);
    setFindings(findings);
    return NextResponse.json({ draft, findings });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
