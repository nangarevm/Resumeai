export type EvidenceStrengthName =
  | "STRONG"
  | "PARTIAL"
  | "UNCLEAR"
  | "NOT_FOUND"
  | "NEGATIVE";

export type EvaluationModeName = "STRICT" | "BALANCED" | "BEST_MATCH";

export type RequirementCategoryName =
  | "SKILL_TECH"
  | "SKILL_SOFT"
  | "EXPERIENCE"
  | "EDUCATION"
  | "PROJECT"
  | "CERTIFICATION";

export type ImportanceName = "HIGH" | "MEDIUM" | "LOW";

export const EVIDENCE_STRENGTH: Record<
  EvidenceStrengthName,
  { label: string; icon: string; multiplier: number; tone: string }
> = {
  STRONG: { label: "Strong Evidence", icon: "🟢", multiplier: 1.0, tone: "green" },
  PARTIAL: { label: "Partial Evidence", icon: "🟡", multiplier: 0.6, tone: "yellow" },
  UNCLEAR: { label: "Needs Verification", icon: "🟠", multiplier: 0.3, tone: "orange" },
  NOT_FOUND: { label: "Not Found", icon: "🔴", multiplier: 0.0, tone: "red" },
  NEGATIVE: { label: "Not Demonstrated", icon: "⛔", multiplier: -0.5, tone: "blocked" }
};

export const EVALUATION_MODES: Record<
  EvaluationModeName,
  { title: string; description: string }
> = {
  STRICT: {
    title: "Strict Mode",
    description:
      "Mandatory requirements are hard filters. Candidates missing ANY mandatory requirement are immediately rejected."
  },
  BALANCED: {
    title: "Balanced Mode",
    description:
      "Mandatory requirements act as primary filters. Preferred criteria and evidence strength drive ranking."
  },
  BEST_MATCH: {
    title: "Best Match Mode",
    description:
      "No hard elimination. Ranks every candidate holistically on overall suitability and requirement coverage."
  }
};

export const REQUIREMENT_CATEGORIES: Record<
  RequirementCategoryName,
  { label: string; categoryWeight: number }
> = {
  SKILL_TECH: { label: "Technical Skill", categoryWeight: 1.2 },
  SKILL_SOFT: { label: "Soft Skill", categoryWeight: 0.8 },
  EXPERIENCE: { label: "Experience", categoryWeight: 1.1 },
  EDUCATION: { label: "Education", categoryWeight: 1.0 },
  PROJECT: { label: "Project Experience", categoryWeight: 1.2 },
  CERTIFICATION: { label: "Certification", categoryWeight: 0.9 }
};

export const IMPORTANCE: Record<ImportanceName, { label: string; weight: number }> = {
  HIGH: { label: "High", weight: 3.0 },
  MEDIUM: { label: "Medium", weight: 2.0 },
  LOW: { label: "Low", weight: 1.0 }
};

export interface CareerPreferences {
  dreamCompanies: string[];
  preferredRoles: string[];
  preferredDomains: string[];
}

export interface Requirement {
  name: string;
  category: RequirementCategoryName;
  importance: ImportanceName;
  mandatory: boolean;
  synonyms: string[];
}

export interface JobDescription {
  id: string;
  title: string;
  companyName: string;
  domain: string;
  rawText: string;
  mandatoryRequirements: Requirement[];
  preferredRequirements: Requirement[];
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  rawResumeText: string;
  parsedSections: Record<string, string>;
  extractedSkills: string[];
  extractedProjects: string[];
  preferences: CareerPreferences;
  linkedinUrl?: string;
  githubUrl?: string;
}

export interface Evidence {
  requirementName: string;
  strength: EvidenceStrengthName;
  snippet: string;
  sourceSection: string;
  contextNote: string;
  confidence: number;
}

export interface Claim {
  claimText: string;
  strength: EvidenceStrengthName;
  verificationScore: number;
  checklist: string[];
  recommendedAction: string;
}

export interface InterviewQuestion {
  target: string;
  question: string;
  category: string;
  priority: number;
  starGuide?: string;
}

export interface EvaluationResult {
  candidateId: string;
  candidateName: string;
  mode: EvaluationModeName;
  modeTitle: string;
  qualificationScore: number;
  isShortlisted: boolean;
  rejectionReason: string;
  evidenceList: Evidence[];
  claims: Claim[];
  strongAreas: string[];
  partialAreas: string[];
  missingRequirements: string[];
  verificationFlags: string[];
  interviewQuestions: InterviewQuestion[];
  preferenceAlignment: string;
  explanationText: string;
}

export type FactColor = "green" | "yellow" | "red";

export interface EvidenceChainItem {
  original: string;
  rewritten: string;
  color: FactColor;
  source: string;
  reason: string;
  confirmationQuestion?: string;
}

export interface OptimizerLayer {
  id: "repair" | "logic" | "rewrite" | "match";
  title: string;
  summary: string;
  findings: Array<{
    severity: "info" | "warn" | "block";
    title: string;
    detail: string;
  }>;
  chain: EvidenceChainItem[];
}

export interface OptimizerResult {
  layers: OptimizerLayer[];
  confirmationQueue: Array<{ question: string; why: string; blocksWrite: boolean }>;
  optimizedResume: string;
  matchBreakdown: {
    strong: string[];
    transferable: string[];
    weak: string[];
    noEvidence: string[];
    gaps: string[];
  };
}

export interface AtsReport {
  score: number;
  grade: string;
  checks: Array<{ name: string; passed: boolean; weight: number; detail: string }>;
  keywordHits: string[];
  keywordMisses: string[];
  recommendations: string[];
}

export interface CoverLetterResult {
  letter: string;
  usedEvidence: string[];
  blockedClaims: string[];
}

export interface GithubProofResult {
  username?: string;
  urls: string[];
  claimsMentioningGithub: string[];
  publicSummary?: {
    publicRepos?: number;
    followers?: number;
    bio?: string;
    topRepos?: Array<{ name: string; stars: number; language: string | null; description: string | null }>;
  };
  proofNotes: string[];
  confidence: number;
}

export function allRequirements(jd: JobDescription): Requirement[] {
  return [...jd.mandatoryRequirements, ...jd.preferredRequirements];
}

export function emptyPreferences(): CareerPreferences {
  return { dreamCompanies: [], preferredRoles: [], preferredDomains: [] };
}
