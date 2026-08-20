import { NextResponse } from "next/server";
import { setSeekerPhoto } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB — the file lands raw (base64) inside workspace.json, no object storage exists

export async function POST(request: Request) {
  await bindWorkspaceUser();
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Photo must be a JPEG, PNG, or WEBP image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large — please use an image under 1.5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const photoDataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
  const seeker = await setSeekerPhoto(photoDataUrl);
  return NextResponse.json({ profile: seeker.profile });
}

export async function DELETE() {
  await bindWorkspaceUser();
  const seeker = await setSeekerPhoto(null);
  return NextResponse.json({ profile: seeker.profile });
}
