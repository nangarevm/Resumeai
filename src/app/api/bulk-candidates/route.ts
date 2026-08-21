import { NextResponse } from "next/server";
import { addAgencyCandidate, incrementAgencyUsage } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { resumes?: string[] };
  const resumes = body.resumes || [];
  if (!resumes.length) return NextResponse.json({ error: "resumes array required" }, { status: 400 });
  if (resumes.length > 30) return NextResponse.json({ error: "Max 30 resumes per batch" }, { status: 400 });

  const added: Array<{ candidateId: string; name: string }> = [];
  const errors: string[] = [];

  for (let i = 0; i < resumes.length; i++) {
    const raw = resumes[i]?.trim();
    if (!raw || raw.length < 40) {
      errors.push(`Row ${i + 1}: too short`);
      continue;
    }
    try {
      const profile = await addAgencyCandidate(raw);
      added.push({ candidateId: profile.id, name: profile.name });
    } catch {
      errors.push(`Row ${i + 1}: parse failed`);
    }
  }

  if (added.length) await incrementAgencyUsage("candidatesAdded", added.length);

  return NextResponse.json({ added, errors, count: added.length });
}
