import { NextResponse } from "next/server";
import { listAccounts } from "@/lib/auth/accounts";
import { getSeekerForUserId, recordDigestSent } from "@/lib/workspace-store";
import { computeDigestContent } from "@/lib/engines/digest";
import { sendEmail } from "@/lib/auth/email";

export const dynamic = "force-dynamic";

const MIN_MS_BETWEEN_DIGESTS = 6 * 24 * 60 * 60 * 1000; // 6 days — a weekly cadence with slack for an inexact scheduler

/** Meant to be hit by an external scheduler (Vercel Cron, a GitHub Actions
 *  cron job, etc.) roughly weekly — this app has no in-process scheduler of
 *  its own, consistent with everything else here being plain Next.js API
 *  routes rather than a persistent background-job runner. Gated on
 *  CRON_SECRET so it isn't a public "email every user now" endpoint. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured on this deployment" }, { status: 501 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Array<{ email: string; sent: boolean; reason?: string }> = [];

  for (const account of listAccounts()) {
    let seeker;
    try {
      seeker = await getSeekerForUserId(account.id);
    } catch {
      results.push({ email: account.email, sent: false, reason: "no_workspace" });
      continue;
    }

    const lastSent = seeker.lastDigestSentAt ? new Date(seeker.lastDigestSentAt).getTime() : null;
    if (lastSent !== null && Date.now() - lastSent < MIN_MS_BETWEEN_DIGESTS) {
      results.push({ email: account.email, sent: false, reason: "too_soon" });
      continue;
    }

    const content = computeDigestContent(seeker, seeker.lastDigestHealthPercent ?? null);
    if (!content) {
      results.push({ email: account.email, sent: false, reason: "no_resume_saved" });
      continue;
    }

    const { sent } = await sendEmail({ to: account.email, subject: content.subject, text: content.text });
    if (sent) await recordDigestSent(account.id, content.healthPercent);
    results.push({ email: account.email, sent, reason: sent ? undefined : "send_failed" });
  }

  return NextResponse.json({ processed: results.length, sent: results.filter((r) => r.sent).length, results });
}
