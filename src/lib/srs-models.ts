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
  optimizer?: CareerOptimizerReport;
}

export interface JdMatchBreakdown {
  overall: number;
  skillsMatch: number;
  experienceMatch: number;
  technologyMatch: number;
  responsibilityMatch: number;
  responsibilityMatchedCount?: number;
  responsibilityTotalCount?: number;
  atsKeywordMatch: number;
  educationCertMatch: number;
  leadershipMatch?: number;
  communicationMatch?: number;
  aiRelevanceMatch?: number;
  dimensionNotes?: {
    leadership: string;
    communication: string;
    aiRelevance: string;
  };
}

export interface ResponsibilityHighlight {
  responsibility: string;
  evidenceSnippet: string;
  coverage: number;
}

export interface RoleOpportunity {
  role: string;
  matchPercent: number;
  why: string;
  skillsToAdd?: string[];
  category: "best_fit" | "adjacent" | "high_growth" | "quick_win";
}

export interface SkillGapItem {
  skill: string;
  level: "strong" | "improve" | "missing" | "emerging";
  emoji: string;
  whyItMatters: string;
  marketNote: string;
  priority: "High" | "Medium" | "Low";
  learningApproach: string;
  evidenceStrength?: string;
}

export interface CareerOptimizerReport {
  jdMatch: JdMatchBreakdown;
  careerOpportunityScore: number;
  careerOpportunityLabel: string;
  topStrengths: string[];
  missingWeakSkills: string[];
  marketTrends: {
    fastGrowing: string[];
    emerging: string[];
    increasingDemand: string[];
    declining: string[];
    aiOpportunities: string[];
    liveSource?: string;
    liveFetchedAt?: string;
  };
  opportunities: RoleOpportunity[];
  skillGapPlan: SkillGapItem[];
  recommendedCvChanges: Array<{ area: string; change: string; truthful: boolean }>;
  whyMoreCompetitive: string[];
  nextBestActions: Array<{ title: string; detail: string; step: string }>;
  summarySuggestion?: string;
  responsibilityHighlights?: ResponsibilityHighlight[];
  responsibilityGaps?: string[];
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
  kind?: "bullet" | "summary";
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

export interface SavedJob {
  id: string;
  title: string;
  companyName: string;
  jdText: string;
  jobUrl: string;
  fitScore?: number;
  savedAt: string;
}

export interface AgencyUsageMeters {
  monthKey: string;
  analyzesRun: number;
  candidatesAdded: number;
  shortlistsExported: number;
}

export interface AgencyWorkspace {
  name: string;
  logoText: string;
  brandColor: string;
  tier: "Coach" | "Small Agency" | "Professional";
  seats: Array<{ clientId: string; clientName: string; status: string; progress: string; notes?: string }>;
  usageMeters?: AgencyUsageMeters;
}

export interface JobInputSnapshot {
  jobUrl: string;
  jdText: string;
}

export interface SeekerWorkspace {
  profile: CandidateProfile;
  vault: CareerVault;
  versions: ResumeVersion[];
  applications: ApplicationRecord[];
  activeJob: JobDescription | null;
  fit: FitReport | null;
  lastJobInput?: JobInputSnapshot;
  savedJobs?: SavedJob[];
  suggestions: TailorSuggestion[];
  findings: VerificationFinding[];
  tailoredDraft?: string;
}
