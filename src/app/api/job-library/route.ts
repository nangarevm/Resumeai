import { NextResponse } from "next/server";
import { getSeeker, saveJobToLibrary, deleteSavedJob } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const seeker = await getSeeker();
  return NextResponse.json({ jobs: seeker.savedJobs || [] });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title: string;
    companyName: string;
    jdText: string;
    jobUrl?: string;
    fitScore?: number;
    id?: string;
  };
  if (!body.title || !body.jdText) {
    return NextResponse.json({ error: "title and jdText required" }, { status: 400 });
  }
  const saved = await saveJobToLibrary({
    id: body.id,
    title: body.title,
    companyName: body.companyName || "Company",
    jdText: body.jdText,
    jobUrl: body.jobUrl || "",
    fitScore: body.fitScore
  });
  return NextResponse.json(saved);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteSavedJob(id);
  return NextResponse.json({ success: true });
}
