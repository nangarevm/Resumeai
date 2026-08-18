import { NextResponse } from "next/server";
import { getSeeker } from "@/lib/workspace-store";
import { formatOptimizerReportMarkdown } from "@/lib/export/optimizer-report";

export const dynamic = "force-dynamic";

export async function GET() {
  const seeker = getSeeker();
  const fit = seeker.fit;
  const job = seeker.activeJob;
  if (!fit || !job) {
    return NextResponse.json({ error: "Analyze a job first to generate the career report." }, { status: 400 });
  }
  const md = formatOptimizerReportMarkdown(seeker.profile.name, job, fit);
  return NextResponse.json({ markdown: md, generatedAt: new Date().toISOString() });
}

export async function POST() {
  const seeker = getSeeker();
  const fit = seeker.fit;
  const job = seeker.activeJob;
  if (!fit?.optimizer || !job) {
    return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  }
  const md = formatOptimizerReportMarkdown(seeker.profile.name, job, fit);
  const blob = new Blob([md], { type: "text/markdown" });
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="resumeproof-career-report.md"`
    }
  });
}
