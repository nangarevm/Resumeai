import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getSeeker } from "@/lib/workspace-store";
import { formatOptimizerReportMarkdown } from "@/lib/export/optimizer-report";
import { createOptimizerReportPdfDocument } from "@/lib/export/optimizer-report-pdf";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await bindWorkspaceUser();
  const seeker = await getSeeker();
  const fit = seeker.fit;
  const job = seeker.activeJob;
  if (!fit || !job) {
    return NextResponse.json({ error: "Analyze a job first to generate the career report." }, { status: 400 });
  }
  const md = formatOptimizerReportMarkdown(seeker.profile.name, job, fit);
  return NextResponse.json({ markdown: md, generatedAt: new Date().toISOString() });
}

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "md";

  const seeker = await getSeeker();
  const fit = seeker.fit;
  const job = seeker.activeJob;
  if (!fit?.optimizer || !job) {
    return NextResponse.json({ error: "Analyze a job first." }, { status: 400 });
  }

  if (format === "pdf") {
    const buffer = await renderToBuffer(
      createOptimizerReportPdfDocument({
        name: seeker.profile.name,
        job,
        fit
      })
    );
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"resumeproof-career-report.pdf\""
      }
    });
  }

  const md = formatOptimizerReportMarkdown(seeker.profile.name, job, fit);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": "attachment; filename=\"resumeproof-career-report.md\""
    }
  });
}
