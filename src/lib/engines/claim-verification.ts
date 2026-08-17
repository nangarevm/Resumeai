import type { CandidateProfile, Claim, EvidenceStrengthName } from "../models";

const ACTION_VERBS = [
  "developed",
  "built",
  "engineered",
  "designed",
  "created",
  "spearheaded",
  "implemented",
  "architected",
  "executed",
  "formulated",
  "led",
  "delivered",
  "analyzed",
  "modeled",
  "evaluated",
  "fabricated",
  "optimized",
  "optmized",
  "drove"
];

const METHODOLOGY_KEYWORDS = [
  "model",
  "algorithm",
  "methodology",
  "process",
  "strategy",
  "analysis",
  "design",
  "framework",
  "simulation",
  "architecture",
  "calculation",
  "technique",
  "valuation",
  "dcf",
  "fea",
  "pv",
  "seo",
  "cnn",
  "sql",
  "cad",
  "excel",
  "survey",
  "audit",
  "protocol"
];

const DEPLOYMENT_KEYWORDS = [
  "deployed",
  "production",
  "launched",
  "implemented",
  "installed",
  "delivered",
  "published",
  "commissioned",
  "operationalized",
  "executed",
  "validated",
  "live",
  "rest api",
  "onnx",
  "plant",
  "site",
  "portal"
];

export function verifyClaims(candidate: CandidateProfile): Claim[] {
  const claims: Claim[] = [];
  for (const line of candidate.rawResumeText.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length < 25) continue;
    const lower = trimmed.toLowerCase();
    const hasAction = ACTION_VERBS.some((verb) => lower.includes(verb));
    if (hasAction || /(achieved|system|campaign|project)/.test(lower)) {
      claims.push(analyzeClaim(trimmed, candidate));
    }
  }

  if (claims.length === 0) {
    claims.push({
      claimText: "Core domain contributions mentioned in profile",
      strength: "PARTIAL",
      verificationScore: 60,
      checklist: [
        "Project Context: Present",
        "Tool / Competency Stack: Specified",
        "Methodology / Process: Limited supporting evidence",
        "Quantified Results: Insufficient supporting evidence"
      ],
      recommendedAction: "Clarification recommended during technical interview."
    });
  }
  return claims;
}

function analyzeClaim(sentence: string, candidate: CandidateProfile): Claim {
  const lower = sentence.toLowerCase();
  const checklist: string[] = [];
  let score = 0;

  const hasVerb = ACTION_VERBS.some((verb) => lower.includes(verb));
  if (hasVerb) {
    score += 20;
    checklist.push("Action Verb: Present");
  } else {
    checklist.push("Action Verb: Missing / Passive");
  }

  let hasTool = candidate.extractedSkills.some((skill) => skill && lower.includes(skill.toLowerCase()));
  if (!hasTool) hasTool = /\b(using|with|via)\b/.test(lower) || /\bin\b/.test(lower);
  if (hasTool) {
    score += 20;
    checklist.push("Domain Tool / Skill Stack: Specified");
  } else {
    checklist.push("Domain Tool / Skill Stack: Missing");
  }

  const hasMethod = METHODOLOGY_KEYWORDS.some((method) => lower.includes(method));
  if (hasMethod) {
    score += 20;
    checklist.push("Methodology / Process Detail: Present");
  } else {
    checklist.push("Methodology / Process Detail: Limited supporting evidence");
  }

  let hasMetric = /\d+%/.test(lower) || /\d+\s*(mw|k|m|hours|users|gb|map|ctr|accuracy|growth|yield|efficiency|reduction)/i.test(lower);
  if (!hasMetric) hasMetric = /(percent|accuracy|increased|reduced|growth)/.test(lower);
  if (hasMetric) {
    score += 20;
    checklist.push("Quantified Metric / Results: Present");
  } else {
    checklist.push("Quantified Metric / Results: Insufficient supporting evidence");
  }

  const hasDeploy = DEPLOYMENT_KEYWORDS.some((dep) => lower.includes(dep));
  if (hasDeploy) {
    score += 20;
    checklist.push("Execution / Production Context: Present");
  } else {
    checklist.push("Execution / Production Context: Details not specified");
  }

  let strength: EvidenceStrengthName;
  let action: string;
  if (score >= 80) {
    strength = "STRONG";
    action = "Strong supporting evidence provided.";
  } else if (score >= 50) {
    strength = "PARTIAL";
    action = "Clarification recommended regarding specific implementation details.";
  } else {
    strength = "UNCLEAR";
    action = "Verification recommended during interview.";
  }

  return { claimText: sentence, strength, verificationScore: score, checklist, recommendedAction: action };
}
