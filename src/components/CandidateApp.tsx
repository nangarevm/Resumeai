"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  ApplicationKit,
  ApplicationRecord,
  CareerChangePlan,
  FitReport,
  SeekerWorkspace,
  TailorSuggestion,
  VerificationFinding
} from "@/lib/srs-models";
import type { JobDescription } from "@/lib/models";
import { vaultCompleteness } from "@/lib/engines/career-vault";
import { applyAcceptedSuggestions } from "@/lib/engines/tailoring";
import CopyButton from "@/components/CopyButton";

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
  const [notice, setNotice] = useState("New here? Finish steps 1–3 to get a Fit Score in a few minutes.");
  const [override, setOverride] = useState(false);
  const [answerDraft, setAnswerDraft] = useState("");
  const [linkedinPaste, setLinkedinPaste] = useState("");
  const [linkedinWarnings, setLinkedinWarnings] = useState<string[]>([]);

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
    setFit(data.seeker.fit);
    setJob(data.seeker.activeJob);
    setSuggestions(data.seeker.suggestions || []);
    setFindings(data.seeker.findings || []);
    setApps(data.seeker.applications || []);
    setDraft(data.seeker.tailoredDraft || "");
  }

  useEffect(() => {
    refresh();
  }, []);

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
    setTargetRole(demo.targetRole);
    setGoals(demo.goals);
    setNotice("Sample intern resume + AI/ML JD loaded. Save the vault, then analyze the job — 3 minutes to a Fit Score.");
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
    setNotice("Job analyzed. Scroll the Fit Score — every number has a reason.");
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

  async function saveApp() {
    const row = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    }).then((r) => r.json());
    setApps((prev) => [row, ...prev]);
    setNotice("Application saved as 'Saved'. Update status when you actually apply.");
    setStep("tracker");
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

  const current = STEPS.find((s) => s.id === step)!;
  const vaultHealth = ws ? vaultCompleteness(ws.vault) : null;

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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

        {notice && <div className="banner">{notice}</div>}

        {step === "vault" && (
          <section className="card">
            <h3>1. Import your resume</h3>
            <p className="muted">Paste text or upload PDF/DOCX. Or load a sample to see the full path in under 5 minutes — the market-standard first-run.</p>
            <button className="chip" onClick={loadDemo} type="button">
              Try with sample intern resume
            </button>
            <input className="form-control" type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <details style={{ marginTop: 16 }}>
              <summary className="form-label" style={{ cursor: "pointer" }}>
                Import from LinkedIn paste (no crawl — TOS-safe)
              </summary>
              <p className="muted" style={{ margin: "8px 0" }}>
                Open your LinkedIn profile, select About + Experience + Education + Skills, copy, and paste here. We only keep what you pasted — never scrape LinkedIn.
              </p>
              <textarea
                className="form-control"
                rows={8}
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
            </details>
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
                <label className="form-label">Resume text</label>
                <textarea className="form-control" rows={10} value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
              </div>
            </div>
            <button className="btn-primary" disabled={busy} onClick={importVault} style={{ marginTop: 12 }}>
              Save Career Vault
            </button>
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
              Paste beats URLs in 2026 — most boards block scrapers. If a URL fails, paste the description. We still split required vs preferred and guess seniority/location.
            </p>
            <button className="chip" type="button" onClick={loadDemo}>
              Load sample AI/ML intern JD
            </button>
            <label className="form-label">Public job URL (optional)</label>
            <input className="form-control" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://..." />
            <label className="form-label" style={{ marginTop: 12 }}>
              Or paste the job description
            </label>
            <textarea className="form-control" rows={10} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder={"POSITION: AI/ML Intern\nMANDATORY REQUIREMENTS:\n- Python\n- Machine Learning"} />
            <button className="btn-primary" disabled={busy} onClick={analyzeJob} style={{ marginTop: 12 }}>
              Analyze job & score fit
            </button>
            {job && (
              <div style={{ marginTop: 16 }}>
                <h3>Parsed job intel</h3>
                <p>
                  {job.title} · {job.companyName} · {job.seniority || "seniority n/a"} · {job.location || "location n/a"}
                </p>
                <p className="muted">Core skills scored ({job.mandatoryRequirements.length} required · {job.preferredRequirements.length} preferred)</p>
                {job.mandatoryRequirements.slice(0, 20).map((r) => (
                  <span className="tag" key={r.name}>
                    {r.name}
                  </span>
                ))}
                {job.mandatoryRequirements.length > 20 && (
                  <p className="muted">+ {job.mandatoryRequirements.length - 20} more skills mined from the JD</p>
                )}
                <p className="muted" style={{ marginTop: 8 }}>
                  Preferred
                </p>
                {job.preferredRequirements.slice(0, 12).map((r) => (
                  <span className="tag pref" key={r.name}>
                    {r.name}
                  </span>
                ))}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <p className="muted" style={{ marginTop: 8 }}>
                    {job.responsibilities.length} responsibility lines stored for context (not counted as 68 separate requirements).
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {step === "fit" && fit && (
          <section className="card">
            <h3>3. ResumeProof Fit Score</h3>
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
              {Object.entries(fit.subScores).map(([k, v]) => (
                <div key={k}>
                  <div className="muted">{k}</div>
                  <div className="progress">
                    <span style={{ width: `${v}%` }} />
                  </div>
                  <strong>{v}</strong>
                </div>
              ))}
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
            {suggestions.map((s, idx) => (
              <article className={`chain-item ${s.blocked ? "red" : "yellow"}`} key={s.id}>
                {s.blocked ? "⛔ Blocked" : `Confidence ${s.confidence}%`} · evidence {s.evidenceIds.join(", ") || "none"}
                <p>{s.proposed}</p>
                <p className="muted">{s.reason}</p>
                {!s.blocked && (
                  <div>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={s.proposed}
                      onChange={(e) =>
                        setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, proposed: e.target.value, status: "edited" } : x)))
                      }
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="chip" onClick={() => setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, status: "accepted" } : x)))}>
                        Accept
                      </button>
                      <button className="chip" onClick={() => setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, status: "rejected" } : x)))}>
                        Reject
                      </button>
                      <span className="badge mid">{s.status}</span>
                    </div>
                  </div>
                )}
              </article>
            ))}
            <h3>Tailored resume preview</h3>
            <p className="muted">Accept suggestions above, then edit the full draft. Export or save before verification.</p>
            <textarea className="form-control" rows={12} value={draft || resumePreview} onChange={(e) => setDraft(e.target.value)} />
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
            {findings.length === 0 && <p>No high-risk unsupported claims found in this draft.</p>}
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
            <textarea className="form-control" rows={14} value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="chip" type="button" disabled={busy} onClick={() => rescanDraft(draft)}>
                Re-scan draft
              </button>
              <button className="chip" type="button" onClick={() => saveResumeDraft(draft)}>
                Save draft
              </button>
              <button className="chip" type="button" onClick={() => downloadResumeFile(draft, "txt")}>
                Export .txt
              </button>
              <button className="chip" type="button" onClick={() => downloadResumeFile(draft, "md")}>
                Export .md
              </button>
              <CopyButton text={draft} label="Copy resume" />
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
            {!kit && <p className="muted">Run verification, then build the kit.</p>}
            {kit && (
              <>
                <p className="muted">Copy beats download in India/WhatsApp-first hiring. Every block is evidence-bound.</p>
                <button className="btn-primary" onClick={downloadKit}>
                  Download Markdown
                </button>
                <button className="btn-ghost" onClick={() => window.print()} style={{ marginLeft: 8 }}>
                  Print to PDF
                </button>
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
                <h3>Checklist</h3>
                {kit.checklist.map((c) => (
                  <p key={c}>☐ {c}</p>
                ))}
                <h3>
                  Tailored resume <CopyButton text={kit.tailoredResume} label="Copy resume" />
                </h3>
                <pre className="pre">{kit.tailoredResume}</pre>
                <button className="btn-primary" onClick={saveApp}>
                  Save to application tracker
                </button>
              </>
            )}
          </section>
        )}

        {step === "tracker" && (
          <section className="card">
            <h3>7. Application tracker</h3>
            <p className="muted">Market pattern: pipeline + follow-up, not a spreadsheet. 3 days after Applied is the usual nudge. Ghosted roles belong in Rejected — do not keep polishing a dead JD.</p>
            <button className="btn-primary" onClick={saveApp}>
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
