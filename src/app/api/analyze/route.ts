import { NextResponse } from "next/server";
import { getAgencyActiveJob, getAgencyCandidatePool, incrementAgencyUsage } from "@/lib/workspace-store";
import { bindWorkspaceUser } from "@/lib/auth/bind-workspace";
import { analyzePool } from "@/lib/pipeline";
import type { EvaluationModeName } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await bindWorkspaceUser();
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") || "BALANCED").toUpperCase() as EvaluationModeName;
  const safeMode: EvaluationModeName = ["STRICT", "BALANCED", "BEST_MATCH"].includes(mode) ? mode : "BALANCED";
  const jd = await getAgencyActiveJob();
  if (!jd) return NextResponse.json({ error: "No active job" }, { status: 400 });
  const pool = await getAgencyCandidatePool();
  const results = analyzePool(pool, jd, safeMode);
  await incrementAgencyUsage("analyzesRun");
  return NextResponse.json(results);
}
