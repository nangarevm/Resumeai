import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const jobs = getStore().jobs.map((j) => ({
    id: j.id,
    title: j.title,
    companyName: j.companyName,
    domain: j.domain
  }));
  return NextResponse.json(jobs);
}
