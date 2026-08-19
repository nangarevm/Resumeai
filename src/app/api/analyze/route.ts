import { NextResponse } from "next/server";
import { getActiveJob, getStore } from "@/lib/store";
import { analyzePool } from "@/lib/pipeline";
import { incrementAgencyUsage } from "@/lib/workspace-store";
import type { EvaluationModeName } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get("mode") || "BALANCED").toUpperCase() as EvaluationModeName;
  const safeMode: EvaluationModeName = ["STRICT", "BALANCED", "BEST_MATCH"].includes(mode) ? mode : "BALANCED";
  const jd = getActiveJob();
  if (!jd) return NextResponse.json({ error: "No active job" }, { status: 400 });
  const results = analyzePool(getStore().candidates, jd, safeMode);
  await incrementAgencyUsage("analyzesRun");
  return NextResponse.json(results);
}
