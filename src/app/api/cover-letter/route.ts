import { NextResponse } from "next/server";
import { getAgencyActiveJob, getAgencyCandidatePool } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { generateCoverLetter } from "@/lib/engines/cover-letter-engine";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { candidateId?: string; resumeText?: string; jdText?: string };
  const pool = await getAgencyCandidatePool();
  const candidate =
    (body.candidateId && pool.find((c) => c.id === body.candidateId)) ||
    (body.resumeText ? parseResume("adhoc", body.resumeText) : pool[0]);
  const jd = body.jdText ? parseJD("adhoc-jd", body.jdText) : await getAgencyActiveJob();
  if (!candidate || !jd) return NextResponse.json({ error: "Need candidate and job" }, { status: 400 });
  return NextResponse.json(generateCoverLetter(candidate, jd));
}
