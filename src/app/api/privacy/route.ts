import { NextResponse } from "next/server";
import { exportWorkspace, resetSeekerWorkspace } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(exportWorkspace());
}

export async function DELETE() {
  return NextResponse.json({ seeker: resetSeekerWorkspace(), deleted: true });
}
