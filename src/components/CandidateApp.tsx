"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ApplicationKit,
  ApplicationRecord,
  CareerChangePlan,
  FitReport,
  OutcomeStats,
  SavedJob,
  SeekerWorkspace,
  TailorSuggestion,
  VerificationFinding
} from "@/lib/srs-models";
import type { JobDescription } from "@/lib/models";
import { vaultCompleteness } from "@/lib/engines/career-vault";
import { bandFromScore } from "@/lib/engines/outcome-tracker";
import { applyAcceptedSuggestions, applySummaryToResume } from "@/lib/engines/tailoring";
import { buildWhatsAppBundle } from "@/lib/export/whatsapp-bundle";
import CopyButton from "@/components/CopyButton";
import OptimizerReportPanel from "@/components/OptimizerReportPanel";
import AuthBar from "@/components/AuthBar";
import ResumeDraftPreview from "@/components/ResumeDraftPreview";

// Plain-language labels for fit.subScores — the raw object keys (keywordCoverage,
// evidenceStrength, ...) are meaningful to the code but not to a first-time user.
const SUBSCORE_INFO: Record<string, { label: string; hint: string }> = {
  keywordCoverage: { label: "Skill match", hint: "How many of the job's must-have skills you can prove you have." },
  evidenceStrength: { label: "Proof quality", hint: "How solid that proof is — a real project or task beats a bare skills list." },
  atsReadiness: { label: "Resume readability", hint: "Whether hiring software can parse your contact info, headings, and layout." },
  completeness: { label: "Vault completeness", hint: "How much of your Career Vault is filled in and approved for use." }
};

const STEPS = [
  { id: "vault", n: 1, title: "Career Vault", help: "Your source of truth. Import a resume. We only store what you provided." },
  { id: "job", n: 2, title: "Target job", help: "Paste a JD or a public job URL. We extract required vs preferred skills." },
  { id: "fit", n: 3, title: "Fit Score", help: "A ResumeProof estimate with sub-scores — not a universal ATS number." },
  { id: "tailor", n: 4, title: "Tailor", help: "Accept, edit, or reject each suggestion. Red items are blocked." },
  { id: "verify", n: 5, title: "Verify", help: "High-risk claims must be removed, confirmed, or edited before export." },
  { id: "kit", n: 6, title: "Application kit", help: "Resume draft, cover letter, recruiter email, LinkedIn note, checklist." },
  { id: "tracker", n: 7, title: "Tracker", help: "Saved → Applied → Interview → Offer. Link the resume version you sent." },
  { id: "interview", n: 8, title: "Interview", help: "Job-specific questions and STAR stories from your vault." },
  { id: "change", n: 9, title: "Career change", help: "Map transferable skills. Never fake the missing ones." }
] as const;

type StepId = (typeof STEPS)[number]["id"];
type ImportMode = "paste" | "file" | "linkedin" | "sample";

function jobInputKey(jobUrl: string, jdText: string) {
  return `${jobUrl.trim()}\n---\n${jdText.trim()}`;
}

function resumeImportStats(text: string) {
  const trimmed = text.trim();
  const lines = trimmed ? trimmed.split("\n").length : 0;
  const sectionHints = ["SUMMARY", "EXPERIENCE", "WORK", "EDUCATION", "SKILLS", "PROJECTS", "CERTIFICATION"];
  const sections = sectionHints.filter((s) => new RegExp(`\\b${s}\\b`, "i").test(trimmed));
  return {
    chars: trimmed.length,
    lines,
    sections,
    hasEmail: /[\w.-]+@[\w.-]+\.\w+/.test(trimmed),
    hasPhone: /(?:\+?\d[\d\s().-]{8,}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4})/.test(trimmed),
    hasName: /^[A-Z][A-Za-z.'\s-]{2,40}$/m.test(trimmed.split("\n")[0]?.trim() || "")
  };
}

export default function CandidateApp() {
  const [step, setStep] = useState<StepId>("vault");
  const [ws, setWs] = useState<SeekerWorkspace | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [goals, setGoals] = useState("");
  const [jdText, setJdText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [fit, setFit] = useState<FitReport | null>(null);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [suggestions, setSuggestions] = useState<TailorSuggestion[]>([]);
  const [findings, setFindings] = useState<VerificationFinding[]>([]);
  const [draft, setDraft] = useState("");
  const [kit, setKit] = useState<ApplicationKit | null>(null);
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [prep, setPrep] = useState<{
    questions: Array<{ category: string; question: string }>;
    stories: Array<{ evidenceId: string; situation: string; task: string; action: string; result: string }>;
    missingPrep: string[];
    thankYouNote?: string;
  } | null>(null);
  const [change, setChange] = useState<CareerChangePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [override, setOverride] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const [linkedinPaste, setLinkedinPaste] = useState("");
  const [linkedinWarnings, setLinkedinWarnings] = useState<string[]>([]);
  const [rewrites, setRewrites] = useState<Array<{ id: string; original: string; rewritten: string; reason: string }>>([]);
  const [outcomes, setOutcomes] = useState<OutcomeStats | null>(null);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [referredBy, setReferredBy] = useState("");
  const [referralUrl, setReferralUrl] = useState("");
  const [jobFetchSource, setJobFetchSource] = useState("");
  const [analyzedInputKey, setAnalyzedInputKey] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("paste");
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);

  const currentJobInputKey = useMemo(() => jobInputKey(jobUrl, jdText), [jobUrl, jdText]);
  const jobIntelStale = Boolean(job && analyzedInputKey && analyzedInputKey !== currentJobInputKey);
  const resumeStats = useMemo(() => resumeImportStats(resumeText), [resumeText]);
  const vaultReadyToSave = resumeStats.chars >= 80;

  const resumePreview = useMemo(() => {
    if (!ws?.profile.rawResumeText) return "";
    return applyAcceptedSuggestions(ws.profile.rawResumeText, suggestions);
  }, [ws?.profile.rawResumeText, suggestions]);

  const progress = useMemo(() => {
    const flags = [ws?.vault.evidence.length, job, fit, suggestions.some((s) => s.status !== "pending"), findings.length, kit, apps.length, prep, change];
    return Math.round((flags.filter(Boolean).length / flags.length) * 100);
  }, [ws, job, fit, suggestions, findings, kit, apps, prep, change]);

  async function refresh() {
    const data = await fetch("/api/workspace").then((r) => r.json());
    setWs(data.seeker);
    setResumeText(data.seeker.profile.rawResumeText);
    setTargetRole(data.seeker.vault.targetRole || "");
    setGoals(data.seeker.vault.goals || "");
    setFit(data.seeker.fit);
    setJob(data.seeker.activeJob);
    setSuggestions(data.seeker.suggestions || []);
    setFindings(data.seeker.findings || []);
    setApps(data.seeker.applications || []);
    setDraft(data.seeker.tailoredDraft || "");
    setSavedJobs(data.seeker.savedJobs || []);
    if (data.seeker.lastJobInput) {
      setJobUrl(data.seeker.lastJobInput.jobUrl || "");
      setJdText(data.seeker.lastJobInput.jdText || "");
      setAnalyzedInputKey(jobInputKey(data.seeker.lastJobInput.jobUrl || "", data.seeker.lastJobInput.jdText || ""));
    } else if (data.seeker.activeJob?.rawText) {
      const raw = data.seeker.activeJob.rawText.replace(/^https?:\/\/[^\s\n]+\n?/, "").trim();
      setJdText(raw);
      setAnalyzedInputKey(jobInputKey("", raw));
    }
  }

  useEffect(() => {
    refresh();
    try {
      setOnboardingDismissed(localStorage.getItem("resumeproof-onboarding-dismissed") === "1");
    } catch {
      setOnboardingDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (step === "verify" && notice.includes("Pre-tailoring")) {
      setNotice("");
    }
  }, [step]);

  useEffect(() => {
    if (step === "tailor" && !draft.trim() && (ws?.profile.rawResumeText || resumeText)) {
      setDraft(applyAcceptedSuggestions(ws?.profile.rawResumeText || resumeText, suggestions));
    }
  }, [step, ws?.profile.rawResumeText, resumeText, suggestions]);

  const done = useMemo(
    () => ({
      vault: Boolean(ws?.vault.evidence.length),
      job: Boolean(job),
      fit: Boolean(fit),
      tailor: suggestions.some((s) => s.status !== "pending"),
      verify: findings.length > 0,
      kit: Boolean(kit),
      tracker: apps.length > 0,
      interview: Boolean(prep),
      change: Boolean(change)
    }),
    [ws, job, fit, suggestions, findings, kit, apps, prep, change]
  );

  async function importVault() {
    setBusy(true);
    await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, targetRole, goals })
    });
    await refresh();
    setBusy(false);
    setNotice("Career Vault saved. Nothing was invented — only parsed from your text.");
    setStep("job");
  }

  async function loadDemo() {
    const demo = await fetch("/api/demo").then((r) => r.json());
    setResumeText(demo.resume);
    setJdText(demo.jd);
    setJobUrl("");
    setTargetRole(demo.targetRole);
    setGoals(demo.goals);
    setImportMode("sample");
    setNotice("Sample intern resume + AI/ML JD loaded. Save the vault, then analyze the job — about 3 minutes to a Fit Score.");
  }

  async function loadSampleJd() {
    const demo = await fetch("/api/demo").then((r) => r.json());
    setJdText(demo.jd);
    setJobUrl("");
    setNotice("Sample AI/ML intern JD loaded. Click Analyze job & score fit to parse it.");
  }

  function onJdTextChange(value: string) {
    setJdText(value);
  }

  function onJobUrlChange(value: string) {
    setJobUrl(value);
  }

  function dismissOnboarding() {
    setOnboardingDismissed(true);
    try {
      localStorage.setItem("resumeproof-onboarding-dismissed", "1");
    } catch {
      /* ignore */
    }
  }

  async function setEvidence(id: string, verificationStatus: "approved" | "archived" | "unconfirmed") {
    const data = await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId: id, verificationStatus })
    }).then((r) => r.json());
    if (data.vault && ws) setWs({ ...ws, vault: data.vault });
  }

  async function exportMyData() {
    const data = await fetch("/api/privacy").then((r) => r.json());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-export.json";
    a.click();
  }

  async function deleteMyData() {
    await fetch("/api/privacy", { method: "DELETE" });
    setKit(null);
    setChange(null);
    setPrep(null);
    await refresh();
    setNotice("Workspace reset. Your previous vault was deleted on this device.");
  }

  async function importLinkedIn() {
    setBusy(true);
    const res = await fetch("/api/linkedin-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paste: linkedinPaste, merge: Boolean(resumeText.trim()) })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error || "Could not parse LinkedIn paste.");
      return;
    }
    setResumeText(data.resumeText);
    setLinkedinWarnings(data.warnings || []);
    setNotice(data.notice || "LinkedIn paste converted. Review, then Save Career Vault.");
  }

  function downloadResumeFile(text: string, ext: "txt" | "md") {
    const role = job?.title || ws?.vault.targetRole || "resume";
    const blob = new Blob([text], { type: ext === "md" ? "text/markdown" : "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumeproof-${role.replace(/\s+/g, "-").toLowerCase()}.${ext}`;
    a.click();
  }

  async function saveResumeDraft(text: string) {
    const data = await fetch("/api/resume-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: text, suggestions, action: "save" })
    }).then((r) => r.json());
    setDraft(data.draft || text);
    setNotice("Tailored resume draft saved as a version snapshot.");
  }

  async function rescanDraft(text: string) {
    setBusy(true);
    const data = await fetch("/api/resume-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: text, suggestions, action: "rescan" })
    }).then((r) => r.json());
    setBusy(false);
    setDraft(data.draft || text);
    setFindings(data.findings || []);
    setNotice(data.findings?.length ? "Re-scanned your edited draft." : "Draft looks clean against the vault.");
  }

  async function onUpload(file: File) {
    const form = new FormData();
    form.append("file", file);
    const data = await fetch("/api/parse", { method: "POST", body: form }).then((r) => r.json());
    if (data.text) {
      setResumeText(data.text);
      setNotice("File parsed. Review the text, then save the vault.");
    } else setNotice(data.error || "Could not read that file.");
  }

  async function analyzeJob() {
    setBusy(true);
    const res = await fetch("/api/job-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdText, jobUrl })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error || "Could not analyze job.");
      return;
    }
    setJob(data.job);
    setFit(data.fit);
    setJobFetchSource(data.fetchSource || "");
    setAnalyzedInputKey(jobInputKey(jobUrl, jdText));
    void fetch("/api/job-library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.job.title,
        companyName: data.job.companyName,
        jdText,
        jobUrl: jobUrl,
        fitScore: data.fit.score
      })
    }).then((r) => r.json()).then((saved) => setSavedJobs((prev) => [saved, ...prev.filter((j) => j.title !== saved.title || j.companyName !== saved.companyName)].slice(0, 24)));
    setNotice(
      data.fetchSource
        ? `Job loaded via ${data.fetchSource} parser. ${data.fit.jdInsight?.parseNote || ""}`
        : "Job analyzed. Scroll the Fit Score — every number has a reason."
    );
    setStep("fit");
  }

  async function runTailor() {
    setBusy(true);
    const data = await fetch("/api/tailor", { method: "POST" }).then((r) => r.json());
    setBusy(false);
    if (data.error) {
      setNotice(data.error);
      return;
    }
    setSuggestions(data.suggestions);
    const preview = applyAcceptedSuggestions(ws?.profile.rawResumeText || resumeText, data.suggestions);
    setDraft(preview);
    setNotice("Pre-tailoring snapshot saved. Accept only what you can defend in an interview.");
    setStep("tailor");
  }

  async function runVerify() {
    setBusy(true);
    const workingDraft = draft || resumePreview;
    const data = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions, draft: workingDraft })
    }).then((r) => r.json());
    setBusy(false);
    setFindings(data.findings || []);
    setDraft(data.draft || workingDraft);
    setNotice(data.findings?.length ? "Resolve high-risk findings before export." : "No high-risk findings.");
    setStep("verify");
  }

  async function downloadCareerReport() {
    const res = await fetch("/api/export-report", { method: "POST" });
    if (!res.ok) {
      setNotice("Analyze a job first to export the career report.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-career-report.md";
    a.click();
    setNotice("Career optimizer report downloaded (.md).");
  }

  async function downloadCareerReportPdf() {
    const res = await fetch("/api/export-report?format=pdf", { method: "POST" });
    if (!res.ok) {
      setNotice("Analyze a job first to export the career report PDF.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-career-report.pdf";
    a.click();
    setNotice("Career optimizer report downloaded (PDF).");
  }

  async function buildOptimizedCv() {
    setBusy(true);
    const tailorData = await fetch("/api/tailor", { method: "POST" }).then((r) => r.json());
    if (tailorData.error) {
      setBusy(false);
      setNotice(tailorData.error);
      return;
    }
    setSuggestions(tailorData.suggestions);
    const preview =
      tailorData.tailoredPreview ||
      applyAcceptedSuggestions(ws?.profile.rawResumeText || resumeText, tailorData.suggestions);
    setDraft(preview);
    if (tailorData.summaryApplied) {
      setNotice("Summary auto-applied to draft — review tailor step.");
    }

    const verifyData = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions: tailorData.suggestions, draft: preview })
    }).then((r) => r.json());
    setFindings(verifyData.findings || []);
    const workingDraft = verifyData.draft || preview;
    setDraft(workingDraft);

    const blocking = (verifyData.findings || []).some(
      (f: VerificationFinding) => f.risk === "high" && f.resolution === "open"
    );
    if (blocking) {
      setBusy(false);
      setNotice("Optimized CV paused — resolve high-risk claims on Verify, then build kit.");
      setStep("verify");
      return;
    }

    const kitRes = await fetch("/api/kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: workingDraft })
    });
    const kitData = await kitRes.json();
    setBusy(false);
    if (!kitRes.ok) {
      setNotice(kitData.error || "Could not build application kit.");
      setStep("verify");
      return;
    }
    setKit(kitData);
    setNotice("Optimized CV ready — tailored resume, cover letter, and exports in Application kit.");
    setStep("kit");
  }

  function applySummarySuggestion() {
    const summary = fit?.optimizer?.summarySuggestion;
    if (!summary) return;
    const base = draft || resumePreview || resumeText;
    setDraft(applySummaryToResume(base, summary));
    setNotice("Summary line applied to draft — review and save.");
  }

  async function runKit() {
    setBusy(true);
    const res = await fetch("/api/kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override, draft: draft || resumePreview })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setNotice(data.error);
      return;
    }
    setKit(data);
    setNotice("Application kit ready. Download Markdown or print to PDF.");
    setStep("kit");
  }

  async function saveApp(extra?: { status?: string }) {
    const row = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: extra?.status,
        referredBy: referredBy || undefined,
        referralUrl: referralUrl || undefined
      })
    }).then((r) => r.json());
    setApps((prev) => [row, ...prev]);
    void fetch("/api/outcomes").then((r) => r.json()).then(setOutcomes);
    setNotice("Application saved. Update status when you actually apply.");
    setStep("tracker");
  }

  async function downloadApplyPack() {
    setBusy(true);
    const res = await fetch("/api/apply-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override, draft: draft || resumePreview })
    });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json();
      setNotice(err.error || "Could not build apply pack.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-apply-pack.zip";
    a.click();
    setNotice("Apply pack downloaded — resume DOCX, 3-line cover, LinkedIn note, referral checklist.");
  }

  async function downloadDocx(kind: "resume" | "cover") {
    const text = kind === "resume" ? draft || resumePreview || kit?.tailoredResume : kit?.shortCover || kit?.coverLetter;
    if (!text) return;
    const res = await fetch("/api/export-docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, text })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "resume" ? "tailored-resume.docx" : "cover-letter.docx";
    a.click();
  }

  async function runRewrite() {
    setBusy(true);
    const data = await fetch("/api/rewrite", { method: "POST" }).then((r) => r.json());
    setBusy(false);
    setRewrites(data.rewrites || []);
    setNotice(data.notice || "Evidence-bound rewrites ready — review before accepting.");
  }

  async function runInterview() {
    setBusy(true);
    const data = await fetch("/api/interview-prep", { method: "POST" }).then((r) => r.json());
    setBusy(false);
    if (data.error) {
      setNotice(data.error);
      return;
    }
    setPrep(data);
    setStep("interview");
  }

  async function runChange() {
    setBusy(true);
    const data = await fetch("/api/career-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetRole })
    }).then((r) => r.json());
    setBusy(false);
    setChange(data);
    setStep("change");
  }

  function downloadKit() {
    if (!kit) return;
    const md = [
      "# Application kit",
      "",
      "## Tailored resume",
      kit.tailoredResume,
      "",
      "## Cover letter",
      kit.coverLetter,
      "",
      "## Recruiter email",
      kit.recruiterEmail,
      "",
      "## LinkedIn note",
      kit.linkedinNote,
      "",
      "## WhatsApp note",
      kit.whatsappNote,
      "",
      "## Thank-you note",
      kit.thankYouNote,
      "",
      "## Referral note",
      kit.referralNote
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-application-kit.md";
    a.click();
  }

  function loadSavedJob(entry: SavedJob) {
    setJdText(entry.jdText);
    setJobUrl(entry.jobUrl);
    setNotice(`Loaded saved job: ${entry.title}. Click Analyze to refresh the Fit Score.`);
  }

  async function removeSavedJob(id: string) {
    await fetch(`/api/job-library?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setSavedJobs((prev) => prev.filter((j) => j.id !== id));
    setNotice("Removed from job library.");
  }

  function copyWhatsAppBundle() {
    if (!kit || !job) return;
    const text = buildWhatsAppBundle(kit, job.title, job.companyName, referredBy || undefined);
    void navigator.clipboard.writeText(text);
    setNotice("WhatsApp apply bundle copied — paste into WhatsApp with your resume file.");
  }

  const fitBand = fit ? bandFromScore(fit.score) : "";
  const bandOutcome = fitBand && outcomes?.byBand?.[fitBand];
  const followUpDue = apps.filter((a) => {
    if (a.status !== "Applied") return false;
    const days = Math.round((Date.now() - new Date(a.appliedAt || a.savedAt).getTime()) / 86400000);
    return days >= 3;
  });
  const vaultHealth = ws ? vaultCompleteness(ws.vault) : null;
  const showOnboardingBanner =
    !onboardingDismissed && (step === "vault" || step === "job" || step === "fit") && progress < 55;
  const current = STEPS.find((s) => s.id === step)!;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="logo">👤</div>
          <div>
            <h1>Candidate</h1>
            <span>Job Application Copilot</span>
          </div>
        </Link>
        {STEPS.map((s) => (
          <button key={s.id} className={`nav-btn ${step === s.id ? "active" : ""}`} onClick={() => setStep(s.id)}>
            <span className={`step-dot ${done[s.id] ? "ok" : ""}`}>{s.n}</span> {s.title}
          </button>
        ))}
        <Link href="/agency" className="sidebar-foot" style={{ textDecoration: "none" }}>
          Switch to agency desk →
        </Link>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="label">Step {current.n} of {STEPS.length}</div>
            <h2>{current.title}</h2>
            <p className="muted">{current.help}</p>
            <div className="progress" style={{ marginTop: 10, maxWidth: 280 }}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="muted">Journey {progress}% complete</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <AuthBar />
            <button className="btn-ghost" onClick={loadDemo}>
              Load sample resume
            </button>
            <button className="btn-ghost" onClick={exportMyData}>
              Export my data
            </button>
            <button className="btn-ghost" onClick={() => window.print()}>
              Print / PDF
            </button>
          </div>
        </header>

        {notice && (
          <div className="banner">
            <span style={{ flex: 1 }}>{notice}</span>
            <button type="button" className="banner-dismiss" onClick={() => setNotice("")} aria-label="Dismiss notice">
              ×
            </button>
          </div>
        )}

        {showOnboardingBanner && (
          <div className="banner onboarding">
            <span style={{ flex: 1 }}>New here? Finish steps 1–3 to get a Fit Score in a few minutes.</span>
            <button type="button" className="banner-dismiss" onClick={dismissOnboarding} aria-label="Dismiss onboarding tip">
              ×
            </button>
          </div>
        )}

        {step === "vault" && (
          <section className="card">
            <h3>1. Import your resume</h3>
            <p className="muted">Your vault is the source of truth — we only store what you paste or upload. Nothing is invented.</p>

            <div className="import-tabs" role="tablist" aria-label="Import method">
              {(
                [
                  ["paste", "Paste text"],
                  ["file", "Upload file"],
                  ["linkedin", "LinkedIn paste"],
                  ["sample", "Sample resume"]
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={importMode === mode}
                  className={`import-tab ${importMode === mode ? "active" : ""}`}
                  onClick={() => setImportMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>

            {importMode === "sample" && (
              <div className="import-panel">
                <p className="muted">Load a realistic intern resume to walk the full path — vault → job → Fit Score — in under 5 minutes.</p>
                <button className="chip" onClick={loadDemo} type="button">
                  Try with sample intern resume
                </button>
              </div>
            )}

            {importMode === "file" && (
              <div className="import-panel">
                <p className="muted">PDF, DOCX, TXT, or Markdown. We extract plain text — review before saving.</p>
                <label className="file-upload">
                  <span className="file-upload-btn">Choose file</span>
                  <span className="file-upload-hint">PDF · DOCX · TXT · MD</span>
                  <input type="file" accept=".txt,.md,.pdf,.docx" hidden onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                </label>
              </div>
            )}

            {importMode === "linkedin" && (
              <div className="import-panel">
                <p className="muted">
                  Open your LinkedIn profile, select About + Experience + Education + Skills, copy, and paste here. TOS-safe — we never crawl LinkedIn.
                </p>
                <textarea
                  className="form-control resume-editor"
                  rows={10}
                  value={linkedinPaste}
                  onChange={(e) => setLinkedinPaste(e.target.value)}
                  placeholder={"Your Name\nHeadline\n\nAbout\n...\n\nExperience\nCompany\nRole\n...\n\nSkills\nPython, SQL"}
                />
                <button className="chip" type="button" disabled={busy || !linkedinPaste.trim()} onClick={importLinkedIn} style={{ marginTop: 8 }}>
                  Convert LinkedIn paste → resume text
                </button>
                {linkedinWarnings.map((w) => (
                  <p className="muted" key={w}>
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div>
                <label className="form-label">Target role (optional)</label>
                <input className="form-control" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. AI/ML Intern" />
              </div>
              <div className="span-3">
                <label className="form-label">Career goals</label>
                <input className="form-control" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. First internship in applied ML" />
              </div>
              <div className="span-3">
                <div className="form-label-row">
                  <label className="form-label">Resume text</label>
                  {resumeStats.chars > 0 && (
                    <span className="resume-stats">
                      {resumeStats.lines} lines · {resumeStats.chars.toLocaleString()} chars
                      {resumeStats.sections.length > 0 && ` · ${resumeStats.sections.length} section hints`}
                    </span>
                  )}
                </div>
                <textarea
                  className="form-control resume-editor"
                  rows={16}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder={"NAME: Your Name\nEMAIL: you@example.com\nPHONE: +1 555 0100\n\nSUMMARY\n...\n\nWORK EXPERIENCE\nCompany | Role | Dates\n- Bullet with evidence\n\nSKILLS\nPython, SQL, ..."}
                />
                {resumeStats.chars > 0 && !vaultReadyToSave && (
                  <p className="hint warn">Add more resume content (at least ~80 characters) before saving.</p>
                )}
                {resumeStats.chars > 0 && (
                  <div className="checklist-inline">
                    <span className={resumeStats.hasName ? "ok" : "miss"}>Name</span>
                    <span className={resumeStats.hasEmail ? "ok" : "miss"}>Email</span>
                    <span className={resumeStats.hasPhone ? "ok" : "miss"}>Phone</span>
                    <span className={resumeStats.sections.length >= 2 ? "ok" : "miss"}>Sections</span>
                  </div>
                )}
              </div>
            </div>
            <div className="vault-actions">
              <button className="btn-primary" disabled={busy || !vaultReadyToSave} onClick={importVault}>
                Save Career Vault
              </button>
              {!vaultReadyToSave && <p className="muted">Paste or upload your resume to continue.</p>}
            </div>
            {ws && vaultHealth && (
              <div style={{ marginTop: 16 }}>
                <h3>
                  Vault completeness {vaultHealth.percent}% ({vaultHealth.approvedCount} approved / {vaultHealth.total} items)
                </h3>
                <div className="progress" style={{ maxWidth: 360, margin: "8px 0 12px" }}>
                  <span style={{ width: `${vaultHealth.percent}%` }} />
                </div>
                <p className="muted">
                  Families present: {vaultHealth.present.join(", ") || "none"}. Missing: {vaultHealth.missing.join(", ") || "none"}.
                  Archive outdated items. Generation uses approved evidence only — we never invent replacements.
                </p>
                {ws.vault.evidence.slice(0, 16).map((e) => (
                  <div key={e.id} className="chain-item" style={{ marginBottom: 8 }}>
                    <span className={`badge ${e.verificationStatus === "approved" ? "ok" : "mid"}`}>{e.type}</span> {e.content.slice(0, 140)}
                    <div className="muted">
                      {e.source} · {e.verificationStatus}
                    </div>
                    <button className="chip" onClick={() => setEvidence(e.id, e.verificationStatus === "archived" ? "approved" : "archived")}>
                      {e.verificationStatus === "archived" ? "Restore" : "Archive"}
                    </button>
                  </div>
                ))}
                <button className="btn-ghost" onClick={deleteMyData} style={{ marginTop: 8 }}>
                  Delete my vault
                </button>
              </div>
            )}
          </section>
        )}

        {step === "job" && (
          <section className="card">
            <h3>2. Add the job you want</h3>
            <p className="muted">
              Paste beats URLs in 2026 — most boards block scrapers. If a URL fails, paste the description. We split required vs preferred skills and infer seniority/location.
            </p>
            <div className="chips">
              <button className="chip" type="button" onClick={loadSampleJd}>
                Load sample AI/ML intern JD
              </button>
              {jobIntelStale && (
                <span className="stale-pill">JD changed — re-analyze to refresh</span>
              )}
            </div>
            <label className="form-label">Public job URL (optional)</label>
            <input className="form-control" value={jobUrl} onChange={(e) => onJobUrlChange(e.target.value)} placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..." />
            <label className="form-label" style={{ marginTop: 12 }}>
              Or paste the job description
            </label>
            <textarea
              className="form-control jd-editor"
              rows={14}
              value={jdText}
              onChange={(e) => onJdTextChange(e.target.value)}
              placeholder={"POSITION: AI/ML Intern\nMANDATORY REQUIREMENTS:\n- Python\n- Machine Learning"}
            />
            <p className="muted" style={{ marginTop: 8 }}>
              {jdText.trim() ? `${jdText.trim().split("\n").length} lines · ${jdText.trim().length.toLocaleString()} chars` : "Paste a JD or load the sample to continue."}
            </p>
            <button className="btn-primary" disabled={busy || (!jdText.trim() && !jobUrl.trim())} onClick={analyzeJob} style={{ marginTop: 12 }}>
              Analyze job & score fit
            </button>
            {jobIntelStale && job && (
              <div className="stale-banner" style={{ marginTop: 16 }}>
                <strong>Parsed intel is out of date</strong>
                <p className="muted" style={{ marginTop: 6 }}>
                  You changed the job URL or description since the last analyze. The Fit Score and tags below still reflect{" "}
                  <em>{job.title}</em> — click Analyze to refresh.
                </p>
              </div>
            )}
            {job && !jobIntelStale && (
              <div className="job-intel-panel" style={{ marginTop: 16 }}>
                <h3>Parsed job intel</h3>
                {jobFetchSource && <p className="muted">Fetched via {jobFetchSource} parser</p>}
                <p>
                  <strong>{job.title}</strong> · {job.companyName || "Company n/a"} · {job.seniority || "seniority n/a"} · {job.location || "location n/a"}
                </p>
                <p className="muted">Core skills scored ({job.mandatoryRequirements.length} required · {job.preferredRequirements.length} preferred)</p>
                <div className="tag-row">
                  {job.mandatoryRequirements.slice(0, 20).map((r) => (
                    <span className="tag" key={r.name}>
                      {r.name}
                    </span>
                  ))}
                </div>
                {job.mandatoryRequirements.length > 20 && (
                  <p className="muted">+ {job.mandatoryRequirements.length - 20} more skills mined from the JD</p>
                )}
                {job.preferredRequirements.length > 0 && (
                  <>
                    <p className="muted" style={{ marginTop: 8 }}>
                      Preferred
                    </p>
                    <div className="tag-row">
                      {job.preferredRequirements.slice(0, 12).map((r) => (
                        <span className="tag pref" key={r.name}>
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <p className="muted" style={{ marginTop: 8 }}>
                    {job.responsibilities.length} responsibility lines stored for context (not counted as separate requirements).
                  </p>
                )}
              </div>
            )}
            {savedJobs.length > 0 && (
              <div className="job-library" style={{ marginTop: 16 }}>
                <h3>Saved jobs ({savedJobs.length})</h3>
                <p className="muted">Re-open a past JD without re-pasting. Analyze again after loading if your vault changed.</p>
                {savedJobs.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="chain-item" style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <strong>{entry.title}</strong>
                      <div className="muted">
                        {entry.companyName}
                        {entry.fitScore != null ? ` · last fit ${entry.fitScore}%` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="chip" type="button" onClick={() => loadSavedJob(entry)}>
                        Load
                      </button>
                      <button className="chip" type="button" onClick={() => removeSavedJob(entry.id)}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "fit" && fit && (
          <section className="card">
            {jobIntelStale && (
              <div className="stale-banner" style={{ marginBottom: 16 }}>
                <strong>Fit Score may be stale</strong>
                <p className="muted" style={{ marginTop: 6 }}>
                  The job description changed after this score was calculated. Go back to Target job and click Analyze to refresh.
                </p>
                <button className="chip" type="button" onClick={() => setStep("job")} style={{ marginTop: 8 }}>
                  Back to Target job
                </button>
              </div>
            )}
            <h3>3. ResumeProof Fit Score</h3>
            {outcomes && outcomes.totals.applications >= 2 && bandOutcome && (
              <div className="banner onboarding" style={{ marginBottom: 16 }}>
                <strong>Your history at this fit band ({fitBand})</strong>
                <p className="muted" style={{ marginTop: 6 }}>
                  You logged {bandOutcome.applied + bandOutcome.saved} apps in this band · {bandOutcome.interview} reached interview · overall interview rate{" "}
                  {outcomes.totals.interviewRate}% across {outcomes.totals.applications} applications.
                </p>
              </div>
            )}
            {fit.applyReadiness && (
              <div className={`banner ${fit.applyReadiness.level === "apply_now" ? "" : ""}`}>
                <div>
                  <strong>
                    Apply readiness:{" "}
                    {fit.applyReadiness.level === "apply_now"
                      ? "Ready to tailor & apply"
                      : fit.applyReadiness.level === "tailor_first"
                        ? "Tailor first"
                        : fit.applyReadiness.level === "stretch_role"
                          ? "Possible stretch role"
                          : "Fix basics first"}
                  </strong>
                  <p className="muted" style={{ marginTop: 6 }}>
                    {fit.applyReadiness.headline}
                  </p>
                  <ul className="muted" style={{ margin: "8px 0 0 18px" }}>
                    {fit.applyReadiness.checklist.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <p className="muted" style={{ marginBottom: 12 }}>
              In plain terms: <strong>{fit.score}/100</strong> is how closely your proven skills match this job. The{" "}
              <strong>
                {fit.coreMatches?.length || 0}/{fit.jdInsight?.coreSkillCount || fit.explicitRequirements?.length || "—"}
              </strong>{" "}
              is how many of the job&apos;s must-have skills you can actually back up. The band turns both into one honest sentence
              below.
            </p>
            <div className="metrics">
              <div className="metric">
                <span>FIT ESTIMATE</span>
                <strong>{fit.score}</strong>
              </div>
              <div className="metric">
                <span>CORE SKILLS</span>
                <strong>
                  {fit.coreMatches?.length || 0}/{fit.jdInsight?.coreSkillCount || fit.explicitRequirements?.length || "—"}
                </strong>
              </div>
              <div className="metric">
                <span>BAND</span>
                <strong>{fit.label}</strong>
              </div>
            </div>
            {job && (
              <p className="muted">
                {job.title} · {job.seniority || "seniority n/a"} · {job.location || "location n/a"}
                {fit.jdInsight ? ` · ${fit.jdInsight.parseNote}` : ""}
              </p>
            )}
            <p className="muted">{fit.disclaimer}</p>
            {fit.experienceMatch && (
              <div className="chain-item" style={{ marginBottom: 12 }}>
                <span className={`badge ${fit.experienceMatch.status === "meets" ? "ok" : fit.experienceMatch.status === "under" ? "no" : "mid"}`}>
                  Years: {fit.experienceMatch.status}
                </span>{" "}
                {fit.experienceMatch.summary}
              </div>
            )}
            {fit.optimizer && <OptimizerReportPanel report={fit.optimizer} />}
            <div className="chips" style={{ marginTop: 16 }}>
              <button className="btn-primary" type="button" disabled={busy} onClick={buildOptimizedCv}>
                Build optimized CV (tailor → verify → kit)
              </button>
              <button className="btn-ghost" type="button" onClick={downloadCareerReport}>
                Export career report (.md)
              </button>
              <button className="btn-ghost" type="button" onClick={downloadCareerReportPdf}>
                Export career report (PDF)
              </button>
              {fit.optimizer?.summarySuggestion && (
                <button className="chip" type="button" onClick={applySummarySuggestion}>
                  Apply summary suggestion
                </button>
              )}
            </div>
            <h3>Do this next (not keyword stuffing)</h3>
            {(fit.nextActions || []).map((a) => (
              <p key={a.title}>
                <button className="chip" onClick={() => setStep(a.step as StepId)}>
                  {a.title}
                </button>{" "}
                {a.detail}
              </p>
            ))}
            <h3>What actually moves this score</h3>
            {(fit.scoreMovers || []).map((m) => (
              <p key={m.title}>
                <strong>{m.title}.</strong> {m.detail}
              </p>
            ))}
            <div className="grid-2" style={{ marginTop: 12 }}>
              {Object.entries(fit.subScores).map(([k, v]) => {
                const info = SUBSCORE_INFO[k] || { label: k, hint: "" };
                return (
                  <div key={k}>
                    <div className="muted">{info.label}</div>
                    <div className="progress">
                      <span style={{ width: `${v}%` }} />
                    </div>
                    <strong>{v}</strong>
                    {info.hint && (
                      <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                        {info.hint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ marginTop: 12 }}>{fit.explanation}</p>
            <h3>Core skills you prove</h3>
            {(fit.coreMatches || fit.matches || []).slice(0, 16).map((m) => (
              <span className="tag" key={m}>
                {m}
              </span>
            ))}
            <h3>Honest gaps (core skills only)</h3>
            {(fit.coreGaps || fit.gaps || []).slice(0, 12).map((m) => (
              <span className="tag pref" key={m}>
                {m}
              </span>
            ))}
            {(fit.coreGaps || fit.gaps || []).length > 12 && (
              <p className="muted">+ {(fit.coreGaps || fit.gaps).length - 12} more — do not keyword-stuff these.</p>
            )}
            {job?.responsibilities && job.responsibilities.length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary className="muted" style={{ cursor: "pointer" }}>
                  {job.responsibilities.length} duty lines parsed (not scored individually)
                </summary>
                <pre className="pre">{job.responsibilities.slice(0, 8).join("\n")}</pre>
              </details>
            )}
            <h3>Parser preview</h3>
            <pre className="pre">{fit.parserPreview}</pre>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
              <button className="btn-primary" onClick={runTailor}>
                {fit.applyReadiness?.level === "apply_now" ? "Tailor resume & apply" : "Create tailoring suggestions"}
              </button>
              {fit.applyReadiness?.level === "fix_basics" && (
                <button className="btn-ghost" type="button" onClick={() => setStep("vault")}>
                  Fix Career Vault
                </button>
              )}
            </div>
          </section>
        )}
        {step === "fit" && !fit && <section className="card">Analyze a job in step 2 first.</section>}

        {step === "tailor" && (
          <section className="card">
            <h3>4. Evidence-based tailoring</h3>
            <p className="muted">A snapshot was saved automatically. Nothing is written into your resume until you accept it.</p>
            {suggestions.length === 0 && <p className="muted">No suggestions yet — run Fit Score → Create tailoring suggestions.</p>}
            {suggestions.map((s, idx) => (
              <article
                className={`chain-item ${s.blocked ? "red" : s.status === "accepted" ? "green" : s.status === "rejected" ? "" : "yellow"}`}
                key={s.id}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <span>
                    {s.blocked ? "⛔ Blocked" : `Confidence ${s.confidence}%`} · evidence {s.evidenceIds.join(", ") || "none"}
                  </span>
                  <span className={`badge ${s.blocked ? "no" : s.status === "accepted" ? "ok" : s.status === "rejected" ? "mid" : "mid"}`}>
                    {s.blocked ? "blocked" : s.status}
                  </span>
                </div>
                {s.blocked ? (
                  <>
                    <p>{s.proposed}</p>
                    <p className="muted">{s.reason}</p>
                    <button
                      className="chip"
                      type="button"
                      onClick={() => setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, status: "rejected" } : x)))}
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <>
                    {s.original && s.original !== s.proposed && (
                      <p className="muted" style={{ marginTop: 8 }}>
                        <strong>Original:</strong> {s.original}
                      </p>
                    )}
                    <p className="muted" style={{ marginTop: 6 }}>{s.reason}</p>
                    <label className="form-label" style={{ marginTop: 8 }}>Suggested line (edit if needed)</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={s.proposed}
                      onChange={(e) =>
                        setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, proposed: e.target.value, status: "edited" } : x)))
                      }
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        className="chip"
                        type="button"
                        onClick={() => {
                          const next = suggestions.map((x, i) => (i === idx ? { ...x, status: "accepted" as const } : x));
                          setSuggestions(next);
                          setDraft(applyAcceptedSuggestions(ws?.profile.rawResumeText || resumeText, next));
                        }}
                      >
                        Accept
                      </button>
                      <button className="chip" type="button" onClick={() => setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, status: "rejected" } : x)))}>
                        Reject
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
            <h3>Tailored resume preview</h3>
            <p className="muted">Accept suggestions above, then edit the full draft. Try evidence-bound rewrites (no LLM, no new facts).</p>
            <button className="chip" type="button" disabled={busy} onClick={runRewrite}>
              Suggest bullet rewrites
            </button>
            {rewrites.map((r) => (
              <article className="chain-item yellow" key={r.id}>
                <p className="muted">Was: {r.original}</p>
                <p>{r.rewritten}</p>
                <p className="muted">{r.reason}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="chip"
                    type="button"
                    onClick={() => {
                      const base = draft || resumePreview;
                      const next = base.includes(r.original) ? base.replace(r.original, r.rewritten) : `${base}\n- ${r.rewritten}`;
                      setDraft(next);
                      setNotice("Rewrite applied to draft — re-scan before export.");
                    }}
                  >
                    Apply to draft
                  </button>
                  <button className="chip" type="button" onClick={() => setDraft((d) => `${d || resumePreview}\n- ${r.rewritten}`)}>
                    Append to draft
                  </button>
                </div>
              </article>
            ))}
            <h3>Edit tailored draft</h3>
            <p className="muted">Accept suggestions above, then edit the full draft. Try evidence-bound rewrites (no LLM, no new facts).</p>
            <ResumeDraftPreview text={draft || resumePreview} />
            <textarea className="form-control resume-draft-editor" rows={12} value={draft || resumePreview} onChange={(e) => setDraft(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="chip" type="button" onClick={() => setDraft(resumePreview)}>
                Reset from accepted suggestions
              </button>
              <button className="chip" type="button" onClick={() => saveResumeDraft(draft || resumePreview)}>
                Save draft
              </button>
              <button className="chip" type="button" onClick={() => downloadResumeFile(draft || resumePreview, "txt")}>
                Export .txt
              </button>
              <button className="chip" type="button" onClick={() => downloadResumeFile(draft || resumePreview, "md")}>
                Export .md
              </button>
              <button className="chip" type="button" onClick={() => downloadDocx("resume")}>
                Export .docx
              </button>
              <CopyButton text={draft || resumePreview} label="Copy resume" />
            </div>
            <button className="btn-primary" onClick={runVerify} style={{ marginTop: 12 }}>
              Scan for unsupported claims
            </button>
          </section>
        )}

        {step === "verify" && (
          <section className="card">
            <h3>5. Resume verification</h3>
            {findings.length === 0 && (
              <p className="muted">
                {draft.trim() ? "No high-risk unsupported claims found in this draft." : "Scan your tailored draft to check for unsupported claims."}
              </p>
            )}
            {findings.map((f, idx) => (
              <article className="chain-item red" key={f.id}>
                <span className="badge no">{f.risk}</span> {f.claim}
                <p className="muted">{f.reason}</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["removed", "confirmed", "edited"] as const).map((r) => (
                    <button key={r} className="chip" onClick={() => setFindings((list) => list.map((x, i) => (i === idx ? { ...x, resolution: r } : x)))}>
                      {r}
                    </button>
                  ))}
                  <span className="badge mid">{f.resolution}</span>
                </div>
              </article>
            ))}
            <h3>Edit export resume</h3>
            <p className="muted">Fix lines here, re-scan, then export or build the application kit.</p>
            <ResumeDraftPreview text={draft || resumePreview} />
            <textarea className="form-control resume-draft-editor" rows={14} value={draft || resumePreview} onChange={(e) => setDraft(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="chip" type="button" disabled={busy} onClick={() => rescanDraft(draft || resumePreview)}>
                Re-scan draft
              </button>
              <button className="chip" type="button" onClick={() => saveResumeDraft(draft || resumePreview)}>
                Save draft
              </button>
              <button className="chip" type="button" onClick={() => downloadResumeFile(draft || resumePreview, "txt")}>
                Export .txt
              </button>
              <button className="chip" type="button" onClick={() => downloadResumeFile(draft || resumePreview, "md")}>
                Export .md
              </button>
              <button className="chip" type="button" onClick={() => downloadDocx("resume")}>
                Export .docx
              </button>
              <CopyButton text={draft || resumePreview} label="Copy resume" />
            </div>
            <label className="muted">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> I explicitly override remaining high-risk items
            </label>
            <div>
              <button className="btn-primary" onClick={runKit} style={{ marginTop: 12 }}>
                Build application kit
              </button>
            </div>
          </section>
        )}

        {step === "kit" && (
          <section className="card">
            <h3>6. Application kit</h3>
            {!kit && (
              <>
                <p className="muted">Build your evidence-bound kit: tailored resume, cover letter, recruiter email, and exports.</p>
                <button className="btn-primary" disabled={busy} onClick={buildOptimizedCv}>
                  Build optimized CV & kit
                </button>
                <button className="btn-ghost" disabled={busy} onClick={runKit} style={{ marginLeft: 8 }}>
                  Build kit only (skip auto-tailor)
                </button>
              </>
            )}
            {kit && (
              <>
                <p className="muted">Copy beats download in India/WhatsApp-first hiring. Every block is evidence-bound.</p>
                <button className="btn-primary" onClick={copyWhatsAppBundle}>
                  Copy WhatsApp apply bundle
                </button>
                <button className="btn-primary" onClick={downloadApplyPack} style={{ marginLeft: 8 }}>
                  Download Apply pack (ZIP)
                </button>
                <button className="btn-ghost" onClick={downloadKit} style={{ marginLeft: 8 }}>
                  Download Markdown
                </button>
                <button className="btn-ghost" onClick={() => downloadDocx("resume")} style={{ marginLeft: 8 }}>
                  Resume DOCX
                </button>
                <button className="btn-ghost" onClick={() => downloadDocx("cover")} style={{ marginLeft: 8 }}>
                  Cover DOCX
                </button>
                <button className="btn-ghost" onClick={() => window.print()} style={{ marginLeft: 8 }}>
                  Print / PDF
                </button>
                <h3>
                  3-line cover <CopyButton text={kit.shortCover} />
                </h3>
                <pre className="pre">{kit.shortCover}</pre>
                <h3>
                  WhatsApp note <CopyButton text={kit.whatsappNote} />
                </h3>
                <pre className="pre">{kit.whatsappNote}</pre>
                <h3>
                  LinkedIn note <CopyButton text={kit.linkedinNote} />
                </h3>
                <pre className="pre">{kit.linkedinNote}</pre>
                <h3>
                  Recruiter email <CopyButton text={kit.recruiterEmail} />
                </h3>
                <pre className="pre">{kit.recruiterEmail}</pre>
                <h3>
                  Cover letter <CopyButton text={kit.coverLetter} />
                </h3>
                <pre className="pre">{kit.coverLetter}</pre>
                <h3>
                  Thank-you note (24h) <CopyButton text={kit.thankYouNote} />
                </h3>
                <pre className="pre">{kit.thankYouNote}</pre>
                <h3>
                  Referral ask <CopyButton text={kit.referralNote} />
                </h3>
                <pre className="pre">{kit.referralNote}</pre>
                <h3>Referrer checklist</h3>
                {kit.referrerChecklist?.map((c) => (
                  <p key={c}>☐ {c}</p>
                ))}
                <div className="form-grid" style={{ marginTop: 12 }}>
                  <div>
                    <label className="form-label">Referred by (optional)</label>
                    <input className="form-control" value={referredBy} onChange={(e) => setReferredBy(e.target.value)} placeholder="Employee name" />
                  </div>
                  <div>
                    <label className="form-label">Referral / job link</label>
                    <input className="form-control" value={referralUrl} onChange={(e) => setReferralUrl(e.target.value)} placeholder="https://..." />
                  </div>
                </div>
                <h3>Checklist</h3>
                {kit.checklist.map((c) => (
                  <p key={c}>☐ {c}</p>
                ))}
                <h3>
                  Tailored resume <CopyButton text={kit.tailoredResume} label="Copy resume" />
                </h3>
                <pre className="pre">{kit.tailoredResume}</pre>
                <button className="btn-primary" onClick={() => saveApp()}>
                  Save to application tracker
                </button>
              </>
            )}
          </section>
        )}

        {step === "tracker" && (
          <section className="card">
            <h3>7. Application tracker</h3>
            <p className="muted">Pipeline + follow-up. Log outcomes so ResumeProof can show interview rate by fit band.</p>
            {followUpDue.length > 0 && (
              <div className="stale-banner" style={{ marginBottom: 16 }}>
                <strong>{followUpDue.length} application{followUpDue.length > 1 ? "s" : ""} need follow-up (3+ days)</strong>
                <p className="muted" style={{ marginTop: 6 }}>
                  {followUpDue.map((a) => a.jobTitle).join(", ")} — use the copy follow-up button on each card.
                </p>
              </div>
            )}
            {outcomes && outcomes.totals.applications > 0 && (
              <div className="metrics">
                <div className="metric">
                  <span>APPS LOGGED</span>
                  <strong>{outcomes.totals.applications}</strong>
                </div>
                <div className="metric">
                  <span>INTERVIEW RATE</span>
                  <strong>{outcomes.totals.interviewRate}%</strong>
                </div>
                <div className="metric">
                  <span>OFFER RATE</span>
                  <strong>{outcomes.totals.offerRate}%</strong>
                </div>
              </div>
            )}
            <button className="btn-primary" onClick={() => saveApp()}>
              Log current job
            </button>
            <div className="kanban">
              {["Saved", "Applied", "Interview", "Offer", "Rejected"].map((col) => (
                <div className="kanban-col" key={col}>
                  <h4>{col}</h4>
                  {apps
                    .filter((a) =>
                      col === "Interview" ? a.status === "Interview" || a.status === "Screening" : col === "Rejected" ? a.status === "Rejected" || a.status === "Withdrawn" : a.status === col
                    )
                    .map((a) => {
                      const start = new Date(a.appliedAt || a.savedAt).getTime();
                      const days = Math.max(0, Math.round((Date.now() - start) / 86400000));
                      const nudge = a.status === "Applied" && days >= 3;
                      const followUp = `Hi, following up on my ${a.jobTitle} application at ${a.company} (${days}d ago). Happy to share a 3-line project summary from my resume.`;
                      return (
                        <article className="chain-item" key={a.id}>
                          <strong>{a.jobTitle}</strong>
                          <div className="muted">{a.company}</div>
                          {a.fitScore != null && (
                            <div className="muted">
                              Fit {a.fitScore} · {a.fitBand || a.fitLabel}
                            </div>
                          )}
                          {a.referredBy && <div className="muted">Referral: {a.referredBy}</div>}
                          <div className="muted">{days}d in stage</div>
                          {nudge && <span className="badge mid followup">Follow up</span>}
                          {nudge && <CopyButton text={followUp} label="Copy follow-up" />}
                          <select
                            className="form-select"
                            value={a.status}
                            onChange={async (e) => {
                              const updated = await fetch("/api/applications", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: a.id, status: e.target.value })
                              }).then((r) => r.json());
                              setApps((list) => list.map((x) => (x.id === a.id ? updated : x)));
                            }}
                          >
                            {["Saved", "Applied", "Screening", "Interview", "Offer", "Rejected", "Withdrawn"].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </article>
                      );
                    })}
                </div>
              ))}
            </div>
            <button className="btn-ghost" style={{ marginTop: 12 }} onClick={runInterview}>
              Open interview prep for this job
            </button>
          </section>
        )}

        {step === "interview" && (
          <section className="card">
            <h3>8. Interview copilot</h3>
            <p className="muted">Practice in the same tool you applied from. Score yourself on structure — we do not invent achievements.</p>
            <button className="btn-primary" onClick={runInterview}>
              Generate questions & STAR stories
            </button>
            {prep?.stories?.map((s, i) => (
              <article className="card" key={i}>
                <strong>STAR from vault {s.evidenceId}</strong>
                <p>{s.situation}</p>
                <p className="muted">T: {s.task}</p>
                <p className="muted">A: {s.action}</p>
                <p className="muted">R: {s.result}</p>
              </article>
            ))}
            {prep?.questions?.map((q, i) => (
              <article className="card" key={i}>
                <p>
                  <strong>{q.category}:</strong> {q.question}
                </p>
                <CopyButton text={q.question} label="Copy question" />
              </article>
            ))}
            {prep && (
              <div className="practice">
                <label className="form-label">Practice answer (stays on this device)</label>
                <textarea className="form-control" rows={4} value={answerDraft} onChange={(e) => setAnswerDraft(e.target.value)} />
                <p className="muted">
                  Self-check: Situation? Task? Action with tools from the vault? Result only if a number already exists in evidence?
                </p>
                {prep.thankYouNote && (
                  <>
                    <h3>
                      Post-interview thank-you <CopyButton text={prep.thankYouNote} />
                    </h3>
                    <pre className="pre">{prep.thankYouNote}</pre>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {step === "change" && (
          <section className="card">
            <h3>9. Career Change Mode</h3>
            <p className="muted">Pick a family, then we map vault proof vs honest gaps — not a fake “career switch resume”.</p>
            <div className="chips">
              {["software engineer", "machine learning engineer", "data analyst", "product manager", "marketing"].map((role) => (
                <button key={role} className="chip" onClick={() => setTargetRole(role)}>
                  {role}
                </button>
              ))}
            </div>
            <input className="form-control" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Target role e.g. product manager" />
            <button className="btn-primary" onClick={runChange} style={{ marginTop: 12 }}>
              Map transferable skills
            </button>
            {change && (
              <>
                <h3>Transferable</h3>
                {change.transferable.map((t) => (
                  <p key={t.skill}>
                    🟢 {t.skill} — {t.fromEvidence}
                  </p>
                ))}
                <h3>Missing (do not invent)</h3>
                {change.missing.map((m) => (
                  <p key={m}>🔴 {m}</p>
                ))}
                <h3>30–60–90 plan</h3>
                {change.plan90?.map((p) => (
                  <p key={p.window}>
                    <strong>{p.window}:</strong> {p.action}
                  </p>
                ))}
                {change.thisMonthLearn?.length ? (
                  <>
                    <h3>Learn this month (then vault it)</h3>
                    {change.thisMonthLearn.map((t) => (
                      <p key={t}>📘 {t}</p>
                    ))}
                  </>
                ) : null}
                <h3>Truthful framing</h3>
                {change.truthfulFraming.map((t) => (
                  <p key={t}>{t}</p>
                ))}
                <h3>Strategy</h3>
                {change.strategy.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
