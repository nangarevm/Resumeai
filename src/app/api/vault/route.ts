import { NextResponse } from "next/server";
import { parseResume } from "@/lib/parsers/resume-parser";
import { setEvidenceStatus, setSeekerProfile, updateVault } from "@/lib/workspace-store";
import type { CareerVault, VerificationStatus } from "@/lib/srs-models";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    resumeText?: string;
    targetRole?: string;
    goals?: string;
    vault?: Partial<CareerVault>;
  };
  if (body.resumeText) {
    const profile = parseResume("seeker", body.resumeText);
    const seeker = setSeekerProfile(profile);
    if (body.targetRole || body.goals) {
      seeker.vault = updateVault({
        targetRole: body.targetRole || seeker.vault.targetRole,
        goals: body.goals || seeker.vault.goals
      });
    }
    return NextResponse.json(seeker);
  }
  if (body.vault) {
    return NextResponse.json({ vault: updateVault(body.vault) });
  }
  const evidenceBody = body as { evidenceId?: string; verificationStatus?: VerificationStatus };
  if (evidenceBody.evidenceId && evidenceBody.verificationStatus) {
    return NextResponse.json({ vault: setEvidenceStatus(evidenceBody.evidenceId, evidenceBody.verificationStatus) });
  }
  return NextResponse.json({ error: "resumeText or vault required" }, { status: 400 });
}
