import { NextResponse } from "next/server";
import { addAgencyCandidate, getAgencyCandidatePool, incrementAgencyUsage } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { parseResume } from "@/lib/parsers/resume-parser";

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

  for (let i = 0; i < resumes.length; i++) {
    const raw = resumes[i]?.trim();
    if (!raw || raw.length < 40) {
      errors.push(`Row ${i + 1}: too short`);
      continue;
    }
    try {
      // Parsed once here just to check the email before deciding whether to
      // persist — addAgencyCandidate parses again internally when it does.
      // A double parse of plain text is cheap and far simpler than
      // threading a pre-parsed profile through the store function. The id
      // must be unique per row: parseResume fabricates a placeholder email
      // (`candidate${id}@example.com`) for a resume with no real email, so
      // reusing one fixed id here would make every no-email resume in a
      // batch collide on the same fake address and falsely dedupe against
      // each other.
      const preview = parseResume(`preview-${i}`, raw);
      const email = normalizedEmail(preview.email);
      if (email && seenEmails.has(email)) {
        duplicates.push({ name: preview.name, email: preview.email });
        continue;
      }

      const profile = await addAgencyCandidate(raw);
      added.push({ candidateId: profile.id, name: profile.name });
      if (email) seenEmails.add(email);
    } catch {
      errors.push(`Row ${i + 1}: parse failed`);
    }
  }

  if (added.length) await incrementAgencyUsage("candidatesAdded", added.length);

  return NextResponse.json({ added, duplicates, errors, count: added.length });
}
