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
  applyReadiness: {
    level: "apply_now" | "tailor_first" | "stretch_role" | "fix_basics";
    headline: string;
    checklist: string[];
  };
  jdInsight: {
    coreSkillCount: number;
    responsibilityCount: number;
    parseNote: string;
  };
  coreMatches: string[];
  coreGaps: string[];
  experienceMatch: {
    jdMinYears: number | null;
    jdMaxYears: number | null;
    resumeYears: number;
    status: "meets" | "under" | "over" | "unknown";
    summary: string;
  };
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
  fitScore?: number;
  fitLabel?: string;
  fitBand?: string;
  referredBy?: string;
  referralUrl?: string;
}

export interface ApplicationKit {
  tailoredResume: string;
  coverLetter: string;
  shortCover: string;
  recruiterEmail: string;
  linkedinNote: string;
  whatsappNote: string;
  thankYouNote: string;
  referralNote: string;
  referrerChecklist: string[];
  highlights: string[];
  checklist: string[];
}

export interface OutcomeStats {
  byBand: Record<
    string,
    { saved: number; applied: number; interview: number; offer: number; rejected: number }
  >;
  totals: { applications: number; interviewRate: number; offerRate: number };
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
