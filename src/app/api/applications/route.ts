import { NextResponse } from "next/server";
import { addApplication, getSeeker, updateApplication } from "@/lib/workspace-store";
import type { ApplicationRecord } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function GET() {
  const seeker = await getSeeker();
  return NextResponse.json(seeker.applications);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ApplicationRecord> & { id?: string };
  if (body.id) {
    if (body.status === "Applied" && !body.appliedAt) body.appliedAt = new Date().toISOString();
    const updated = await updateApplication(body.id, body);
    return NextResponse.json(updated);
  }
  const seeker = await getSeeker();
  const fit = seeker.fit;
  const app: ApplicationRecord = {
    id: `app-${Date.now()}`,
    jobId: seeker.activeJob?.id || "unknown",
    jobTitle: body.jobTitle || seeker.activeJob?.title || "Untitled role",
    company: body.company || seeker.activeJob?.companyName || "Company",
    status: body.status || "Saved",
    notes: body.notes || "",
    savedAt: new Date().toISOString(),
    resumeVersionId: seeker.versions[0]?.id,
    fitScore: body.fitScore ?? fit?.score,
    fitLabel: body.fitLabel ?? fit?.label,
    fitBand: body.fitBand ?? (fit ? bandLabel(fit.score) : undefined),
    referredBy: body.referredBy,
    referralUrl: body.referralUrl
  };
  return NextResponse.json(await addApplication(app));
}

function bandLabel(score: number): string {
  if (score >= 80) return "80+ Strong";
  if (score >= 60) return "60–79 Promising";
  if (score >= 40) return "40–59 Partial";
  return "0–39 Early";
}
