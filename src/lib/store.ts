import fs from "fs";
import path from "path";
import type { CandidateProfile, JobDescription } from "./models";
import { parseResume } from "./parsers/resume-parser";
import { parseJD } from "./parsers/jd-extractor";

const ROOT = process.cwd();
const RESUME_DIR = path.join(ROOT, "data", "resumes");
const JD_DIR = path.join(ROOT, "data", "job_descriptions");
const RUNTIME_DIR = path.join(ROOT, "data", "runtime");
const CUSTOM_CANDIDATES = path.join(RUNTIME_DIR, "candidates.json");
const CUSTOM_JOBS = path.join(RUNTIME_DIR, "jobs.json");

interface StoreState {
  candidates: CandidateProfile[];
  jobs: JobDescription[];
  activeJobId: string;
}

let memory: StoreState | null = null;

function ensureRuntime() {
  if (!fs.existsSync(RUNTIME_DIR)) fs.mkdirSync(RUNTIME_DIR, { recursive: true });
}

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

function loadSeed(): StoreState {
  const resumes = readDirFiles(RESUME_DIR).map((f, i) => parseResume(String(i + 1), f.text));
  const jobs = readDirFiles(JD_DIR).map((f) => parseJD(f.id, f.text));

  ensureRuntime();
  if (fs.existsSync(CUSTOM_CANDIDATES)) {
    try {
      const extra = JSON.parse(fs.readFileSync(CUSTOM_CANDIDATES, "utf8")) as CandidateProfile[];
      resumes.push(...extra);
    } catch {
      /* ignore corrupt runtime */
    }
  }
  if (fs.existsSync(CUSTOM_JOBS)) {
    try {
      const extra = JSON.parse(fs.readFileSync(CUSTOM_JOBS, "utf8")) as JobDescription[];
      jobs.push(...extra);
    } catch {
      /* ignore */
    }
  }

  const preferred = jobs.find((j) => j.id.includes("aiml")) ?? jobs[0];
  return {
    candidates: resumes,
    jobs,
    activeJobId: preferred?.id ?? jobs[0]?.id ?? "none"
  };
}

function persist() {
  if (!memory) return;
  ensureRuntime();
  const seedIds = new Set(readDirFiles(RESUME_DIR).map((_, i) => String(i + 1)));
  const seedJobIds = new Set(readDirFiles(JD_DIR).map((f) => f.id));
  const customCandidates = memory.candidates.filter((c) => !seedIds.has(c.id));
  const customJobs = memory.jobs.filter((j) => !seedJobIds.has(j.id));
  fs.writeFileSync(CUSTOM_CANDIDATES, JSON.stringify(customCandidates, null, 2));
  fs.writeFileSync(CUSTOM_JOBS, JSON.stringify(customJobs, null, 2));
}

export function getStore(): StoreState {
  if (!memory) memory = loadSeed();
  return memory;
}

export function getActiveJob(): JobDescription {
  const store = getStore();
  return store.jobs.find((j) => j.id === store.activeJobId) ?? store.jobs[0];
}

export function setActiveJob(id: string): JobDescription | undefined {
  const store = getStore();
  const job = store.jobs.find((j) => j.id === id);
  if (job) store.activeJobId = id;
  return job;
}

export function addJob(job: JobDescription): JobDescription {
  const store = getStore();
  store.jobs.push(job);
  store.activeJobId = job.id;
  persist();
  return job;
}

export function addCandidate(profile: CandidateProfile): CandidateProfile {
  const store = getStore();
  store.candidates.push(profile);
  persist();
  return profile;
}

export function getCandidate(id: string): CandidateProfile | undefined {
  return getStore().candidates.find((c) => c.id === id);
}

export function nextCandidateId(): string {
  return String(getStore().candidates.length + 1);
}
