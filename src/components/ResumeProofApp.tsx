"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AtsReport,
  CandidateProfile,
  CoverLetterResult,
  EvaluationModeName,
  EvaluationResult,
  GithubProofResult,
  JobDescription,
  OptimizerResult
} from "@/lib/models";
import { EVALUATION_MODES } from "@/lib/models";

type Tab =
  | "recruiter"
  | "candidates"
  | "discovery"
  | "optimizer"
  | "ats"
  | "cover"
  | "github"
  | "interview";

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "recruiter", label: "Recruiter desk", icon: "💼" },
  { id: "candidates", label: "Candidate pool", icon: "👤" },
  { id: "discovery", label: "Discovery", icon: "🔎" },
  { id: "optimizer", label: "Honest optimizer", icon: "✍️" },
  { id: "ats", label: "ATS score", icon: "📄" },
  { id: "cover", label: "Cover letter", icon: "✉️" },
  { id: "github", label: "GitHub proof", icon: "🐙" },
  { id: "interview", label: "Interview studio", icon: "🎤" }
];

export default function ResumeProofApp() {
  const [tab, setTab] = useState<Tab>("recruiter");
  const [mode, setMode] = useState<EvaluationModeName>("BALANCED");
  const [job, setJob] = useState<JobDescription | null>(null);
  const [sampleJobs, setSampleJobs] = useState<Array<{ id: string; title: string; companyName: string; domain: string }>>([]);
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [selected, setSelected] = useState<EvaluationResult | null>(null);
  const [discovery, setDiscovery] = useState<Array<{ id: string; name: string; email: string; skills: string[]; snippet: string }>>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const [jobForm, setJobForm] = useState({
    title: "",
    companyName: "",
    domain: "",
    mandatoryText: "",
    preferredText: ""
  });
  const [candForm, setCandForm] = useState({
    name: "",
    email: "",
    phone: "",
    dreamCompanies: "",
    preferredRoles: "",
    preferredDomains: "",
    rawResumeText: ""
  });
  const [targetCandidateId, setTargetCandidateId] = useState("");
  const [optimizer, setOptimizer] = useState<OptimizerResult | null>(null);
  const [ats, setAts] = useState<AtsReport | null>(null);
  const [cover, setCover] = useState<CoverLetterResult | null>(null);
  const [github, setGithub] = useState<GithubProofResult | null>(null);

  const completeness = useMemo(() => {
    const fields = Object.values(candForm);
    const filled = fields.filter((v) => v.trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [candForm]);

  const loadJobs = useCallback(async () => {
    const [active, samples] = await Promise.all([fetch("/api/jobs").then((r) => r.json()), fetch("/api/sample-jobs").then((r) => r.json())]);
    setJob(active);
    setSampleJobs(samples);
  }, []);

  const loadCandidates = useCallback(async () => {
    const list = await fetch("/api/candidates").then((r) => r.json());
    setCandidates(list);
    if (list[0] && !targetCandidateId) setTargetCandidateId(list[0].id);
  }, [targetCandidateId]);

  const runAnalysis = useCallback(
    async (nextMode = mode) => {
      setBusy(true);
      try {
        const data = await fetch(`/api/analyze?mode=${nextMode}`).then((r) => r.json());
        setResults(data);
      } finally {
        setBusy(false);
      }
    },
    [mode]
  );

  useEffect(() => {
    loadJobs();
    loadCandidates();
    runAnalysis("BALANCED");
    fetch("/api/search?q=").then((r) => r.json()).then(setDiscovery);
  }, []);

  async function submitJob(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jobForm) });
    await loadJobs();
    await runAnalysis(mode);
    setBusy(false);
    setNotice("Job requirements updated. Pool re-ranked.");
  }

  async function switchTemplate(id: string) {
    await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: id }) });
    await loadJobs();
    await runAnalysis(mode);
  }

  async function submitCandidate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(candForm) });
    setCandForm({ name: "", email: "", phone: "", dreamCompanies: "", preferredRoles: "", preferredDomains: "", rawResumeText: "" });
    await loadCandidates();
    await runAnalysis(mode);
    setBusy(false);
    setNotice("Candidate entered the searchable pool.");
  }

  async function searchPool() {
    const data = await fetch(`/api/search?q=${encodeURIComponent(query)}`).then((r) => r.json());
    setDiscovery(data);
  }

  async function runModule(kind: "optimize" | "ats" | "cover" | "github") {
    setBusy(true);
    setNotice("");
    const payload = { candidateId: targetCandidateId };
    const path = kind === "optimize" ? "/api/optimize" : kind === "ats" ? "/api/ats" : kind === "cover" ? "/api/cover-letter" : "/api/github-proof";
    const data = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => r.json());
    if (kind === "optimize") setOptimizer(data);
    if (kind === "ats") setAts(data);
    if (kind === "cover") setCover(data);
    if (kind === "github") setGithub(data);
    setBusy(false);
  }

  async function onUpload(file: File) {
    const form = new FormData();
    form.append("file", file);
    const data = await fetch("/api/parse", { method: "POST", body: form }).then((r) => r.json());
    if (data.text) {
      setCandForm((f) => ({ ...f, rawResumeText: data.text, name: f.name || data.profile?.name || "", email: f.email || data.profile?.email || "" }));
      setNotice("Resume parsed. Review fields, then submit into the pool or run optimizer.");
    } else {
      setNotice(data.error || "Could not parse file.");
    }
  }

  const selectedCandidate = candidates.find((c) => c.id === targetCandidateId);
  const interviewPack = results.find((r) => r.candidateId === targetCandidateId) || results[0];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">🔍</div>
          <div>
            <h1>ResumeProof</h1>
            <span>Examine the evidence.</span>
          </div>
        </div>
        {TABS.map((t) => (
          <button key={t.id} className={`nav-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
        <div className="sidebar-foot">
          <span className="dot" /> Deterministic engines · no invented experience
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="label">Active hiring position</div>
            <h2>{job?.title || "Loading…"}</h2>
            <div className="muted">
              {job?.companyName} · {job?.domain}
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Evaluation mode
            </div>
            <div className="mode-pills">
              {(["STRICT", "BALANCED", "BEST_MATCH"] as EvaluationModeName[]).map((m) => (
                <button
                  key={m}
                  className={`pill ${mode === m ? "active" : ""}`}
                  onClick={() => {
                    setMode(m);
                    runAnalysis(m);
                  }}
                >
                  {m === "STRICT" ? "🔒 Strict" : m === "BALANCED" ? "⚖️ Balanced" : "🌟 Best match"}
                </button>
              ))}
            </div>
          </div>
        </header>

        {notice && (
          <div className="banner">
            <div>{notice}</div>
          </div>
        )}

        {tab === "recruiter" && (
          <>
            <div className="banner">
              <div>
                <strong>{EVALUATION_MODES[mode].title} active</strong>
                <p className="muted">{EVALUATION_MODES[mode].description}</p>
              </div>
            </div>

            <section className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h3>Job requirement builder</h3>
                <select className="form-select" style={{ maxWidth: 280 }} onChange={(e) => e.target.value && switchTemplate(e.target.value)} value={job?.id || ""}>
                  {sampleJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} · {j.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <form className="form-grid" onSubmit={submitJob} style={{ marginTop: 12 }}>
                <div>
                  <label className="form-label">Position</label>
                  <input className="form-control" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Company</label>
                  <input className="form-control" value={jobForm.companyName} onChange={(e) => setJobForm({ ...jobForm, companyName: e.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Domain</label>
                  <input className="form-control" value={jobForm.domain} onChange={(e) => setJobForm({ ...jobForm, domain: e.target.value })} required />
                </div>
                <div className="span-3">
                  <label className="form-label">Mandatory requirements</label>
                  <input className="form-control" value={jobForm.mandatoryText} onChange={(e) => setJobForm({ ...jobForm, mandatoryText: e.target.value })} required />
                </div>
                <div className="span-3">
                  <label className="form-label">Preferred requirements</label>
                  <input className="form-control" value={jobForm.preferredText} onChange={(e) => setJobForm({ ...jobForm, preferredText: e.target.value })} />
                </div>
                <div className="span-3" style={{ textAlign: "right" }}>
                  <button className="btn-primary" disabled={busy} type="submit">
                    Update job & re-rank pool
                  </button>
                </div>
              </form>
            </section>

            <div className="grid-2">
              <div className="card">
                <h3>Mandatory criteria</h3>
                {(job?.mandatoryRequirements || []).map((r) => (
                  <span className="tag" key={r.name}>
                    {r.name}
                  </span>
                ))}
              </div>
              <div className="card">
                <h3>Preferred criteria</h3>
                {(job?.preferredRequirements || []).map((r) => (
                  <span className="tag pref" key={r.name}>
                    {r.name}
                  </span>
                ))}
              </div>
            </div>

            <section className="card">
              <h3>Ranked candidates {busy ? "· scoring…" : ""}</h3>
              <p className="muted">Click a row for evidence snippets, claim checklist, skill gaps, and interview questions.</p>
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Candidate</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Alignment</th>
                      <th>Strong evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={r.candidateId} className="clickable" onClick={() => setSelected(r)}>
                        <td>{i + 1}</td>
                        <td>{r.candidateName}</td>
                        <td>
                          <span className={`badge ${r.isShortlisted ? "ok" : "no"}`}>{r.isShortlisted ? "Shortlisted" : "Rejected"}</span>
                        </td>
                        <td>{Math.round(r.qualificationScore)}%</td>
                        <td>{r.preferenceAlignment}</td>
                        <td>{r.strongAreas.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {tab === "candidates" && (
          <section className="card">
            <h2>Job seeker profile</h2>
            <p className="muted">Upload PDF/DOCX/TXT or paste resume text. Completeness is tracked before entering the pool.</p>
            <div style={{ margin: "16px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Profile completeness</span>
                <strong>{completeness}%</strong>
              </div>
              <div className="progress">
                <span style={{ width: `${completeness}%` }} />
              </div>
            </div>
            <label className="form-label">Upload resume (.txt, .md, .pdf, .docx)</label>
            <input className="form-control" type="file" accept=".txt,.md,.pdf,.docx" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            <form className="form-grid" style={{ marginTop: 16 }} onSubmit={submitCandidate}>
              <div>
                <label className="form-label">Full name</label>
                <input className="form-control" value={candForm.name} onChange={(e) => setCandForm({ ...candForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={candForm.email} onChange={(e) => setCandForm({ ...candForm, email: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Phone</label>
                <input className="form-control" value={candForm.phone} onChange={(e) => setCandForm({ ...candForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Dream companies</label>
                <input className="form-control" value={candForm.dreamCompanies} onChange={(e) => setCandForm({ ...candForm, dreamCompanies: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Preferred roles</label>
                <input className="form-control" value={candForm.preferredRoles} onChange={(e) => setCandForm({ ...candForm, preferredRoles: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Preferred domains</label>
                <input className="form-control" value={candForm.preferredDomains} onChange={(e) => setCandForm({ ...candForm, preferredDomains: e.target.value })} />
              </div>
              <div className="span-3">
                <label className="form-label">Resume text</label>
                <textarea className="form-control" rows={8} value={candForm.rawResumeText} onChange={(e) => setCandForm({ ...candForm, rawResumeText: e.target.value })} required />
              </div>
              <div className="span-3" style={{ textAlign: "right" }}>
                <button className="btn-primary" type="submit">
                  Submit into candidate pool
                </button>
              </div>
            </form>
            <h3 style={{ marginTop: 20 }}>Pool ({candidates.length})</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Skills</th>
                    <th>GitHub</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td>{(c.extractedSkills || []).slice(0, 6).join(", ")}</td>
                      <td>{c.githubUrl || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "discovery" && (
          <>
            <section className="card">
              <h2>Multi-criteria discovery</h2>
              <p className="muted">AND-search across resume text. Use commas or “and”.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input className="form-control" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Python, SQL, Git" />
                <button className="btn-primary" onClick={searchPool}>
                  Search
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                {["Python", "SEO", "Financial Modeling", "SolidWorks", "Solar"].map((q) => (
                  <button
                    key={q}
                    className="chip"
                    onClick={() => {
                      setQuery(q);
                      fetch(`/api/search?q=${encodeURIComponent(q)}`)
                        .then((r) => r.json())
                        .then(setDiscovery);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </section>
            <div className="grid-2">
              {discovery.map((c) => (
                <article className="card" key={c.id}>
                  <h3>{c.name}</h3>
                  <p className="muted">{c.email}</p>
                  <div>{(c.skills || []).slice(0, 8).map((s) => <span className="tag" key={s}>{s}</span>)}</div>
                  <p className="muted" style={{ marginTop: 8 }}>{c.snippet}</p>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "optimizer" && (
          <section className="card">
            <h2>Four-layer honest optimizer</h2>
            <p className="muted">Repair → career logic → recruiter rewrite → JD match. Green writes, yellow asks, red is blocked.</p>
            <CandidatePicker candidates={candidates} value={targetCandidateId} onChange={setTargetCandidateId} />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => runModule("optimize")} disabled={busy}>
              Run four-layer analysis
            </button>
            {optimizer && (
              <div style={{ marginTop: 18 }}>
                {optimizer.layers.map((layer) => (
                  <div className="card" key={layer.id}>
                    <h3>{layer.title}</h3>
                    <p className="muted">{layer.summary}</p>
                    <ul>
                      {layer.findings.map((f, i) => (
                        <li key={i} className="muted" style={{ marginTop: 6 }}>
                          <span className={`badge ${f.severity === "block" ? "no" : f.severity === "warn" ? "mid" : "ok"}`}>{f.severity}</span>{" "}
                          <strong>{f.title}</strong> — {f.detail}
                        </li>
                      ))}
                    </ul>
                    <div className="chain" style={{ marginTop: 10 }}>
                      {layer.chain.map((item, i) => (
                        <div className={`chain-item ${item.color}`} key={i}>
                          <strong>{item.color.toUpperCase()}</strong> · {item.source}
                          <div>{item.rewritten}</div>
                          <div className="muted">{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <h3>Confirmation queue</h3>
                {optimizer.confirmationQueue.map((q, i) => (
                  <p key={i}>
                    {q.blocksWrite ? "⛔" : "🟡"} {q.question}
                  </p>
                ))}
                <h3>Evidence-bound draft</h3>
                <pre className="pre">{optimizer.optimizedResume}</pre>
              </div>
            )}
          </section>
        )}

        {tab === "ats" && (
          <section className="card">
            <h2>ATS compatibility</h2>
            <CandidatePicker candidates={candidates} value={targetCandidateId} onChange={setTargetCandidateId} />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => runModule("ats")}>
              Score against active JD
            </button>
            {ats && (
              <div style={{ marginTop: 16 }}>
                <div className="metrics">
                  <div className="metric">
                    <span>ATS SCORE</span>
                    <strong>{ats.score}</strong>
                  </div>
                  <div className="metric">
                    <span>GRADE</span>
                    <strong>{ats.grade}</strong>
                  </div>
                  <div className="metric">
                    <span>KEYWORD HITS</span>
                    <strong>{ats.keywordHits.length}</strong>
                  </div>
                </div>
                {ats.checks.map((c) => (
                  <p key={c.name}>
                    <span className={`badge ${c.passed ? "ok" : "no"}`}>{c.passed ? "pass" : "fix"}</span> {c.name} — {c.detail}
                  </p>
                ))}
                <p className="muted">Missing: {ats.keywordMisses.join(", ") || "none"}</p>
              </div>
            )}
          </section>
        )}

        {tab === "cover" && (
          <section className="card">
            <h2>Evidence-bound cover letter</h2>
            <p className="muted">Only resume-backed requirements are written. Gaps are listed as blocked claims, never invented.</p>
            <CandidatePicker candidates={candidates} value={targetCandidateId} onChange={setTargetCandidateId} />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => runModule("cover")}>
              Draft letter
            </button>
            {cover && (
              <div style={{ marginTop: 16 }}>
                <pre className="pre">{cover.letter}</pre>
                <h3>Used evidence</h3>
                {cover.usedEvidence.map((e, i) => (
                  <p key={i} className="muted">
                    🟢 {e}
                  </p>
                ))}
                <h3>Blocked</h3>
                {cover.blockedClaims.map((e, i) => (
                  <p key={i} className="muted">
                    🔴 {e}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "github" && (
          <section className="card">
            <h2>GitHub proof</h2>
            <p className="muted">Extracts handles from the resume and optionally checks the public GitHub API. Account existence ≠ bullet authorship.</p>
            <CandidatePicker candidates={candidates} value={targetCandidateId} onChange={setTargetCandidateId} />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => runModule("github")}>
              Prove GitHub
            </button>
            {github && (
              <div style={{ marginTop: 16 }}>
                <p>
                  Handle: <strong>{github.username || "none"}</strong> · confidence {github.confidence}%
                </p>
                {github.proofNotes.map((n, i) => (
                  <p key={i} className="muted">
                    {n}
                  </p>
                ))}
                {github.publicSummary && (
                  <div className="metrics">
                    <div className="metric">
                      <span>PUBLIC REPOS</span>
                      <strong>{github.publicSummary.publicRepos}</strong>
                    </div>
                    <div className="metric">
                      <span>FOLLOWERS</span>
                      <strong>{github.publicSummary.followers}</strong>
                    </div>
                  </div>
                )}
                {(github.publicSummary?.topRepos || []).map((r) => (
                  <p key={r.name}>
                    {r.name} · ⭐ {r.stars} · {r.language || "n/a"}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "interview" && (
          <section className="card">
            <h2>Interview studio</h2>
            <p className="muted">Questions are generated from weak evidence, unverified claims, and skill gaps — plus STAR guides.</p>
            <CandidatePicker candidates={candidates} value={targetCandidateId} onChange={setTargetCandidateId} />
            <p className="muted" style={{ marginTop: 8 }}>
              Using ranked result for {interviewPack?.candidateName || selectedCandidate?.name} under {mode}.
            </p>
            {(interviewPack?.interviewQuestions || []).map((q, i) => (
              <article className="card" key={i}>
                <span className="badge mid">P{q.priority}</span> <strong>{q.category}</strong>
                <p style={{ marginTop: 8 }}>{q.question}</p>
                {q.starGuide && <p className="muted">STAR guide: {q.starGuide}</p>}
              </article>
            ))}
          </section>
        )}
      </main>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{selected.candidateName}</h2>
                <p className="muted">
                  {selected.candidateId} · {selected.modeTitle}
                </p>
              </div>
              <button className="close" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <div className="metrics">
              <div className="metric">
                <span>SCORE</span>
                <strong>{Math.round(selected.qualificationScore)}%</strong>
              </div>
              <div className="metric">
                <span>STATUS</span>
                <strong>{selected.isShortlisted ? "Shortlisted" : "Rejected"}</strong>
              </div>
              <div className="metric">
                <span>ALIGNMENT</span>
                <strong>{selected.preferenceAlignment}</strong>
              </div>
            </div>
            <pre className="pre">{selected.explanationText}</pre>
            <h3 style={{ marginTop: 16 }}>Requirement evidence</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Requirement</th>
                    <th>Strength</th>
                    <th>Snippet</th>
                    <th>Section</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.evidenceList.map((ev) => (
                    <tr key={ev.requirementName}>
                      <td>{ev.requirementName}</td>
                      <td>
                        {ev.strength === "STRONG" ? "🟢" : ev.strength === "PARTIAL" ? "🟡" : ev.strength === "UNCLEAR" ? "🟠" : ev.strength === "NEGATIVE" ? "⛔" : "🔴"}{" "}
                        {ev.strength}
                      </td>
                      <td>{ev.snippet}</td>
                      <td>{ev.sourceSection}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div>
                <h3>Strengths</h3>
                {selected.strongAreas.map((s) => (
                  <span className="tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
              <div>
                <h3>Gaps</h3>
                {selected.missingRequirements.map((s) => (
                  <span className="tag pref" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <h3 style={{ marginTop: 16 }}>Claim verification</h3>
            {selected.claims.map((c, i) => (
              <div className="card" key={i}>
                <p>{c.claimText}</p>
                <p className="muted">
                  {c.strength} · {c.verificationScore}/100 · {c.recommendedAction}
                </p>
                <ul>
                  {c.checklist.map((item) => (
                    <li key={item} className="muted">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <h3>Interview questions</h3>
            {selected.interviewQuestions.map((q, i) => (
              <p key={i}>
                <strong>{q.category}:</strong> {q.question}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CandidatePicker({
  candidates,
  value,
  onChange
}: {
  candidates: CandidateProfile[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <label className="form-label">Target candidate</label>
      <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
