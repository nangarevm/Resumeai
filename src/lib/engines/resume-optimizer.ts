import type { CandidateProfile, EvidenceChainItem, JobDescription, OptimizerLayer, OptimizerResult } from "../models";
import { allRequirements } from "../models";
import { commonTechMisspellings } from "./synonym-lexicon";
import { expandSynonyms } from "./synonym-lexicon";
import { validateTimeline } from "./timeline-validator";
import { extractEvidence } from "./evidence-engine";
import { splitSentences } from "../parsers/text-normalizer";

const INFLATED: Array<[RegExp, string]> = [
  [/\bhelped with\b/gi, "supported"],
  [/\bwas responsible for\b/gi, "owned"],
  [/\bworked on\b/gi, "delivered"],
  [/\bparticipated in\b/gi, "contributed to"]
];

const FORBIDDEN_INVENTIONS = [
  /\b\d+%\s*(growth|increase|reduction|improvement)/i,
  /\bled a team of\s*\d+/i,
  /\b\$\d|\bmillion\b|\bseries [abc]\b/i
];

export function optimizeResume(candidate: CandidateProfile, jd?: JobDescription): OptimizerResult {
  const repair = layerRepair(candidate);
  const logic = layerLogic(candidate);
  const rewrite = layerRewrite(candidate);
  const match = layerMatch(candidate, jd);

  const confirmationQueue = [...repair.chain, ...logic.chain, ...rewrite.chain, ...match.chain]
    .filter((item) => item.color !== "green")
    .map((item) => ({
      question: item.confirmationQuestion || `Can you confirm: ${item.rewritten}`,
      why: item.reason,
      blocksWrite: item.color === "red"
    }));

  return {
    layers: [repair, logic, rewrite, match],
    confirmationQueue,
    optimizedResume: buildOptimizedResume(candidate, rewrite.chain, match.chain),
    matchBreakdown: matchBreakdown(candidate, jd)
  };
}

function layerRepair(candidate: CandidateProfile): OptimizerLayer {
  const findings: OptimizerLayer["findings"] = [];
  const chain: EvidenceChainItem[] = [];
  const misspellings = commonTechMisspellings();
  const text = candidate.rawResumeText;

  for (const [wrong, right] of Object.entries(misspellings)) {
    const re = new RegExp(`\\b${wrong}\\b`, "gi");
    if (re.test(text)) {
      findings.push({
        severity: "warn",
        title: `Spelling: ${wrong}`,
        detail: `Replace "${wrong}" with "${right}".`
      });
      chain.push({
        original: wrong,
        rewritten: right,
        color: "green",
        source: "Layer 1 · Repair",
        reason: "Orthographic fix with a unique correct form."
      });
    }
  }

  if (/[ ]{2,}/.test(text)) {
    findings.push({ severity: "info", title: "Spacing", detail: "Collapse repeated spaces for ATS cleanliness." });
  }
  if ((text.match(/[A-Z]{8,}/g) || []).length > 3) {
    findings.push({
      severity: "info",
      title: "All-caps noise",
      detail: "Long all-caps runs reduce readability. Keep headings short."
    });
  }
  const long = splitSentences(text).filter((s) => s.split(/\s+/).length > 38);
  for (const s of long.slice(0, 3)) {
    findings.push({
      severity: "warn",
      title: "Overlong sentence",
      detail: `Split this into two evidence bullets: "${s.slice(0, 90)}…"`
    });
    chain.push({
      original: s,
      rewritten: splitLongSentence(s),
      color: "yellow",
      source: "Layer 1 · Repair",
      reason: "Sentence split is a formatting inference. Confirm the two clauses are still accurate.",
      confirmationQuestion: "Is this split still factually the same as your original sentence?"
    });
  }
  if (!findings.length) {
    findings.push({ severity: "info", title: "Surface language", detail: "No obvious spelling or formatting defects." });
  }
  return { id: "repair", title: "Layer 1 · Repair basic errors", summary: "Spelling, spacing, sentence length, and ATS-safe formatting.", findings, chain };
}

function layerLogic(candidate: CandidateProfile): OptimizerLayer {
  const findings = validateTimeline(candidate);
  const chain: EvidenceChainItem[] = findings
    .filter((f) => f.severity !== "info")
    .map((f) => ({
      original: f.title,
      rewritten: f.detail,
      color: f.severity === "block" ? "red" : "yellow",
      source: "Layer 2 · Career logic",
      reason: f.detail,
      confirmationQuestion: `Please confirm the dates/scope behind: ${f.title}`
    }));
  return {
    id: "logic",
    title: "Layer 2 · Validate career logic",
    summary: "Date conflicts, tenure vs claimed years, intern vs leadership mismatch. Flags need confirmation — never auto-correct facts.",
    findings,
    chain
  };
}

function layerRewrite(candidate: CandidateProfile): OptimizerLayer {
  const findings: OptimizerLayer["findings"] = [];
  const chain: EvidenceChainItem[] = [];
  const bullets = collectBullets(candidate);

  for (const bullet of bullets) {
    const inflated = FORBIDDEN_INVENTIONS.find((re) => re.test(bullet));
    if (inflated) {
      chain.push({
        original: bullet,
        rewritten: bullet,
        color: "red",
        source: "Layer 3 · Recruiter rewrite",
        reason: "Metric or leadership scale is not independently evidenced. Blocked from auto-write.",
        confirmationQuestion: "Do you have a source for this number or team size? If not, it stays out of the final resume."
      });
      findings.push({ severity: "block", title: "Unverified magnitude", detail: bullet });
      continue;
    }

    let rewritten = bullet;
    for (const [from, to] of INFLATED) rewritten = rewritten.replace(from, to);
    rewritten = recruiterShape(rewritten);

    const color = rewritten === bullet ? "green" : "yellow";
    chain.push({
      original: bullet,
      rewritten,
      color,
      source: "Layer 3 · Recruiter rewrite",
      reason:
        color === "green"
          ? "Kept original facts; already in recruiter-readable form."
          : "Reworded for problem → action → result without adding numbers, titles, or tools.",
      confirmationQuestion:
        color === "yellow" ? `Is this still true without exaggeration?\nOriginal: ${bullet}\nProposed: ${rewritten}` : undefined
    });
    if (color === "yellow") {
      findings.push({
        severity: "warn",
        title: "Needs confirmation before final write",
        detail: rewritten
      });
    }
  }

  if (!findings.length) {
    findings.push({
      severity: "info",
      title: "Rewrite ready",
      detail: "Existing bullets already carry action + context. No invented outcomes were added."
    });
  }

  return {
    id: "rewrite",
    title: "Layer 3 · Recruiter-perspective rewrite",
    summary: "Reframe 'I did tasks' as problem, role, action, tools, result — only using facts already in the resume.",
    findings,
    chain
  };
}

function layerMatch(candidate: CandidateProfile, jd?: JobDescription): OptimizerLayer {
  const breakdown = matchBreakdown(candidate, jd);
  const findings: OptimizerLayer["findings"] = [];
  const chain: EvidenceChainItem[] = [];

  if (!jd) {
    findings.push({
      severity: "info",
      title: "No target JD",
      detail: "Paste a job description to classify strong / transferable / gap evidence."
    });
  } else {
    findings.push({ severity: "info", title: "Strong match", detail: breakdown.strong.join(", ") || "None yet" });
    findings.push({ severity: "info", title: "Transferable", detail: breakdown.transferable.join(", ") || "None" });
    findings.push({ severity: "warn", title: "Weak / unclear", detail: breakdown.weak.join(", ") || "None" });
    findings.push({ severity: "block", title: "No evidence / gaps", detail: [...breakdown.noEvidence, ...breakdown.gaps].join(", ") || "None" });

    for (const gap of breakdown.gaps) {
      chain.push({
        original: gap,
        rewritten: `Do not insert "${gap}" unless you can describe a real project using it.`,
        color: "red",
        source: "Layer 4 · JD match",
        reason: "Keyword stuffing is blocked. Gaps become confirmation questions, not fake bullets.",
        confirmationQuestion: `Have you used ${gap} in a real project, course, or internship? If yes, describe what you built.`
      });
    }
    for (const strong of breakdown.strong.slice(0, 4)) {
      chain.push({
        original: strong,
        rewritten: `Keep ${strong} high in Skills and the first project/work bullets — evidence already exists.`,
        color: "green",
        source: "Layer 4 · JD match",
        reason: "Requirement is backed by resume text."
      });
    }
  }

  return {
    id: "match",
    title: "Layer 4 · Role match & honest keywords",
    summary: "Amplify evidenced skills, demote unrelated content, and never inject missing JD keywords.",
    findings,
    chain
  };
}

export function matchBreakdown(candidate: CandidateProfile, jd?: JobDescription) {
  const strong: string[] = [];
  const transferable: string[] = [];
  const weak: string[] = [];
  const noEvidence: string[] = [];
  const gaps: string[] = [];
  if (!jd) return { strong, transferable, weak, noEvidence, gaps };
  const evidence = extractEvidence(candidate, jd);
  for (const ev of evidence) {
    if (ev.strength === "STRONG") strong.push(ev.requirementName);
    else if (ev.strength === "PARTIAL") transferable.push(ev.requirementName);
    else if (ev.strength === "UNCLEAR") weak.push(ev.requirementName);
    else if (ev.strength === "NEGATIVE") noEvidence.push(ev.requirementName);
    else gaps.push(ev.requirementName);
  }
  return { strong, transferable, weak, noEvidence, gaps };
}

function collectBullets(candidate: CandidateProfile): string[] {
  const chunks = [
    candidate.parsedSections.WORK_EXPERIENCE,
    candidate.parsedSections.PROJECTS,
    candidate.parsedSections.SUMMARY
  ].filter(Boolean) as string[];
  const bullets: string[] = [];
  for (const chunk of chunks) {
    for (const line of chunk.split("\n")) {
      const t = line.replace(/^[-•*]\s*/, "").trim();
      if (t.length >= 24) bullets.push(t);
    }
  }
  return bullets.slice(0, 12);
}

function recruiterShape(text: string): string {
  let out = text.replace(/^[-•*]\s*/, "");
  if (/^responsible for/i.test(out)) {
    out = out.replace(/^responsible for\s+/i, "Delivered ");
  }
  if (/^helped\b/i.test(out)) {
    out = out.replace(/^helped\s+(with\s+)?/i, "Supported ");
  }
  return out;
}

function splitLongSentence(s: string): string {
  const parts = s.split(/,\s+(?:and\s+)?| and /);
  if (parts.length >= 2) return `${parts[0].trim()}. ${parts.slice(1).join(" ").trim()}`;
  return s;
}

function buildOptimizedResume(
  candidate: CandidateProfile,
  rewriteChain: EvidenceChainItem[],
  matchChain: EvidenceChainItem[]
): string {
  const allowed = rewriteChain.filter((c) => c.color !== "red");
  const header = [
    candidate.name,
    candidate.email,
    candidate.phone,
    candidate.githubUrl,
    candidate.linkedinUrl
  ]
    .filter(Boolean)
    .join(" | ");

  const skills = candidate.extractedSkills.join(", ");
  const rewriteBlock = allowed
    .filter((c) => c.rewritten.length > 12)
    .map((c) => `- [${c.color.toUpperCase()}] ${c.rewritten}`)
    .join("\n");
  const matchNotes = matchChain
    .filter((c) => c.color === "green")
    .map((c) => `- ${c.rewritten}`)
    .join("\n");

  return [
    header,
    "",
    "SUMMARY",
    candidate.parsedSections.SUMMARY || "Summary based on verified experience pending confirmation.",
    "",
    "SKILLS",
    skills || "Skills extracted from source resume.",
    "",
    "BULLETS BASED ON VERIFIED EXPERIENCE (green = source-backed, yellow = confirm before send)",
    rewriteBlock || "- No rewrite candidates extracted.",
    "",
    "TARGET ROLE EMPHASIS",
    matchNotes || "- Add a job description to reorder emphasis.",
    "",
    "EDUCATION",
    candidate.parsedSections.EDUCATION || "",
    "",
    "Note: Red items were blocked and never written into this draft."
  ].join("\n");
}
