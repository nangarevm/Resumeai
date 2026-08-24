import { NextResponse } from "next/server";
import { getSeeker, restoreVersion, pinCurrentResume, renamePinnedVersion, deletePinnedVersion } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

export async function GET() {
  await bindWorkspaceUser();
  const seeker = await getSeeker();
  return NextResponse.json({ versions: seeker.versions });
}

type VersionAction = "restore" | "pin" | "rename" | "delete";

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const body = (await request.json()) as { action?: VersionAction; versionId?: string; name?: string };
  const action = body.action || "restore";

  if (action === "pin") {
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Name your resume before saving it." }, { status: 400 });
    const version = await pinCurrentResume(name);
    return NextResponse.json({ version });
  }

  if (action === "rename") {
    if (!body.versionId || !body.name?.trim()) {
      return NextResponse.json({ error: "versionId and name are required" }, { status: 400 });
    }
    const result = await renamePinnedVersion(body.versionId, body.name.trim());
    if (result === "not_found") return NextResponse.json({ error: "That named resume no longer exists." }, { status: 404 });
    return NextResponse.json({ version: result });
  }

  if (action === "delete") {
    if (!body.versionId) return NextResponse.json({ error: "versionId is required" }, { status: 400 });
    const ok = await deletePinnedVersion(body.versionId);
    if (!ok) return NextResponse.json({ error: "That named resume no longer exists." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  // action === "restore" (default, matches the pre-existing behavior)
  if (!body.versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }
  const result = await restoreVersion(body.versionId);
  if (result === "not_found") {
    return NextResponse.json({ error: "That version no longer exists." }, { status: 404 });
  }
  return NextResponse.json(result);
}
