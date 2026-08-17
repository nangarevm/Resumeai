import { NextResponse } from "next/server";
import { addJob, getActiveJob, getStore, setActiveJob } from "@/lib/store";
import { parseJD } from "@/lib/parsers/jd-extractor";

export const dynamic = "force-dynamic";

export async function GET() {
  const jd = getActiveJob();
  return NextResponse.json(jd ?? {});
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    templateId?: string;
    title?: string;
    companyName?: string;
    domain?: string;
    mandatoryText?: string;
    preferredText?: string;
    rawText?: string;
  };

  if (body.templateId) {
    const switched = setActiveJob(body.templateId);
    return NextResponse.json({ success: Boolean(switched), activeJob: switched ?? getActiveJob() });
  }

  if (body.rawText) {
    const jd = parseJD(`custom_${Date.now()}`, body.rawText);
    addJob(jd);
    return NextResponse.json({ success: true, activeJob: jd });
  }

  if (body.title) {
    const raw = [
      `POSITION: ${body.title}`,
      `COMPANY: ${body.companyName || "Hiring Client"}`,
      `DOMAIN: ${body.domain || "General Industry"}`,
      "",
      "MANDATORY REQUIREMENTS:",
      body.mandatoryText || "",
      "",
      "PREFERRED REQUIREMENTS:",
      body.preferredText || ""
    ].join("\n");
    const jd = parseJD(`custom_${Date.now()}`, raw);
    addJob(jd);
    return NextResponse.json({ success: true, activeJob: jd });
  }

  return NextResponse.json({ success: false, activeJob: getStore().jobs[0] }, { status: 400 });
}
