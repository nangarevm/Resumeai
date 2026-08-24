/**
 * Computes the single highest-value action the user should take next,
 * based on their current progress through the journey. Priority order
 * favors things the user can finish inside the app right now (review a
 * suggestion, resolve a finding) over things that need real-world work
 * (adding new evidence, following up outside the app).
 */

export type NextBestActionStep = "vault" | "job" | "fit" | "tailor" | "verify" | "kit" | "tracker";

export interface NextBestActionInput {
  hasProfile: boolean;
  hasJob: boolean;
  hasFit: boolean;
  topGap: string | null;
  pendingSuggestions: number;
  openFindings: number;
  hasKit: boolean;
  followUp: { company: string; jobTitle: string } | null;
}

export interface NextBestAction {
  icon: string;
  title: string;
  detail: string;
  ctaLabel: string;
  step: NextBestActionStep;
}

export function computeNextBestAction(input: NextBestActionInput): NextBestAction | null {
  if (!input.hasProfile) {
    return {
      icon: "📝",
      title: "Start your Career Vault",
      detail: "Upload or paste your resume to build your verified profile.",
      ctaLabel: "Add my resume",
      step: "vault"
    };
  }

  if (!input.hasJob) {
    return {
      icon: "🎯",
      title: "Add a target job",
      detail: "Paste a job description to calculate your Fit Score.",
      ctaLabel: "Add target job",
      step: "job"
    };
  }

  if (input.pendingSuggestions > 0) {
    return {
      icon: "✨",
      title: `Review ${input.pendingSuggestions} suggested improvement${input.pendingSuggestions > 1 ? "s" : ""}`,
      detail: "Each one is based on your verified experience — accept, edit, or reject.",
      ctaLabel: "Review suggestions",
      step: "tailor"
    };
  }

  if (input.openFindings > 0) {
    return {
      icon: "🛡️",
      title: `Verify ${input.openFindings} claim${input.openFindings > 1 ? "s" : ""} before exporting`,
      detail: "Resolve these so your resume is safe to send.",
      ctaLabel: "Verify now",
      step: "verify"
    };
  }

  if (input.hasFit && !input.hasKit) {
    return {
      icon: "📦",
      title: "Build your Application Kit",
      detail: "Generate your tailored resume, cover letter, and recruiter email.",
      ctaLabel: "Build application kit",
      step: "kit"
    };
  }

  if (input.topGap) {
    return {
      icon: "🎯",
      title: `Add your ${input.topGap} experience`,
      detail: "Adding real evidence for this to your Career Vault closes your biggest gap and improves your Fit Score.",
      ctaLabel: "Update Career Vault",
      step: "vault"
    };
  }

  if (input.followUp) {
    return {
      icon: "🔔",
      title: `Follow up with ${input.followUp.company} today`,
      detail: `Your ${input.followUp.jobTitle} application is due for a check-in.`,
      ctaLabel: "Open tracker",
      step: "tracker"
    };
  }

  return null;
}
