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
import { getSeedCandidates, getSeedJobs, getDefaultSeedJobId } from "./store";
import { parseResume } from "./parsers/resume-parser";
import { parseJD } from "./parsers/jd-extractor";
import { buildCareerVault } from "./engines/career-vault";
import { dataDir } from "./data-dir";

function sanitizeUserId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

/** Date.now() alone collides when two snapshots land in the same
 *  millisecond (a real risk — a fast test proved it, and a double-save or
 *  a tight autosave debounce could hit it in production too), which broke
 *  restoreVersion's id lookup by silently matching the wrong entry. */
function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function resolveActiveUserId(): Promise<string> {
  if (process.env.RESUMEPROOF_WORKSPACE_USER) return process.env.RESUMEPROOF_WORKSPACE_USER;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cookies } = require("next/headers") as typeof import("next/headers");
    // cookies() is request-scoped (Next.js AsyncLocalStorage) — always trust it over
    // the module-level activeUserId global when we're inside a request, since that
    // global is shared process-wide and would otherwise leak one user's identity
    // into a concurrent request from a different user.
    const jar = await cookies();
    const authUser = jar.get("rp_user")?.value;
    if (authUser) return authUser;
    const guest = jar.get("rp_guest")?.value;
    if (guest) return guest;
  } catch {
    /* outside request context (tests, scripts) — activeUserId is the only signal */
    if (activeUserId) return activeUserId;
  }
  return "default";
}

async function resolveWorkspaceFile(): Promise<string> {
  if (process.env.RESUMEPROOF_WORKSPACE_FILE) {
    return process.env.RESUMEPROOF_WORKSPACE_FILE;
  }
  const userId = sanitizeUserId(await resolveActiveUserId());
  return path.join(dataDir(), "users", userId, "workspace.json");
}

const LEGACY_FILE = path.join(dataDir(), "runtime", "workspace.json");

let activeUserId: string | null = null;

interface WorkspaceFile {
  seeker: SeekerWorkspace;
  agency: AgencyWorkspace;
}

// Keyed by resolved file path (one entry per user) instead of a single shared slot —
// a single-slot cache let one request's load overwrite the in-memory copy another
// concurrent request from a different user was about to save, corrupting either
// user's data. Each user's entry is independent, so interleaved requests from
// different users can no longer stomp on each other.
const workspaceCache = new Map<string, WorkspaceFile>();

export function setWorkspaceUserId(userId: string): void {
  activeUserId = sanitizeUserId(userId);
}

export function resetWorkspaceCache(): void {
  workspaceCache.clear();
}

export async function getWorkspaceFilePath(): Promise<string> {
  return resolveWorkspaceFile();
}

function defaultSeeker(): SeekerWorkspace {
  const profile = getSeedCandidates()[0] || parseResume("seeker", "NAME: New user\nEMAIL: you@example.com\nSKILLS:\n- Communication\n");
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
  const clients = getSeedCandidates()
    .slice(0, 6)
    .map((c) => ({
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
    usageMeters: currentUsageMeters(),
    customCandidates: [],
    customJobs: [],
    activeJobId: null
  };
}

/** Older persisted workspace.json files predate customCandidates/customJobs/
 *  activeJobId — default them in rather than let every downstream .push()/
 *  .filter() on ws.agency.customCandidates crash on undefined. */
function normalizeAgency(agency: AgencyWorkspace): AgencyWorkspace {
  return {
    ...agency,
    customCandidates: agency.customCandidates ?? [],
    customJobs: agency.customJobs ?? [],
    activeJobId: agency.activeJobId ?? null
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

async function load(): Promise<WorkspaceFile> {
  const file = await resolveWorkspaceFile();
  const cached = workspaceCache.get(file);
  if (cached) return cached;

  try {
    // file is always anchored under data/users/**, computed above — the ignore
    // comments stop Turbopack from tracing (and bundling) the whole project just
    // because the exact segment isn't statically known at build time.
    if (fs.existsSync(/* turbopackIgnore: true */ file)) {
      const ws = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")) as WorkspaceFile;
      ws.agency = normalizeAgency(ws.agency);
      workspaceCache.set(file, ws);
      return ws;
    }
    if (file !== LEGACY_FILE && fs.existsSync(LEGACY_FILE) && (await resolveActiveUserId()) === "default") {
      const ws = JSON.parse(fs.readFileSync(LEGACY_FILE, "utf8")) as WorkspaceFile;
      ws.agency = normalizeAgency(ws.agency);
      workspaceCache.set(file, ws);
      await save(ws);
      return ws;
    }
  } catch {
    /* ignore */
  }
  const ws: WorkspaceFile = { seeker: defaultSeeker(), agency: defaultAgency() };
  workspaceCache.set(file, ws);
  await save(ws);
  return ws;
}

async function save(ws: WorkspaceFile) {
  const file = await resolveWorkspaceFile();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(ws, null, 2));
  workspaceCache.set(file, ws);
}

export async function getSeeker(): Promise<SeekerWorkspace> {
  return (await load()).seeker;
}

/** Reads a SPECIFIC account's seeker workspace by userId, bypassing the
 *  request-scoped resolveActiveUserId()/cookie mechanism entirely — for
 *  scheduled jobs (the weekly digest cron route) that need to iterate every
 *  account rather than resolve "the current" one. Shares the same on-disk
 *  layout and in-memory cache as the request-scoped path above, so a
 *  concurrent request for the same user stays consistent. Throws if that
 *  account has never saved a workspace. */
export async function getSeekerForUserId(userId: string): Promise<SeekerWorkspace> {
  const file = path.join(dataDir(), "users", sanitizeUserId(userId), "workspace.json");
  const cached = workspaceCache.get(file);
  if (cached) return cached.seeker;
  if (!fs.existsSync(/* turbopackIgnore: true */ file)) throw new Error("no_workspace");
  const ws = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")) as WorkspaceFile;
  ws.agency = normalizeAgency(ws.agency);
  workspaceCache.set(file, ws);
  return ws.seeker;
}

/** Records that a digest email went out for this account, so the next run
 *  can compute a delta and throttle how often it re-sends. Counterpart to
 *  getSeekerForUserId above — same direct-by-id path, same shared cache. */
export async function recordDigestSent(userId: string, healthPercent: number): Promise<void> {
  const file = path.join(dataDir(), "users", sanitizeUserId(userId), "workspace.json");
  let ws = workspaceCache.get(file);
  if (!ws) {
    if (!fs.existsSync(/* turbopackIgnore: true */ file)) return;
    ws = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")) as WorkspaceFile;
    ws.agency = normalizeAgency(ws.agency);
  }
  ws.seeker.lastDigestSentAt = new Date().toISOString();
  ws.seeker.lastDigestHealthPercent = healthPercent;
  fs.writeFileSync(file, JSON.stringify(ws, null, 2));
  workspaceCache.set(file, ws);
}

export async function getAgency(): Promise<AgencyWorkspace> {
  return (await load()).agency;
}

// Every save snapshots the full resume text (not lightweight metadata like
// applications[] or savedJobs[]), so this list is capped the same way
// savedJobs already is — old snapshots beyond a reasonable history depth
// are low-stakes to drop, unlike application-tracking records. Pinned
// (named) resumes are capped separately and more generously — a user who
// deliberately names and keeps a handful of resumes shouldn't have one
// silently evicted by a later flurry of ordinary auto-saves.
const MAX_AUTO_VERSIONS = 20;
const MAX_PINNED_VERSIONS = 10;

function capVersions(versions: ResumeVersion[]): ResumeVersion[] {
  // versions is always newest-first (every write unshifts), so slicing
  // each group to its cap and filtering back against the original array
  // caps both counts independently while preserving relative order.
  const pinnedIds = new Set(versions.filter((v) => v.pinned).slice(0, MAX_PINNED_VERSIONS).map((v) => v.id));
  const autoIds = new Set(versions.filter((v) => !v.pinned).slice(0, MAX_AUTO_VERSIONS).map((v) => v.id));
  return versions.filter((v) => (v.pinned ? pinnedIds.has(v.id) : autoIds.has(v.id)));
}

export async function setSeekerProfile(profile: CandidateProfile, reason = "Resume import / edit"): Promise<SeekerWorkspace> {
  const ws = await load();
  ws.seeker.profile = profile;
  ws.seeker.vault = buildCareerVault(profile, ws.seeker.vault.targetRole, ws.seeker.vault.goals);
  ws.seeker.versions.unshift({
    id: uniqueId("ver"),
    reason,
    snapshot: profile.rawResumeText,
    createdAt: new Date().toISOString()
  });
  ws.seeker.versions = capVersions(ws.seeker.versions);
  await save(ws);
  return ws.seeker;
}

/** Photo-only update — deliberately bypasses setSeekerProfile so swapping a
 *  headshot doesn't rebuild the vault or push a new resume-text version. */
export async function setSeekerPhoto(photoDataUrl: string | null): Promise<SeekerWorkspace> {
  const ws = await load();
  ws.seeker.profile = { ...ws.seeker.profile, photoDataUrl: photoDataUrl ?? undefined };
  await save(ws);
  return ws.seeker;
}

export async function updateVault(patch: Partial<CareerVault>): Promise<CareerVault> {
  const ws = await load();
  ws.seeker.vault = { ...ws.seeker.vault, ...patch, updatedAt: new Date().toISOString() };
  await save(ws);
  return ws.seeker.vault;
}

export async function setActiveJob(job: JobDescription): Promise<void> {
  const ws = await load();
  ws.seeker.activeJob = job;
  await save(ws);
}

export async function setLastJobInput(input: JobInputSnapshot): Promise<void> {
  const ws = await load();
  ws.seeker.lastJobInput = input;
  await save(ws);
}

export async function saveJobToLibrary(entry: Omit<SavedJob, "id" | "savedAt"> & { id?: string }): Promise<SavedJob> {
  const ws = await load();
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
  await save(ws);
  return saved;
}

export async function deleteSavedJob(id: string): Promise<void> {
  const ws = await load();
  if (ws.seeker.savedJobs) {
    ws.seeker.savedJobs = ws.seeker.savedJobs.filter((j) => j.id !== id);
    await save(ws);
  }
}

export async function incrementAgencyUsage(kind: "analyzesRun" | "candidatesAdded" | "shortlistsExported", n = 1): Promise<AgencyWorkspace> {
  const ws = await load();
  const meters = ensureUsageMeters(ws.agency)!;
  meters[kind] += n;
  await save(ws);
  return ws.agency;
}

export async function setFit(fit: FitReport): Promise<void> {
  const ws = await load();
  const previous = ws.seeker.fit?.score;
  if (typeof previous === "number") {
    fit.previousScore = previous;
    fit.delta = fit.score - previous;
  }
  ws.seeker.fit = fit;
  await save(ws);
}

export async function setEvidenceStatus(id: string, verificationStatus: CareerVault["evidence"][0]["verificationStatus"]): Promise<CareerVault> {
  const ws = await load();
  ws.seeker.vault.evidence = ws.seeker.vault.evidence.map((e) => (e.id === id ? { ...e, verificationStatus } : e));
  ws.seeker.vault.updatedAt = new Date().toISOString();
  await save(ws);
  return ws.seeker.vault;
}

export async function exportWorkspace() {
  return load();
}

export async function resetSeekerWorkspace(): Promise<SeekerWorkspace> {
  const ws = await load();
  ws.seeker = defaultSeeker();
  await save(ws);
  return ws.seeker;
}

export async function updateSeatNotes(clientId: string, notes: string): Promise<AgencyWorkspace> {
  const ws = await load();
  ws.agency.seats = ws.agency.seats.map((s) => (s.clientId === clientId ? { ...s, notes } : s));
  await save(ws);
  return ws.agency;
}

export async function setSuggestions(list: TailorSuggestion[]): Promise<void> {
  const ws = await load();
  ws.seeker.suggestions = list;
  await save(ws);
}

export async function snapshot(reason: string, snapshotText: string, pinned = false): Promise<ResumeVersion> {
  const version: ResumeVersion = {
    id: uniqueId("ver"),
    reason,
    snapshot: snapshotText,
    createdAt: new Date().toISOString(),
    ...(pinned ? { pinned: true as const } : {})
  };
  const ws = await load();
  ws.seeker.versions.unshift(version);
  ws.seeker.versions = capVersions(ws.seeker.versions);
  await save(ws);
  return version;
}

/** Saves the CURRENT resume as a named, pinned resume — the "multiple
 *  resumes" feature. Reuses the same snapshot machinery as auto-history,
 *  just flagged pinned so it's exempt from the auto-history cap and
 *  surfaced separately in the UI. */
export async function pinCurrentResume(name: string): Promise<ResumeVersion> {
  const ws = await load();
  return snapshot(name, ws.seeker.profile.rawResumeText, true);
}

export type VersionActionError = "not_found";

export async function renamePinnedVersion(versionId: string, newName: string): Promise<ResumeVersion | VersionActionError> {
  const ws = await load();
  const version = ws.seeker.versions.find((v) => v.id === versionId && v.pinned);
  if (!version) return "not_found";
  version.reason = newName;
  await save(ws);
  return version;
}

export async function deletePinnedVersion(versionId: string): Promise<boolean> {
  const ws = await load();
  const before = ws.seeker.versions.length;
  ws.seeker.versions = ws.seeker.versions.filter((v) => !(v.id === versionId && v.pinned));
  if (ws.seeker.versions.length === before) return false;
  await save(ws);
  return true;
}

export type RestoreVersionError = "not_found";

/** Restoring never deletes the version being restored FROM — the current
 *  state before the restore was already snapshotted at its own last save,
 *  and setSeekerProfile snapshots again on the way in, so the full chain
 *  stays reachable in versions[] (up to MAX_VERSIONS deep). */
export async function restoreVersion(versionId: string): Promise<SeekerWorkspace | RestoreVersionError> {
  const ws = await load();
  const version = ws.seeker.versions.find((v) => v.id === versionId);
  if (!version) return "not_found";
  const profile = parseResume(ws.seeker.profile.id, version.snapshot);
  const reason = version.pinned ? `Switched to "${version.reason}"` : `Restored from ${new Date(version.createdAt).toLocaleString()}`;
  return setSeekerProfile(profile, reason);
}

export async function setFindings(list: VerificationFinding[]): Promise<void> {
  const ws = await load();
  ws.seeker.findings = list;
  await save(ws);
}

export async function setTailoredDraft(text: string): Promise<string> {
  const ws = await load();
  ws.seeker.tailoredDraft = text;
  await save(ws);
  return text;
}

export async function getTailoredDraft(fallback: string): Promise<string> {
  const draft = (await load()).seeker.tailoredDraft?.trim();
  return draft || fallback;
}

export async function addApplication(app: ApplicationRecord): Promise<ApplicationRecord> {
  const ws = await load();
  ws.seeker.applications.unshift(app);
  await save(ws);
  return app;
}

export async function updateApplication(id: string, patch: Partial<ApplicationRecord>): Promise<ApplicationRecord | undefined> {
  const ws = await load();
  const row = ws.seeker.applications.find((a) => a.id === id);
  if (!row) return undefined;
  Object.assign(row, patch);
  await save(ws);
  return row;
}

export async function updateAgency(patch: Partial<AgencyWorkspace>): Promise<AgencyWorkspace> {
  const ws = await load();
  ws.agency = { ...ws.agency, ...patch };
  await save(ws);
  return ws.agency;
}

export async function attachClientFromPool(candidateId: string): Promise<AgencyWorkspace> {
  const ws = await load();
  const c = [...getSeedCandidates(), ...ws.agency.customCandidates].find((x) => x.id === candidateId);
  if (c && !ws.agency.seats.some((s) => s.clientId === c.id)) {
    ws.agency.seats.push({
      clientId: c.id,
      clientName: c.name,
      status: "Active",
      progress: "In review"
    });
    await save(ws);
  }
  return ws.agency;
}

export async function removeAgencySeat(clientId: string): Promise<AgencyWorkspace> {
  const ws = await load();
  ws.agency.seats = ws.agency.seats.filter((s) => s.clientId !== clientId);
  await save(ws);
  return ws.agency;
}

/** This account's full candidate pool — the shared read-only demo seed data
 *  plus this account's own additions, tagged so the UI can tell which rows
 *  it's allowed to delete (only its own additions, never the shared seed). */
export async function getAgencyCandidatePool(): Promise<Array<CandidateProfile & { isCustom: boolean }>> {
  const ws = await load();
  return [
    ...getSeedCandidates().map((c) => ({ ...c, isCustom: false })),
    ...ws.agency.customCandidates.map((c) => ({ ...c, isCustom: true }))
  ];
}

export async function getAgencyCandidateById(candidateId: string): Promise<CandidateProfile | undefined> {
  return (await getAgencyCandidatePool()).find((c) => c.id === candidateId);
}

export async function addAgencyCandidate(rawResumeText: string): Promise<CandidateProfile> {
  const ws = await load();
  const profile = parseResume(uniqueId("cand"), rawResumeText);
  ws.agency.customCandidates.push(profile);
  await save(ws);
  return profile;
}

/** Only removes this account's own added candidates — the shared seed pool
 *  isn't per-account data, so there's nothing to remove there. Also drops
 *  any client seat pointing at the removed candidate, so deleting someone
 *  from the pool doesn't leave a dangling seat referencing a ghost id. */
export async function removeAgencyCandidate(candidateId: string): Promise<boolean> {
  const ws = await load();
  const before = ws.agency.customCandidates.length;
  ws.agency.customCandidates = ws.agency.customCandidates.filter((c) => c.id !== candidateId);
  const removed = ws.agency.customCandidates.length !== before;
  if (removed) {
    ws.agency.seats = ws.agency.seats.filter((s) => s.clientId !== candidateId);
    await save(ws);
  }
  return removed;
}

export async function getAgencyJobs(): Promise<Array<JobDescription & { isCustom: boolean }>> {
  const ws = await load();
  return [...getSeedJobs().map((j) => ({ ...j, isCustom: false })), ...ws.agency.customJobs.map((j) => ({ ...j, isCustom: true }))];
}

export async function getAgencyActiveJob(): Promise<(JobDescription & { isCustom: boolean }) | undefined> {
  const ws = await load();
  const jobs = await getAgencyJobs();
  const activeId = ws.agency.activeJobId || getDefaultSeedJobId();
  return jobs.find((j) => j.id === activeId) ?? jobs[0];
}

export async function addAgencyJob(rawJdText: string): Promise<JobDescription> {
  const ws = await load();
  const jd = parseJD(uniqueId("job"), rawJdText);
  ws.agency.customJobs.push(jd);
  ws.agency.activeJobId = jd.id;
  await save(ws);
  return jd;
}

export async function setAgencyActiveJobId(jobId: string): Promise<JobDescription | undefined> {
  const ws = await load();
  const job = [...getSeedJobs(), ...ws.agency.customJobs].find((j) => j.id === jobId);
  if (job) {
    ws.agency.activeJobId = jobId;
    await save(ws);
  }
  return job;
}

/** Only removes this account's own posted jobs — the shared seed JDs aren't
 *  per-account data. If the removed job was active, falls back to the first
 *  remaining job instead of leaving activeJobId pointing at nothing. */
export async function removeAgencyJob(jobId: string): Promise<boolean> {
  const ws = await load();
  const before = ws.agency.customJobs.length;
  ws.agency.customJobs = ws.agency.customJobs.filter((j) => j.id !== jobId);
  const removed = ws.agency.customJobs.length !== before;
  if (removed) {
    if (ws.agency.activeJobId === jobId) {
      const remaining = [...getSeedJobs(), ...ws.agency.customJobs];
      ws.agency.activeJobId = remaining[0]?.id ?? null;
    }
    await save(ws);
  }
  return removed;
}
