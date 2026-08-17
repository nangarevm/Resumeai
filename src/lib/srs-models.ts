import type { CandidateProfile, JobDescription } from "./models";

export type EvidenceType =
  | "work"
  | "project"
  | "achievement"
  | "skill"
  | "education"
  | "certification";

export type VerificationStatus = "unconfirmed" | "approved" | "archived";
export type SuggestionStatus = "pending" | "accepted" | "rejected" | "edited";
export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Rejected"
  | "Withdrawn";

export interface CareerEvidence {
  id: string;
  type: EvidenceType;
  content: string;
  tags: string[];
  source: string;
  verificationStatus: VerificationStatus;
}

export interface CareerVault {
  profileId: string;
  targetRole: string;
  goals: string;
  evidence: CareerEvidence[];
  updatedAt: string;
}

export interface ResumeVersion {
  id: string;
  reason: string;
  snapshot: string;
  createdAt: string;
}

export interface FitSubScores {
  keywordCoverage: number;
  evidenceStrength: number;
  atsReadiness: number;
  completeness: number;
}

export interface FitReport {
  score: number;
  label: string;
  disclaimer: string;
  subScores: FitSubScores;
  matches: string[];
  transferable: string[];
  gaps: string[];
  notPossessed: string[];
  inferredRequirements: string[];
  explicitRequirements: string[];
  parserPreview: string;
  explanation: string;
  nextActions: Array<{ title: string; detail: string; step: string }>;
  scoreMovers: Array<{ title: string; detail: string }>;
  previousScore?: number;
  delta?: number;
}

export interface TailorSuggestion {
  id: string;
  original: string;
  proposed: string;
  evidenceIds: string[];
  confidence: number;
  reason: string;
  status: SuggestionStatus;
  blocked: boolean;
}

export interface VerificationFinding {
  id: string;
  claim: string;
  risk: "high" | "medium" | "low";
  reason: string;
  resolution: "open" | "removed" | "confirmed" | "edited";
}

export interface ApplicationRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  resumeVersionId?: string;
  notes: string;
  savedAt: string;
  appliedAt?: string;
  outcome?: string;
}

export interface ApplicationKit {
  tailoredResume: string;
  coverLetter: string;
  recruiterEmail: string;
  linkedinNote: string;
  whatsappNote: string;
  thankYouNote: string;
  referralNote: string;
  highlights: string[];
  checklist: string[];
}

export interface CareerChangePlan {
  targetRole: string;
  transferable: Array<{ skill: string; fromEvidence: string }>;
  missing: string[];
  truthfulFraming: string[];
  strategy: string[];
  plan90: Array<{ window: string; action: string }>;
  thisMonthLearn: string[];
}

export interface AgencyWorkspace {
  name: string;
  logoText: string;
  brandColor: string;
  tier: "Coach" | "Small Agency" | "Professional";
  seats: Array<{ clientId: string; clientName: string; status: string; progress: string; notes?: string }>;
}

export interface SeekerWorkspace {
  profile: CandidateProfile;
  vault: CareerVault;
  versions: ResumeVersion[];
  applications: ApplicationRecord[];
  activeJob: JobDescription | null;
  fit: FitReport | null;
  suggestions: TailorSuggestion[];
  findings: VerificationFinding[];
  tailoredDraft?: string;
}
