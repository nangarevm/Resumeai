import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const root = process.cwd();
  const resume = fs.readFileSync(path.join(root, "data", "resumes", "resume_anuja.txt"), "utf8");
  const jd = fs.readFileSync(path.join(root, "data", "job_descriptions", "aiml_intern_jd.txt"), "utf8");
  return NextResponse.json({
    resume,
    jd,
    targetRole: "AI/ML Intern",
    goals: "Land a first applied-ML internship without inflating experience"
  });
}
