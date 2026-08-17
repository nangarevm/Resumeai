import { NextResponse } from "next/server";
import { convertLinkedInProfile } from "@/lib/engines/linkedin-import";
import { getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { paste?: string; merge?: boolean };
  if (!body.paste?.trim()) {
    return NextResponse.json({ error: "Paste your LinkedIn profile text first." }, { status: 400 });
  }

  const existing = body.merge ? getSeeker().profile.rawResumeText : "";
  const result = convertLinkedInProfile(body.paste, existing);

  if (!result.resumeText.trim()) {
    return NextResponse.json(
      { error: "Could not parse that paste. Copy About, Experience, Education, and Skills from your profile." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ...result,
    notice:
      "Paste-only import — we do not crawl LinkedIn. Review the text, then Save Career Vault. Nothing was invented beyond what you pasted."
  });
}
