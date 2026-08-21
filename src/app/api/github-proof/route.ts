import { NextResponse } from "next/server";
import { getAgencyCandidatePool } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { proveGithub } from "@/lib/engines/github-proof-engine";
import { parseResume } from "@/lib/parsers/resume-parser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { candidateId?: string; resumeText?: string };
  const pool = await getAgencyCandidatePool();
  const candidate =
    (body.candidateId && pool.find((c) => c.id === body.candidateId)) ||
    (body.resumeText ? parseResume("adhoc", body.resumeText) : pool[0]);
  if (!candidate) return NextResponse.json({ error: "No candidate" }, { status: 400 });
  const proof = await proveGithub(candidate);
  return NextResponse.json(proof);
}
