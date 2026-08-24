import { NextResponse } from "next/server";
import { addAgencyJob, getAgencyActiveJob, getAgencyJobs, removeAgencyJob, setAgencyActiveJobId } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { recordAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await bindWorkspaceUser();
  const { searchParams } = new URL(request.url);
  if (searchParams.get("all")) {
    return NextResponse.json(await getAgencyJobs());
  }
  const jd = await getAgencyActiveJob();
  return NextResponse.json(jd ?? {});
}

export async function DELETE(request: Request) {
  const userId = await bindWorkspaceUser();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const removed = await removeAgencyJob(id);
  if (removed) await recordAuditEvent(userId, "delete", `job:${id}`);
  return NextResponse.json({ removed, activeJob: await getAgencyActiveJob() });
}

export async function POST(request: Request) {
  await bindWorkspaceUser();
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
    const switched = await setAgencyActiveJobId(body.templateId);
    return NextResponse.json({ success: Boolean(switched), activeJob: switched ?? (await getAgencyActiveJob()) });
  }

  if (body.rawText) {
    const jd = await addAgencyJob(body.rawText);
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
    const jd = await addAgencyJob(raw);
    return NextResponse.json({ success: true, activeJob: jd });
  }

  return NextResponse.json({ success: false, activeJob: await getAgencyActiveJob() }, { status: 400 });
}
