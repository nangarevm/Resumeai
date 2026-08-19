import { NextResponse } from "next/server";
import { exportWorkspace, resetSeekerWorkspace } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await exportWorkspace());
}

export async function DELETE() {
  return NextResponse.json({ seeker: await resetSeekerWorkspace(), deleted: true });
}
