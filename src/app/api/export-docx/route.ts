import { NextResponse } from "next/server";
import { resumeTextToDocxBuffer, plainTextToDocxBuffer } from "@/lib/export/docx-builder";
import { getSeeker } from "@/lib/workspace-store";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { kind?: "resume" | "cover"; text?: string };
  const seeker = await getSeeker();
  const fallback = applyAcceptedSuggestions(seeker.profile.rawResumeText, seeker.suggestions);
  const resumeText = body.text || seeker.tailoredDraft || fallback;

  if (body.kind === "cover") {
    const buf = await plainTextToDocxBuffer(body.text || "Cover letter", "Cover letter");
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="cover-letter.docx"'
      }
    });
  }

  const buf = await resumeTextToDocxBuffer(resumeText, `${seeker.profile.name} — Resume`);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="tailored-resume.docx"'
    }
  });
}
