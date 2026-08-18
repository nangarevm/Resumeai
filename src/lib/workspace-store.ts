import fs from "fs";
import path from "path";
import type { CandidateProfile, JobDescription } from "./models";
import type {
  AgencyWorkspace,
  ApplicationRecord,
  CareerVault,
  FitReport,
  JobInputSnapshot,
  ResumeVersion,
  SavedJob,
  SeekerWorkspace,
  TailorSuggestion,
  VerificationFinding
} from "./srs-models";
import { getCandidate, getStore } from "./store";
import { parseResume } from "./parsers/resume-parser";
import { buildCareerVault } from "./engines/career-vault";

function sanitizeUserId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

function resolveActiveUserId(): string {
  if (process.env.RESUMEPROOF_WORKSPACE_USER) return process.env.RESUMEPROOF_WORKSPACE_USER;
  if (activeUserId) return activeUserId;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require("next/headers") as typeof import("next/headers");
    const jar = cookies();
    const authUser = jar.get("rp_user")?.value;
    if (authUser) return authUser;
    const guest = jar.get("rp_guest")?.value;
    if (guest) return guest;
  } catch {
    /* outside request context (tests, scripts) */
  }
  return "default";
}

function resolveWorkspaceFile(): string {
  if (process.env.RESUMEPROOF_WORKSPACE_FILE) {
    return process.env.RESUMEPROOF_WORKSPACE_FILE;
  }
  const userId = sanitizeUserId(resolveActiveUserId());
  return path.join(process.cwd(), "data", "users", userId, "workspace.json");
}

const LEGACY_FILE = path.join(process.cwd(), "data", "runtime", "workspace.json");

let activeUserId: string | null = null;
let cacheKey: string | null = null;

interface WorkspaceFile {
  seeker: SeekerWorkspace;
  agency: AgencyWorkspace;
}

let cache: WorkspaceFile | null = null;

export function setWorkspaceUserId(userId: string): void {
  activeUserId = sanitizeUserId(userId);
  cache = null;
  cacheKey = null;
}

export function resetWorkspaceCache(): void {
  cache = null;
  cacheKey = null;
}

export function getWorkspaceFilePath(): string {
  return resolveWorkspaceFile();
}

function defaultSeeker(): SeekerWorkspace {
  const profile = getStore().candidates[0] || parseResume("seeker", "NAME: New user\nEMAIL: you@example.com\nSKILLS:\n- Communication\n");
  return {
    profile,
    vault: buildCareerVault(profile),
    versions: [
      {
        id: "ver-1",
        reason: "Imported source resume",
        snapshot: profile.rawResumeText,
        createdAt: new Date().toISOString()
      }
    ],
    applications: [],
    activeJob: null,
    fit: null,
    suggestions: [],
    findings: [],
    tailoredDraft: ""
  };
}

function defaultAgency(): AgencyWorkspace {
  const clients = getStore().candidates.slice(0, 6).map((c) => ({
    clientId: c.id,
    clientName: c.name,
    status: "Active",
    progress: "Vault imported"
  }));
  return {
    name: "ResumeProof Agency Desk",
    logoText: "RP",
    brandColor: "#58a6ff",
    tier: "Small Agency",
    seats: clients,
    usageMeters: currentUsageMeters()
  };
}

function currentUsageMeters(): AgencyWorkspace["usageMeters"] {
  const monthKey = new Date().toISOString().slice(0, 7);
  return { monthKey, analyzesRun: 0, candidatesAdded: 0, shortlistsExported: 0 };
}

function ensureUsageMeters(agency: AgencyWorkspace): AgencyWorkspace["usageMeters"] {
  const monthKey = new Date().toISOString().slice(0, 7);
  if (!agency.usageMeters || agency.usageMeters.monthKey !== monthKey) {
    agency.usageMeters = currentUsageMeters();
  }
  return agency.usageMeters;
}

function load(): WorkspaceFile {
  const file = resolveWorkspaceFile();
  if (cache && cacheKey === file) return cache;

  try {
    if (fs.existsSync(file)) {
      cache = JSON.parse(fs.readFileSync(file, "utf8")) as WorkspaceFile;
      cacheKey = file;
      return cache;
    }
    if (file !== LEGACY_FILE && fs.existsSync(LEGACY_FILE) && resolveActiveUserId() === "default") {
      cache = JSON.parse(fs.readFileSync(LEGACY_FILE, "utf8")) as WorkspaceFile;
      cacheKey = file;
      save();
      return cache;
    }
  } catch {
    /* ignore */
  }
  cache = { seeker: defaultSeeker(), agency: defaultAgency() };
  cacheKey = file;
  save();
  return cache;
}

function save() {
  if (!cache) return;
  const file = resolveWorkspaceFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache, null, 2));
  cacheKey = file;
}

export function getSeeker(): SeekerWorkspace {
  return load().seeker;
}

export function getAgency(): AgencyWorkspace {
  return load().agency;
}

export function setSeekerProfile(profile: CandidateProfile): SeekerWorkspace {
  const ws = load();
  ws.seeker.profile = profile;
  ws.seeker.vault = buildCareerVault(profile, ws.seeker.vault.targetRole, ws.seeker.vault.goals);
  ws.seeker.versions.unshift({
    id: `ver-${Date.now()}`,
    reason: "Resume import / edit",
    snapshot: profile.rawResumeText,
    createdAt: new Date().toISOString()
  });
  save();
  return ws.seeker;
}

export function updateVault(patch: Partial<CareerVault>): CareerVault {
  const ws = load();
  ws.seeker.vault = { ...ws.seeker.vault, ...patch, updatedAt: new Date().toISOString() };
  save();
  return ws.seeker.vault;
}

export function setActiveJob(job: JobDescription): void {
  const ws = load();
  ws.seeker.activeJob = job;
  save();
}

export function setLastJobInput(input: JobInputSnapshot): void {
  const ws = load();
  ws.seeker.lastJobInput = input;
  save();
}

export function saveJobToLibrary(entry: Omit<SavedJob, "id" | "savedAt"> & { id?: string }): SavedJob {
  const ws = load();
  if (!ws.seeker.savedJobs) ws.seeker.savedJobs = [];
  const saved: SavedJob = {
    id: entry.id || `job-${Date.now()}`,
    title: entry.title,
    companyName: entry.companyName,
    jdText: entry.jdText,
    jobUrl: entry.jobUrl,
    fitScore: entry.fitScore,
    savedAt: new Date().toISOString()
  };
  const idx = ws.seeker.savedJobs.findIndex((j) => j.id === saved.id);
  if (idx >= 0) ws.seeker.savedJobs[idx] = saved;
  else ws.seeker.savedJobs.unshift(saved);
  ws.seeker.savedJobs = ws.seeker.savedJobs.slice(0, 24);
  save();
  return saved;
}

export function deleteSavedJob(id: string): void {
  const ws = load();
  if (ws.seeker.savedJobs) {
    ws.seeker.savedJobs = ws.seeker.savedJobs.filter((j) => j.id !== id);
    save();
  }
}

export function incrementAgencyUsage(kind: "analyzesRun" | "candidatesAdded" | "shortlistsExported", n = 1): AgencyWorkspace {
  const ws = load();
  const meters = ensureUsageMeters(ws.agency)!;
  meters[kind] += n;
  save();
  return ws.agency;
}

export function setFit(fit: FitReport): void {
  const ws = load();
  const previous = ws.seeker.fit?.score;
  if (typeof previous === "number") {
    fit.previousScore = previous;
    fit.delta = fit.score - previous;
  }
  ws.seeker.fit = fit;
  save();
}

export function setEvidenceStatus(id: string, verificationStatus: CareerVault["evidence"][0]["verificationStatus"]): CareerVault {
  const ws = load();
  ws.seeker.vault.evidence = ws.seeker.vault.evidence.map((e) => (e.id === id ? { ...e, verificationStatus } : e));
  ws.seeker.vault.updatedAt = new Date().toISOString();
  save();
  return ws.seeker.vault;
}

export function exportWorkspace() {
  return load();
}

export function resetSeekerWorkspace(): SeekerWorkspace {
  const ws = load();
  ws.seeker = defaultSeeker();
  save();
  return ws.seeker;
}

export function updateSeatNotes(clientId: string, notes: string): AgencyWorkspace {
  const ws = load();
  ws.agency.seats = ws.agency.seats.map((s) => (s.clientId === clientId ? { ...s, notes } : s));
  save();
  return ws.agency;
}

export function setSuggestions(list: TailorSuggestion[]): void {
  load().seeker.suggestions = list;
  save();
}

export function snapshot(reason: string, snapshotText: string): ResumeVersion {
  const version: ResumeVersion = {
    id: `ver-${Date.now()}`,
    reason,
    snapshot: snapshotText,
    createdAt: new Date().toISOString()
  };
  load().seeker.versions.unshift(version);
  save();
  return version;
}

export function setFindings(list: VerificationFinding[]): void {
  load().seeker.findings = list;
  save();
}

export function setTailoredDraft(text: string): string {
  const ws = load();
  ws.seeker.tailoredDraft = text;
  save();
  return text;
}

export function getTailoredDraft(fallback: string): string {
  const draft = load().seeker.tailoredDraft?.trim();
  return draft || fallback;
}

export function addApplication(app: ApplicationRecord): ApplicationRecord {
  load().seeker.applications.unshift(app);
  save();
  return app;
}

export function updateApplication(id: string, patch: Partial<ApplicationRecord>): ApplicationRecord | undefined {
  const ws = load();
  const row = ws.seeker.applications.find((a) => a.id === id);
  if (!row) return undefined;
  Object.assign(row, patch);
  save();
  return row;
}

export function updateAgency(patch: Partial<AgencyWorkspace>): AgencyWorkspace {
  const ws = load();
  ws.agency = { ...ws.agency, ...patch };
  save();
  return ws.agency;
}

export function attachClientFromPool(candidateId: string): AgencyWorkspace {
  const c = getCandidate(candidateId);
  const ws = load();
  if (c && !ws.agency.seats.some((s) => s.clientId === c.id)) {
    ws.agency.seats.push({
      clientId: c.id,
      clientName: c.name,
      status: "Active",
      progress: "In review"
    });
    save();
  }
  return ws.agency;
}
