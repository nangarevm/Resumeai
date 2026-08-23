import { NextResponse } from "next/server";
import { addAgencyCandidate, getAgencyCandidatePool, incrementAgencyUsage, removeAgencyCandidate } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { recordAuditEvent } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

export async function GET() {
  await bindWorkspaceUser();
  const candidates = (await getAgencyCandidatePool()).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    githubUrl: c.githubUrl,
    linkedinUrl: c.linkedinUrl,
    extractedSkills: c.extractedSkills,
    extractedProjects: c.extractedProjects,
    dreamCompanies: c.preferences.dreamCompanies,
    preferredRoles: c.preferences.preferredRoles,
    preferredDomains: c.preferences.preferredDomains,
    parsedSections: c.parsedSections,
    rawResumeText: c.rawResumeText,
    isCustom: c.isCustom
  }));
  return NextResponse.json(candidates);
}

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    dreamCompanies?: string;
    preferredRoles?: string;
    preferredDomains?: string;
    rawResumeText?: string;
  };

  const raw = [
    `NAME: ${body.name || "Candidate Profile"}`,
    `EMAIL: ${body.email || ""}`,
    `PHONE: ${body.phone || ""}`,
    `DREAM COMPANIES: ${body.dreamCompanies || ""}`,
    `PREFERRED ROLE: ${body.preferredRoles || ""}`,
    `PREFERRED DOMAIN: ${body.preferredDomains || ""}`,
    "",
    body.rawResumeText || ""
  ].join("\n");

  const profile = await addAgencyCandidate(raw);
  await incrementAgencyUsage("candidatesAdded");
  return NextResponse.json({ success: true, candidateId: profile.id, candidate: profile });
}

export async function DELETE(request: Request) {
  const userId = await bindWorkspaceUser();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const removed = await removeAgencyCandidate(id);
  if (removed) await recordAuditEvent(userId, "delete", `candidate:${id}`);
  return NextResponse.json({ removed });
}
