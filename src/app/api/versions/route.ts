import { NextResponse } from "next/server";
import { getSeeker, restoreVersion } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  await bindWorkspaceUser();
  const seeker = await getSeeker();
  return NextResponse.json({ versions: seeker.versions });
}

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { versionId?: string };
  if (!body.versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }
  const result = await restoreVersion(body.versionId);
  if (result === "not_found") {
    return NextResponse.json({ error: "That version no longer exists." }, { status: 404 });
  }
  return NextResponse.json(result);
}
