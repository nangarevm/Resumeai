import { NextResponse } from "next/server";
import { getCandidate, getStore } from "@/lib/store";
import { proveGithub } from "@/lib/engines/github-proof-engine";
import { parseResume } from "@/lib/parsers/resume-parser";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { candidateId?: string; resumeText?: string };
  const candidate =
    (body.candidateId && getCandidate(body.candidateId)) ||
    (body.resumeText ? parseResume("adhoc", body.resumeText) : getStore().candidates[0]);
  if (!candidate) return NextResponse.json({ error: "No candidate" }, { status: 400 });
  const proof = await proveGithub(candidate);
  return NextResponse.json(proof);
}
