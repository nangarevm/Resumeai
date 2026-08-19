import { NextResponse } from "next/server";
import { generateWithAI, type AiGenerateKind } from "@/lib/engines/ai-generate";
import { getSeeker } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { kind?: AiGenerateKind; prompt?: string };
  const kind = body.kind || "custom";

  const seeker = await getSeeker();
  if (!seeker.profile.rawResumeText.trim()) {
    return NextResponse.json({ error: "Import a resume into your Career Vault first." }, { status: 400 });
  }

  try {
    const result = await generateWithAI({
      kind,
      profile: seeker.profile,
      job: seeker.activeJob,
      userPrompt: body.prompt
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
