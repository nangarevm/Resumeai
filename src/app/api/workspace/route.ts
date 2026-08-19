import { NextResponse } from "next/server";
import { getAgency, getSeeker } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [seeker, agency] = await Promise.all([getSeeker(), getAgency()]);
  return NextResponse.json({ seeker, agency });
}
