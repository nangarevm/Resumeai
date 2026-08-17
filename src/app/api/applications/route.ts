import { NextResponse } from "next/server";
import { addApplication, getSeeker, updateApplication } from "@/lib/workspace-store";
import type { ApplicationRecord } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSeeker().applications);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ApplicationRecord> & { id?: string };
  if (body.id) {
    const updated = updateApplication(body.id, body);
    return NextResponse.json(updated);
  }
  const seeker = getSeeker();
  const app: ApplicationRecord = {
    id: `app-${Date.now()}`,
    jobId: seeker.activeJob?.id || "unknown",
    jobTitle: body.jobTitle || seeker.activeJob?.title || "Untitled role",
    company: body.company || seeker.activeJob?.companyName || "Company",
    status: body.status || "Saved",
    notes: body.notes || "",
    savedAt: new Date().toISOString(),
    resumeVersionId: seeker.versions[0]?.id
  };
  return NextResponse.json(addApplication(app));
}
