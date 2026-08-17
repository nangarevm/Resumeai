import type { CandidateProfile, JobDescription } from "../models";
import { generateCoverLetter } from "./cover-letter-engine";
import { extractEvidence } from "./evidence-engine";
import type { ApplicationKit, CareerVault, TailorSuggestion } from "../srs-models";
import { applyAcceptedSuggestions } from "./tailoring";

export function buildApplicationKit(
  profile: CandidateProfile,
  jd: JobDescription,
  vault: CareerVault,
  suggestions: TailorSuggestion[],
  tailoredOverride?: string
): ApplicationKit {
  const tailoredResume =
    tailoredOverride || applyAcceptedSuggestions(profile.rawResumeText, suggestions);
  const cover = generateCoverLetter(profile, jd);
  const strong = extractEvidence(profile, jd)
    .filter((e) => e.strength === "STRONG" || e.strength === "PARTIAL")
    .slice(0, 5);

  const recruiterEmail = [
    `Subject: ${profile.name} — ${jd.title} application`,
    "",
    `Hi ${jd.companyName} team,`,
    "",
    `I'm applying for ${jd.title}. Below are facts already on my resume — no extra titles or metrics.`,
    ...strong.map((e) => `- ${e.requirementName}: ${e.snippet}`),
    "",
    `Happy to walk through the work in an interview.`,
    "",
    profile.name,
    profile.email
  ].join("\n");

  const linkedinNote = `Hi — I applied for ${jd.title} at ${jd.companyName}. Happy to share how my ${strong[0]?.requirementName || "recent project"} maps to the role.`;

  return {
    tailoredResume,
    coverLetter: cover.letter,
    recruiterEmail,
    linkedinNote,
    highlights: strong.map((e) => e.requirementName),
    checklist: [
      "Confirm every yellow suggestion in Career Vault",
      "Resolve high-risk verification findings or explicitly override",
      "Export PDF/Markdown application kit",
      "Paste recruiter email only after you can defend each bullet",
      "Log the application in Tracker with this resume version"
    ]
  };
}
