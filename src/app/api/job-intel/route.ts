import { NextResponse } from "next/server";
import { parseJD } from "@/lib/parsers/jd-extractor";
import { computeFitReport } from "@/lib/engines/fit-score";
import { getSeeker, setActiveJob, setFit } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { jdText?: string; jobUrl?: string };
  let text = body.jdText || "";
  if (body.jobUrl && !text) {
    try {
      const res = await fetch(body.jobUrl, { headers: { "User-Agent": "ResumeProof/2.0" } });
      const html = await res.text();
      text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
    } catch {
      return NextResponse.json({ error: "Could not fetch that URL. Paste the job description instead." }, { status: 400 });
    }
  }
  if (!text) return NextResponse.json({ error: "Paste a job description or a public URL." }, { status: 400 });
  const jd = parseJD(`job-${Date.now()}`, text);
  if (body.jobUrl) jd.rawText = `${body.jobUrl}\n${jd.rawText}`;
  const seeker = getSeeker();
  const fit = computeFitReport(seeker.profile, jd, seeker.vault);
  setActiveJob(jd);
  setFit(fit);
  return NextResponse.json({ job: jd, fit });
}
