import { NextResponse } from "next/server";
import { addAgencyCandidate, getAgency, getAgencyCandidatePool, incrementAgencyUsage } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { parseResume } from "@/lib/parsers/resume-parser";
import { tierLimitsFor } from "@/lib/agency/tier-limits";

export const dynamic = "force-dynamic";

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { resumes?: string[] };
  const resumes = body.resumes || [];
  if (!resumes.length) return NextResponse.json({ error: "resumes array required" }, { status: 400 });
  if (resumes.length > 30) return NextResponse.json({ error: "Max 30 resumes per batch" }, { status: 400 });

  const added: Array<{ candidateId: string; name: string }> = [];
  const duplicates: Array<{ name: string; email: string }> = [];
  const errors: string[] = [];

  // Seeded from the account's existing pool, then grown as this batch adds
  // candidates — catches both "already in the pool" and "two resumes in
  // this same upload share an email" duplicates.
  const seenEmails = new Set(
    (await getAgencyCandidatePool()).map((c) => normalizedEmail(c.email)).filter(Boolean)
  );

  // Checked once up front, then decremented per successful add — the
  // account's usage meter itself only updates once, after this whole loop
  // (below), so it can't be re-read mid-batch to catch a large single batch
  // pushing well past the monthly limit.
  const agency = await getAgency();
  const limits = tierLimitsFor(agency.tier);
  let remaining = Math.max(0, limits.maxCandidatesPerMonth - (agency.usageMeters?.candidatesAdded ?? 0));

  for (let i = 0; i < resumes.length; i++) {
    const raw = resumes[i]?.trim();
    if (!raw || raw.length < 40) {
      errors.push(`Row ${i + 1}: too short`);
      continue;
    }
    if (remaining <= 0) {
      errors.push(`Row ${i + 1}: monthly candidate limit reached for the ${agency.tier} plan (${limits.maxCandidatesPerMonth}/month)`);
      continue;
    }
    try {
      // Parsed once here just to check the email before deciding whether to
      // persist — addAgencyCandidate parses again internally when it does.
      // A double parse of plain text is cheap and far simpler than
      // threading a pre-parsed profile through the store function. Each row
      // gets its own id (parseResume no longer fabricates a placeholder
      // email at all — a real-email-less resume just gets "", and multiple
      // "" values are already excluded from seenEmails via .filter(Boolean)
      // below, so they never falsely dedupe against each other).
      const preview = parseResume(`preview-${i}`, raw);
      const email = normalizedEmail(preview.email);
      if (email && seenEmails.has(email)) {
        duplicates.push({ name: preview.name, email: preview.email });
        continue;
      }

      const profile = await addAgencyCandidate(raw);
      added.push({ candidateId: profile.id, name: profile.name });
      if (email) seenEmails.add(email);
      remaining--;
    } catch {
      errors.push(`Row ${i + 1}: parse failed`);
    }
  }

  if (added.length) await incrementAgencyUsage("candidatesAdded", added.length);

  return NextResponse.json({ added, duplicates, errors, count: added.length });
}
