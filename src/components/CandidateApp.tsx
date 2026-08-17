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
  } | null>(null);
  const [change, setChange] = useState<CareerChangePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("New here? Finish steps 1–3 to get a Fit Score in a few minutes.");
  const [override, setOverride] = useState(false);

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
    const data = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggestions })
    }).then((r) => r.json());
    setBusy(false);
    setFindings(data.findings || []);
    setDraft(data.draft || "");
    setNotice(data.findings?.length ? "Resolve high-risk findings before export." : "No high-risk findings.");
    setStep("verify");
  }

  async function runKit() {
    setBusy(true);
    const res = await fetch("/api/kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ override })
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
      kit.linkedinNote
    ].join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-application-kit.md";
    a.click();
  }

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
          </div>
          <button className="btn-ghost" onClick={() => window.print()}>
            Print / PDF
          </button>
        </header>

        {notice && <div className="banner">{notice}</div>}

        {step === "vault" && (
          <section className="card">
            <h3>1. Import your resume</h3>
            <p className="muted">Paste text or upload PDF/DOCX. We parse it into Career Vault evidence you can confirm.</p>
            <input className="form-control" type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
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
            {ws && (
              <div style={{ marginTop: 16 }}>
                <h3>Approved evidence ({ws.vault.evidence.length})</h3>
                <p className="muted">Each item is tagged and sourced. Generation uses approved items only.</p>
                {ws.vault.evidence.slice(0, 12).map((e) => (
                  <p key={e.id}>
                    <span className="badge ok">{e.type}</span> {e.content.slice(0, 140)}
                    <span className="muted"> · {e.source}</span>
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {step === "job" && (
          <section className="card">
            <h3>2. Add the job you want</h3>
            <label className="form-label">Public job URL (optional)</label>
            <input className="form-control" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://..." />
            <label className="form-label" style={{ marginTop: 12 }}>
              Or paste the job description
            </label>
            <textarea className="form-control" rows={10} value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder={"POSITION: AI/ML Intern\nMANDATORY REQUIREMENTS:\n- Python\n- Machine Learning"} />
            <button className="btn-primary" disabled={busy} onClick={analyzeJob} style={{ marginTop: 12 }}>
              Analyze job & score fit
            </button>
          </section>
        )}

        {step === "fit" && fit && (
          <section className="card">
            <h3>3. ResumeProof Fit Score</h3>
            <div className="metrics">
              <div className="metric">
                <span>FIT ESTIMATE</span>
                <strong>{fit.score}</strong>
              </div>
              <div className="metric">
                <span>BAND</span>
                <strong>{fit.label}</strong>
              </div>
            </div>
            <p className="muted">{fit.disclaimer}</p>
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
            <h3>Matches</h3>
            {(fit.matches || []).map((m) => (
              <span className="tag" key={m}>
                {m}
              </span>
            ))}
            <h3>Gaps (not in resume)</h3>
            {(fit.gaps || []).map((m) => (
              <span className="tag pref" key={m}>
                {m}
              </span>
            ))}
            <h3>Not possessed (negated)</h3>
            {(fit.notPossessed || []).map((m) => (
              <span className="tag pref" key={m}>
                {m}
              </span>
            ))}
            <h3>Parser preview</h3>
            <pre className="pre">{fit.parserPreview}</pre>
            <button className="btn-primary" onClick={runTailor}>
              Create tailoring suggestions
            </button>
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
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="chip" onClick={() => setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, status: "accepted" } : x)))}>
                      Accept
                    </button>
                    <button className="chip" onClick={() => setSuggestions((list) => list.map((x, i) => (i === idx ? { ...x, status: "rejected" } : x)))}>
                      Reject
                    </button>
                    <span className="badge mid">{s.status}</span>
                  </div>
                )}
              </article>
            ))}
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
            {draft && <pre className="pre">{draft}</pre>}
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
                <button className="btn-primary" onClick={downloadKit}>
                  Download Markdown
                </button>
                <button className="btn-ghost" onClick={() => window.print()} style={{ marginLeft: 8 }}>
                  Print to PDF
                </button>
                <h3>Checklist</h3>
                {kit.checklist.map((c) => (
                  <p key={c}>☐ {c}</p>
                ))}
                <h3>Cover letter</h3>
                <pre className="pre">{kit.coverLetter}</pre>
                <h3>Recruiter email</h3>
                <pre className="pre">{kit.recruiterEmail}</pre>
                <h3>LinkedIn note</h3>
                <pre className="pre">{kit.linkedinNote}</pre>
                <h3>Tailored resume</h3>
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
            <button className="btn-primary" onClick={saveApp}>
              Log current job
            </button>
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td>{a.jobTitle}</td>
                    <td>{a.company}</td>
                    <td>
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
                    </td>
                    <td>{a.resumeVersionId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="btn-ghost" style={{ marginTop: 12 }} onClick={runInterview}>
              Open interview prep for this job
            </button>
          </section>
        )}

        {step === "interview" && (
          <section className="card">
            <h3>8. Interview copilot</h3>
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
              <p key={i}>
                <strong>{q.category}:</strong> {q.question}
              </p>
            ))}
          </section>
        )}

        {step === "change" && (
          <section className="card">
            <h3>9. Career Change Mode</h3>
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
