import { NextResponse } from "next/server";
import { parseResume } from "@/lib/parsers/resume-parser";
import { setEvidenceStatus, setSeekerProfile, updateVault } from "@/lib/workspace-store";
import type { CareerVault, VerificationStatus } from "@/lib/srs-models";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as {
    resumeText?: string;
    targetRole?: string;
    goals?: string;
    vault?: Partial<CareerVault>;
  };
  if (body.resumeText) {
    const profile = parseResume("seeker", body.resumeText);
    const seeker = await setSeekerProfile(profile);
    if (body.targetRole || body.goals) {
      seeker.vault = await updateVault({
        targetRole: body.targetRole || seeker.vault.targetRole,
        goals: body.goals || seeker.vault.goals
      });
    }
    return NextResponse.json(seeker);
  }
  if (body.vault) {
    return NextResponse.json({ vault: await updateVault(body.vault) });
  }
  const evidenceBody = body as { evidenceId?: string; verificationStatus?: VerificationStatus };
  if (evidenceBody.evidenceId && evidenceBody.verificationStatus) {
    return NextResponse.json({ vault: await setEvidenceStatus(evidenceBody.evidenceId, evidenceBody.verificationStatus) });
  }
  return NextResponse.json({ error: "resumeText or vault required" }, { status: 400 });
}
