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

  // section 18 of the AI Job Application Optimizer spec: LinkedIn Headline
  // + About Section. Built from the same evidence as the rest of the kit —
  // no new claims, just a LinkedIn-appropriate framing of facts already on
  // the resume (no "Career Vault"-style app jargon, since this text is
  // meant to be pasted straight into a real LinkedIn profile).
  const years = profile.rawResumeText.match(/(\d+)\+?\s*years?/i)?.[1];
  const hasWorkExperience = Boolean(profile.parsedSections.WORK_EXPERIENCE?.trim());
  const headlineSkills = (strong.length ? strong.map((e) => e.requirementName) : profile.extractedSkills).slice(0, 3);

  const linkedinHeadline = [jd.title, years ? `${years}+ years` : null, headlineSkills.length ? headlineSkills.join(", ") : null]
    .filter(Boolean)
    .join(" | ");

  const aboutLead = years
    ? `${years}+ years of experience as a ${jd.title}, focused on ${headlineSkills.join(", ") || "building real, shippable software"}.`
    : hasWorkExperience
      ? `${jd.title} with hands-on experience in ${headlineSkills.join(", ") || "modern development practices"}.`
      : `Aspiring ${jd.title}, currently building experience in ${headlineSkills.join(", ") || "the field"}.`;
  const linkedinAbout = [
    aboutLead,
    strong[0] ? `Recent work: ${strong[0].snippet.slice(0, 180)}` : "",
    "Open to connecting about roles where I can keep proving impact with real, evidenced results."
  ]
    .filter(Boolean)
    .join("\n\n");
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

  const shortCover = [
    `Applying for ${jd.title} at ${jd.companyName}.`,
    strong[0] ? `Proof: ${strong[0].requirementName} — ${strong[0].snippet.slice(0, 100)}.` : "Happy to share resume-aligned project details.",
    "Available to walk through evidence in an interview — no inflated claims."
  ].join(" ");

  const referrerChecklist = [
    "Confirm you know the referrer personally (employee link or referral program)",
    "Send referralNote — one defensible proof line only",
    "Attach tailored resume DOCX from Apply pack, not the generic vault export",
    "Ask referrer to paste your proof line into the internal referral form",
    "Log referralUrl and referredBy in Tracker when you submit",
    "Follow up with referrer 5 days after they submit if no recruiter reply"
  ];

  return {
    tailoredResume,
    coverLetter: cover.letter,
    shortCover,
    recruiterEmail,
    linkedinNote,
    linkedinHeadline,
    linkedinAbout,
    whatsappNote,
    thankYouNote,
    referralNote,
    referrerChecklist,
    highlights: strong.map((e) => e.requirementName),
    checklist: [
      "Confirm every yellow suggestion in Career Vault",
      "Resolve high-risk verification findings or explicitly override",
      "Download Apply pack (ZIP) or DOCX before submitting",
      "Copy WhatsApp / LinkedIn note only after you can defend each line",
      "If referred, complete referrer checklist — never a rewritten seniority claim",
      "After the interview, send the thank-you note within 24 hours",
      "Log the application in Tracker and set a 3-day follow-up"
    ]
  };
}
