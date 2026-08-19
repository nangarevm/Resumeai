import { NextResponse } from "next/server";
import { getAgency, getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ seeker: getSeeker(), agency: getAgency() });
}
