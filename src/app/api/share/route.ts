import { NextResponse } from "next/server";
import { createShare, getActiveShareForUser, revokeShare } from "@/lib/shares";
import { getSeeker } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { getPublicOrigin } from "@/lib/request-origin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await bindWorkspaceUser();
  const share = getActiveShareForUser(userId);
  if (!share) return NextResponse.json({ active: false });
  const origin = getPublicOrigin(request);
  return NextResponse.json({ active: true, url: `${origin}/r/${share.token}`, expiresAt: share.expiresAt });
}

export async function POST(request: Request) {
  const userId = await bindWorkspaceUser();
  const body = (await request.json().catch(() => ({}))) as { action?: "create" | "revoke" };
  const origin = getPublicOrigin(request);

  if (body.action === "revoke") {
    revokeShare(userId);
    return NextResponse.json({ active: false });
  }

  const seeker = await getSeeker();
  const share = createShare(userId, seeker.profile.rawResumeText);
  return NextResponse.json({ active: true, url: `${origin}/r/${share.token}`, expiresAt: share.expiresAt });
}
