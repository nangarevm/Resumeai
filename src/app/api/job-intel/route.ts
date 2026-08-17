import { NextResponse } from "next/server";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { normalizeBoardPaste } from "@/lib/parsers/board-paste-normalizer";
import { fetchJobFromUrl } from "@/lib/parsers/job-board-fetch";
import { computeFitReport } from "@/lib/engines/fit-score";
import { getSeeker, setActiveJob, setFit, setLastJobInput } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { jdText?: string; jobUrl?: string };
  let text = body.jdText || "";
  let fetchSource: string | undefined;

  if (body.jobUrl) {
    try {
      const fetched = await fetchJobFromUrl(body.jobUrl);
      fetchSource = fetched.source;
      if (!text.trim()) text = fetched.text;
      else text = `${text}\n\n${fetched.text}`;
    } catch {
      if (!text.trim()) {
        return NextResponse.json({ error: "Could not fetch that URL. Paste the job description instead." }, { status: 400 });
      }
    }
  }

  if (!text) return NextResponse.json({ error: "Paste a job description or a public URL." }, { status: 400 });
  const normalized = normalizeBoardPaste(text);
  const jd = parseJD(`job-${Date.now()}`, normalized.text);
  if (body.jobUrl) jd.rawText = `${body.jobUrl}\n${jd.rawText}`;
  const seeker = getSeeker();
  const fit = computeFitReport(seeker.profile, jd, seeker.vault);
  setActiveJob(jd);
  setFit(fit);
  setLastJobInput({ jobUrl: body.jobUrl || "", jdText: body.jdText || "" });
  return NextResponse.json({ job: jd, fit, fetchSource: fetchSource || normalized.source });
}
