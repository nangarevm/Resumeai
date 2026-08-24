import { NextResponse } from "next/server";
import { getAgencyCandidatePool } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { searchCandidates } from "@/lib/engines/discovery-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await bindWorkspaceUser();
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const pool = await getAgencyCandidatePool();
  const results = searchCandidates(pool, q).map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    skills: c.extractedSkills,
    projects: c.extractedProjects,
    snippet: highlight(c.rawResumeText, q)
  }));
  return NextResponse.json(results);
}

function highlight(text: string, q: string): string {
  if (!q.trim()) return text.slice(0, 240);
  const term = q.split(/[,+&]/)[0]?.trim();
  if (!term) return text.slice(0, 240);
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx < 0) return text.slice(0, 240);
  const start = Math.max(0, idx - 80);
  return text.slice(start, start + 240);
}
