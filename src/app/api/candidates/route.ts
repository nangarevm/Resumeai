import { NextResponse } from "next/server";
import { addCandidate, getStore, nextCandidateId } from "@/lib/store";
import { parseResume } from "@/lib/parsers/resume-parser";

export const dynamic = "force-dynamic";

export async function GET() {
  const candidates = getStore().candidates.map((c) => ({
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
    rawResumeText: c.rawResumeText
  }));
  return NextResponse.json(candidates);
}

export async function POST(request: Request) {
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

  const profile = parseResume(nextCandidateId(), raw);
  addCandidate(profile);
  incrementAgencyUsage("candidatesAdded");
  return NextResponse.json({ success: true, candidateId: profile.id, candidate: profile });
}
