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
  const whatsappNote = `Hi, I applied for ${jd.title} at ${jd.companyName}. I can walk through ${strong[0]?.requirementName || "a project from my resume"} — happy to share a 3-line summary.`;
  const proofLine = strong[0]
    ? `${strong[0].requirementName}: ${strong[0].snippet.slice(0, 140)}`
    : "a project already on my resume";
  const thankYouNote = [
    `Hi, thank you for the conversation about ${jd.title} at ${jd.companyName}.`,
    `I can recap one proof point from my resume: ${proofLine}.`,
    `Happy to share a STAR walkthrough in the next round.`
  ].join(" ");
  const referralNote = `Hi — if you're open to a referral for ${jd.title} at ${jd.companyName}, here is one line from my resume I can defend: ${proofLine}. I will not claim skills that are not in that document.`;

  return {
    tailoredResume,
    coverLetter: cover.letter,
    recruiterEmail,
    linkedinNote,
    whatsappNote,
    thankYouNote,
    referralNote,
    highlights: strong.map((e) => e.requirementName),
    checklist: [
      "Confirm every yellow suggestion in Career Vault",
      "Resolve high-risk verification findings or explicitly override",
      "Copy WhatsApp / LinkedIn note only after you can defend each line",
      "If referred, send the referral note — never a rewritten seniority claim",
      "After the interview, send the thank-you note within 24 hours",
      "Export PDF/Markdown application kit",
      "Log the application in Tracker and set a 3-day follow-up"
    ]
  };
}
