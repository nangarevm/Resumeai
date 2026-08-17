import { NextResponse } from "next/server";
import { getActiveJob, getCandidate, getStore } from "@/lib/store";
import { generateCoverLetter } from "@/lib/engines/cover-letter-engine";
import { parseResume } from "@/lib/parsers/resume-parser";
import { parseJD } from "@/lib/parsers/jd-extractor";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { candidateId?: string; resumeText?: string; jdText?: string };
  const candidate =
    (body.candidateId && getCandidate(body.candidateId)) ||
    (body.resumeText ? parseResume("adhoc", body.resumeText) : getStore().candidates[0]);
  const jd = body.jdText ? parseJD("adhoc-jd", body.jdText) : getActiveJob();
  if (!candidate || !jd) return NextResponse.json({ error: "Need candidate and job" }, { status: 400 });
  return NextResponse.json(generateCoverLetter(candidate, jd));
}
