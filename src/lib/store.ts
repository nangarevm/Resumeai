import fs from "fs";
import path from "path";
import type { CandidateProfile, JobDescription } from "./models";
import { parseResume } from "./parsers/resume-parser";
import { parseJD } from "./parsers/jd-extractor";

const ROOT = process.cwd();
const RESUME_DIR = path.join(ROOT, "data", "resumes");
const JD_DIR = path.join(ROOT, "data", "job_descriptions");

function readDirFiles(dir: string): Array<{ id: string; text: string }> {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .map((file) => ({
      id: file.replace(/\.txt$/, ""),
      text: fs.readFileSync(path.join(dir, file), "utf8")
    }));
}

let seedCandidates: CandidateProfile[] | null = null;
let seedJobs: JobDescription[] | null = null;

/** Shared demo dataset (data/resumes, data/job_descriptions) — identical for
 *  every account, read-only, cached once. This used to also hold a single
 *  mutable global pool of every account's *own* added candidates/jobs, which
 *  meant one agency's uploads and job postings were silently visible to (and
 *  overwritten by) every other agency — see docs/resume-journey-gap-analysis.md
 *  and the AgencyWorkspace.customCandidates/customJobs fields in
 *  workspace-store.ts, which now hold each account's own additions instead. */
export function getSeedCandidates(): CandidateProfile[] {
  if (!seedCandidates) {
    seedCandidates = readDirFiles(RESUME_DIR).map((f, i) => parseResume(String(i + 1), f.text));
  }
  return seedCandidates;
}

export function getSeedJobs(): JobDescription[] {
  if (!seedJobs) {
    seedJobs = readDirFiles(JD_DIR).map((f) => parseJD(f.id, f.text));
  }
  return seedJobs;
}

export function getDefaultSeedJobId(): string {
  const jobs = getSeedJobs();
  const preferred = jobs.find((j) => j.id.includes("aiml")) ?? jobs[0];
  return preferred?.id ?? "none";
}
