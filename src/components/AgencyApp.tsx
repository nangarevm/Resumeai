"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgencyWorkspace } from "@/lib/srs-models";
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
import CopyButton from "@/components/CopyButton";
import CompactSearch from "@/components/CompactSearch";
import ComparisonTable from "@/components/ComparisonTable";

type Tab = "overview" | "hiring" | "discovery" | "pool" | "clients" | "brand";
type ModalTool = "evidence" | "ats" | "optimizer" | "github" | "cover";

export default function AgencyApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const [agency, setAgency] = useState<AgencyWorkspace | null>(null);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [mode, setMode] = useState<EvaluationModeName>("BALANCED");
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [selected, setSelected] = useState<EvaluationResult | null>(null);
  const [modalTool, setModalTool] = useState<ModalTool>("evidence");
  const [jobForm, setJobForm] = useState({ title: "", companyName: "", domain: "", mandatoryText: "", preferredText: "" });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [discovery, setDiscovery] = useState<Array<{ id: string; name: string; email: string; skills: string[]; snippet: string }>>([]);
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [candForm, setCandForm] = useState({
    name: "",
    email: "",
    phone: "",
    dreamCompanies: "",
    preferredRoles: "",
    preferredDomains: "",
    rawResumeText: ""
  });
  const [bulkStatus, setBulkStatus] = useState("");

  const [ats, setAts] = useState<AtsReport | null>(null);
  const [optimizer, setOptimizer] = useState<OptimizerResult | null>(null);
  const [github, setGithub] = useState<GithubProofResult | null>(null);
  const [cover, setCover] = useState<CoverLetterResult | null>(null);
  const [toolBusy, setToolBusy] = useState(false);

  const loadAgency = useCallback(async () => {
    setAgency(await fetch("/api/agency").then((r) => r.json()));
  }, []);

  const loadCandidates = useCallback(async () => {
    const list = await fetch("/api/candidates").then((r) => r.json());
    setCandidates(list);
  }, []);

  const runAnalysis = useCallback(async (next = mode) => {
    setBusy(true);
    const [jd, ranked] = await Promise.all([
      fetch("/api/jobs").then((r) => r.json()),
      fetch(`/api/analyze?mode=${next}`).then((r) => r.json())
    ]);
    setJob(jd);
    setResults(ranked);
    setBusy(false);
    await loadAgency();
  }, [mode, loadAgency]);

  useEffect(() => {
    loadAgency();
    loadCandidates();
    runAnalysis("BALANCED");
    fetch("/api/search?q=").then((r) => r.json()).then(setDiscovery);
  }, []);

  useEffect(() => {
    if (!selected) {
      setAts(null);
      setOptimizer(null);
      setGithub(null);
      setCover(null);
      setModalTool("evidence");
    }
  }, [selected]);

  async function saveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    // Only the fields this form actually edits — sending the whole `agency`
    // object round-tripped a stale customCandidates/customJobs snapshot from
    // whenever this tab last fetched, silently reverting newer pool changes
    // made since (e.g. a candidate added in another tab) on every save.
    const next = await fetch("/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: agency.name, logoText: agency.logoText, brandColor: agency.brandColor, tier: agency.tier })
    }).then((r) => r.json());
    setAgency(next);
    setNotice("Branding saved.");
  }

  async function submitJob(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jobForm) });
    await runAnalysis(mode);
    setTab("hiring");
  }

  async function submitCandidate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(candForm) });
    setCandForm({ name: "", email: "", phone: "", dreamCompanies: "", preferredRoles: "", preferredDomains: "", rawResumeText: "" });
    await loadCandidates();
    await runAnalysis(mode);
    await loadAgency();
    setBusy(false);
    setNotice("Candidate added to pool and re-ranked.");
  }

  async function addToClientSeats(candidateId: string) {
    setBusy(true);
    const next = await fetch("/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: candidateId })
    }).then((r) => r.json());
    setAgency(next);
    setBusy(false);
    setNotice("Added to client seats.");
  }

  async function onBulkUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setBulkStatus("");
    const resumes: string[] = [];
    for (const file of Array.from(files).slice(0, 20)) {
      const form = new FormData();
      form.append("file", file);
      const data = await fetch("/api/parse", { method: "POST", body: form }).then((r) => r.json());
      if (data.text) resumes.push(data.text);
    }
    if (!resumes.length) {
      setBusy(false);
      setNotice("Could not parse any uploaded files.");
      return;
    }
    const result = await fetch("/api/bulk-candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumes })
    }).then((r) => r.json());
    setBulkStatus(`Added ${result.count} candidates${result.errors?.length ? ` · ${result.errors.length} skipped` : ""}`);
    await loadCandidates();
    await runAnalysis(mode);
    await loadAgency();
    setBusy(false);
    setNotice(`Bulk import complete — ${result.count} resumes in pool.`);
  }

  async function searchPool() {
    const data = await fetch(`/api/search?q=${encodeURIComponent(discoveryQuery)}`).then((r) => r.json());
    setDiscovery(data);
  }

  async function runCandidateTool(kind: ModalTool) {
    if (!selected || kind === "evidence") return;
    setToolBusy(true);
    setModalTool(kind);
    const path =
      kind === "ats" ? "/api/ats" : kind === "optimizer" ? "/api/optimize" : kind === "cover" ? "/api/cover-letter" : "/api/github-proof";
    const data = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: selected.candidateId })
    }).then((r) => r.json());
    if (kind === "ats") setAts(data);
    if (kind === "optimizer") setOptimizer(data);
    if (kind === "cover") setCover(data);
    if (kind === "github") setGithub(data);
    setToolBusy(false);
  }

  async function copyClientBrief(candidateId: string) {
    const data = await fetch(`/api/client-brief?candidateId=${encodeURIComponent(candidateId)}`).then((r) => r.json());
    await navigator.clipboard.writeText(data.brief);
    setNotice(`Client brief for ${data.candidateName} copied — share with coach or referrer (read-only summary).`);
  }

  const shortlisted = results.filter((r) => r.isShortlisted).length;
  const color = agency?.brandColor || "#58a6ff";
  const meters = agency?.usageMeters;
  const visible = results.filter((r) => {
    const q = search.toLowerCase();
    return (
      !q ||
      r.candidateName.toLowerCase().includes(q) ||
      r.strongAreas.join(" ").toLowerCase().includes(q) ||
      r.missingRequirements.join(" ").toLowerCase().includes(q)
    );
  });
  const aRow = results.find((r) => r.candidateId === compareA);
  const bRow = results.find((r) => r.candidateId === compareB);
  const visibleSeats = (agency?.seats || []).filter((s) => {
    const q = search.toLowerCase();
    return !q || s.clientName.toLowerCase().includes(q) || (s.notes || "").toLowerCase().includes(q);
  });

  function copyShortlist() {
    const text = results
      .filter((r) => r.isShortlisted)
      .map(
        (r) =>
          `${r.candidateName} · ${Math.round(r.qualificationScore)}% · ${r.preferenceAlignment} · strong: ${r.strongAreas.slice(0, 4).join(", ") || "n/a"}`
      )
      .join("\n");
    void navigator.clipboard.writeText(text || "No shortlisted candidates in this mode.");
    setNotice("Shortlist copied — snippets stay in the product; this is names and scores only.");
  }

  function exportShortlistCsv() {
    const rows = results.filter((r) => r.isShortlisted);
    const header = "Rank,Name,Score,Status,Alignment,Strong areas,Missing requirements";
    const body = rows
      .map((r, i) =>
        [i + 1, r.candidateName, Math.round(r.qualificationScore), r.isShortlisted ? "Shortlisted" : "Rejected", r.preferenceAlignment, r.strongAreas.join("; "), r.missingRequirements.join("; ")]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resumeproof-shortlist.csv";
    a.click();
    fetch("/api/agency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ incrementUsage: "shortlistsExported" }) }).then(() => loadAgency());
    setNotice("Shortlist CSV downloaded for hiring manager.");
  }

  async function saveSeatNotes(clientId: string) {
    const next = await fetch("/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, notes: notesDraft[clientId] || "" })
    }).then((r) => r.json());
    setAgency(next);
    setNotice("Seat notes saved.");
  }

  const navItems: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "hiring", label: "Hiring desk", icon: "💼" },
    { id: "discovery", label: "Discovery", icon: "🔎" },
    { id: "pool", label: "Candidate pool", icon: "👤" },
    { id: "clients", label: "Client seats", icon: "👥" },
    { id: "brand", label: "White-label", icon: "🎨" }
  ];

  return (
    <div className="app-shell">
      {mobileNavOpen && <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="logo" style={{ background: color }}>
            {agency?.logoText || "RP"}
          </div>
          <div>
            <h1>Agency</h1>
            <span>{agency?.name || "Command center"}</span>
          </div>
        </Link>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-btn ${tab === item.id ? "active" : ""}`}
            onClick={() => {
              setTab(item.id);
              setMobileNavOpen(false);
            }}
          >
            {item.icon} {item.label}
          </button>
        ))}
        <Link href="/candidate" className="sidebar-foot" style={{ textDecoration: "none" }}>
          Switch to candidate workspace →
        </Link>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
              aria-expanded={mobileNavOpen}
            >
              ☰
            </button>
            <div>
              <div className="label">{agency?.tier} desk</div>
              <h2>{agency?.name}</h2>
              <p className="muted">Rank people from evidence snippets. Do not treat scores as a hiring decision.</p>
            </div>
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
                {m.replace("_", " ")}
              </button>
            ))}
          </div>
        </header>

        {notice && (
          <div className="banner">
            <span style={{ flex: 1 }}>{notice}</span>
            <button type="button" className="banner-dismiss" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}

        {tab === "overview" && (
          <>
            <div className="banner">
              Set your brand, pick a job on Hiring desk, then click a candidate for ATS, optimizer, and GitHub proof — not a black-box %.
            </div>
            <div className="metrics">
              <div className="metric">
                <span>CLIENT SEATS</span>
                <strong>{agency?.seats.length || 0}</strong>
              </div>
              <div className="metric">
                <span>SHORTLISTED</span>
                <strong>{shortlisted}</strong>
              </div>
              <div className="metric">
                <span>POOL</span>
                <strong>{results.length}</strong>
              </div>
            </div>
            {meters && (
              <div className="metrics">
                <div className="metric">
                  <span>ANALYZES ({meters.monthKey})</span>
                  <strong>{meters.analyzesRun}</strong>
                </div>
                <div className="metric">
                  <span>CANDIDATES ADDED</span>
                  <strong>{meters.candidatesAdded}</strong>
                </div>
                <div className="metric">
                  <span>SHORTLISTS EXPORTED</span>
                  <strong>{meters.shortlistsExported}</strong>
                </div>
              </div>
            )}
            <section className="card">
              <h3>Active role</h3>
              <p>
                {job?.title} · {job?.companyName}
              </p>
              <p className="muted">{EVALUATION_MODES[mode].description}</p>
              <button className="btn-primary" onClick={() => setTab("hiring")}>
                Open hiring desk
              </button>
              <p className="muted" style={{ marginTop: 8, fontSize: 12.5 }}>
                Click a candidate on Hiring desk to copy a client brief for them specifically.
              </p>
            </section>
          </>
        )}

        {tab === "discovery" && (
          <>
            <section className="card">
              <h3>Multi-criteria discovery</h3>
              <p className="muted">AND-search across the candidate pool. Use commas or “and”.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input className="form-control" value={discoveryQuery} onChange={(e) => setDiscoveryQuery(e.target.value)} placeholder="Python, SQL, Playwright" />
                <button className="btn-primary" onClick={searchPool}>
                  Search
                </button>
              </div>
              <div className="chips">
                {["Python", "Playwright", "Machine Learning", "API testing", "Jenkins"].map((q) => (
                  <button
                    key={q}
                    className="chip"
                    type="button"
                    onClick={() => {
                      setDiscoveryQuery(q);
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
                  <h4>{c.name}</h4>
                  <p className="muted">{c.email}</p>
                  <div className="tag-row">
                    {(c.skills || []).slice(0, 8).map((s) => (
                      <span className="tag" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {c.snippet}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "pool" && (
          <section className="card">
            <h3>Candidate pool</h3>
            <p className="muted">Add one resume or bulk-upload up to 20 PDF/DOCX/TXT files. Each parse enters the ranked pool.</p>
            <label className="file-upload" style={{ marginBottom: 16 }}>
              <span className="file-upload-btn">Bulk upload resumes</span>
              <span className="file-upload-hint">Up to 20 files</span>
              <input type="file" accept=".txt,.md,.pdf,.docx" multiple hidden onChange={(e) => onBulkUpload(e.target.files)} />
            </label>
            {bulkStatus && <p className="muted">{bulkStatus}</p>}
            <form className="form-grid" onSubmit={submitCandidate}>
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
              <div className="span-3">
                <label className="form-label">Resume text</label>
                <textarea className="form-control" rows={8} value={candForm.rawResumeText} onChange={(e) => setCandForm({ ...candForm, rawResumeText: e.target.value })} required />
              </div>
              <div className="span-3">
                <button className="btn-primary" type="submit" disabled={busy}>
                  Add to pool
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
                    <th>Client seat</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.slice(0, 20).map((c) => {
                    const isSeat = (agency?.seats || []).some((s) => s.clientId === c.id);
                    return (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.email}</td>
                        <td>{(c.extractedSkills || []).slice(0, 5).join(", ")}</td>
                        <td>
                          {isSeat ? (
                            <span className="badge ok">Client</span>
                          ) : (
                            <button className="chip" type="button" disabled={busy} onClick={() => addToClientSeats(c.id)}>
                              Add to client seats
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "brand" && agency && (
          <section className="card">
            <h3>White-label (MVP)</h3>
            <p className="muted">Logo text and brand color apply to this desk. SSO and custom domains are Phase 3.</p>
            <form className="form-grid" onSubmit={saveBrand}>
              <div>
                <label className="form-label">Desk name</label>
                <input className="form-control" value={agency.name} onChange={(e) => setAgency({ ...agency, name: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Logo letters</label>
                <input className="form-control" value={agency.logoText} onChange={(e) => setAgency({ ...agency, logoText: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Brand color</label>
                <input className="form-control" type="color" value={agency.brandColor} onChange={(e) => setAgency({ ...agency, brandColor: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Tier</label>
                <select className="form-select" value={agency.tier} onChange={(e) => setAgency({ ...agency, tier: e.target.value as AgencyWorkspace["tier"] })}>
                  <option>Coach</option>
                  <option>Small Agency</option>
                  <option>Professional</option>
                </select>
              </div>
              <div className="span-3">
                <button className="btn-primary" type="submit">
                  Save branding
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === "clients" && (
          <section className="card">
            <h3>Client roster & seats</h3>
            <p className="muted">Recruiter notes stay on the seat. Billing meters are tracked on Overview.</p>
            <CompactSearch value={search} onChange={setSearch} placeholder="Search clients or notes…" resultCount={visibleSeats.length} />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Recruiter notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSeats.map((s) => (
                    <tr key={s.clientId}>
                      <td>{s.clientName}</td>
                      <td>
                        <span className="badge ok">{s.status}</span>
                      </td>
                      <td>{s.progress}</td>
                      <td>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={notesDraft[s.clientId] ?? s.notes ?? ""}
                          onChange={(e) => setNotesDraft((prev) => ({ ...prev, [s.clientId]: e.target.value }))}
                        />
                        <button className="chip" type="button" onClick={() => saveSeatNotes(s.clientId)}>
                          Save notes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "hiring" && (
          <>
            <section className="card">
              <h3>Job requirement builder</h3>
              <form className="form-grid" onSubmit={submitJob}>
                <div>
                  <label className="form-label">Title</label>
                  <input className="form-control" required value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Company</label>
                  <input className="form-control" required value={jobForm.companyName} onChange={(e) => setJobForm({ ...jobForm, companyName: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Domain</label>
                  <input className="form-control" required value={jobForm.domain} onChange={(e) => setJobForm({ ...jobForm, domain: e.target.value })} />
                </div>
                <div className="span-3">
                  <label className="form-label">Mandatory</label>
                  <input className="form-control" required value={jobForm.mandatoryText} onChange={(e) => setJobForm({ ...jobForm, mandatoryText: e.target.value })} />
                </div>
                <div className="span-3">
                  <label className="form-label">Preferred</label>
                  <input className="form-control" value={jobForm.preferredText} onChange={(e) => setJobForm({ ...jobForm, preferredText: e.target.value })} />
                </div>
                <div className="span-3">
                  <button className="btn-primary" type="submit" disabled={busy}>
                    Rank candidate pool
                  </button>
                </div>
              </form>
            </section>
            <section className="card">
              <h3>Ranked candidates {busy ? "…" : ""}</h3>
              <p className="muted">Click a row for evidence + ATS, optimizer, GitHub proof, and cover letter tools.</p>
              <CompactSearch value={search} onChange={setSearch} placeholder="Search name, strengths, or gaps…" resultCount={visible.length} />
              <div className="chips">
                <button className="btn-ghost" type="button" onClick={copyShortlist}>
                  Copy shortlist
                </button>
                <button className="btn-ghost" type="button" onClick={exportShortlistCsv}>
                  Export CSV
                </button>
                <select className="form-select" style={{ maxWidth: 220 }} value={compareA} onChange={(e) => setCompareA(e.target.value)}>
                  <option value="">Compare A</option>
                  {results.map((r) => (
                    <option key={r.candidateId} value={r.candidateId}>
                      {r.candidateName}
                    </option>
                  ))}
                </select>
                <select className="form-select" style={{ maxWidth: 220 }} value={compareB} onChange={(e) => setCompareB(e.target.value)}>
                  <option value="">Compare B</option>
                  {results.map((r) => (
                    <option key={r.candidateId} value={r.candidateId}>
                      {r.candidateName}
                    </option>
                  ))}
                </select>
              </div>
              {aRow && bRow && (
                <div className="compare">
                  <ComparisonTable a={aRow} b={bRow} />
                </div>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Alignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r, i) => (
                      <tr key={r.candidateId} className="clickable" onClick={() => setSelected(r)}>
                        <td>{i + 1}</td>
                        <td>{r.candidateName}</td>
                        <td>
                          <span className={`badge ${r.isShortlisted ? "ok" : "no"}`}>{r.isShortlisted ? "Shortlisted" : "Rejected"}</span>
                        </td>
                        <td>{Math.round(r.qualificationScore)}%</td>
                        <td>{r.preferenceAlignment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal card agency-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{selected.candidateName}</h2>
                <p className="muted">
                  {Math.round(selected.qualificationScore)}% · {selected.isShortlisted ? "Shortlisted" : "Rejected"} · {selected.preferenceAlignment}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button className="chip" type="button" onClick={() => copyClientBrief(selected.candidateId)}>
                    Copy client brief
                  </button>
                  {(agency?.seats || []).some((s) => s.clientId === selected.candidateId) ? (
                    <span className="badge ok">Already a client</span>
                  ) : (
                    <button className="chip" type="button" disabled={busy} onClick={() => addToClientSeats(selected.candidateId)}>
                      Add to client seats
                    </button>
                  )}
                </div>
              </div>
              <button className="close" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>

            <div className="import-tabs" role="tablist">
              {(
                [
                  ["evidence", "Evidence"],
                  ["ats", "ATS score"],
                  ["optimizer", "Optimizer"],
                  ["github", "GitHub proof"],
                  ["cover", "Cover letter"]
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`import-tab ${modalTool === id ? "active" : ""}`}
                  onClick={() => (id === "evidence" ? setModalTool("evidence") : runCandidateTool(id))}
                  disabled={toolBusy && id !== "evidence"}
                >
                  {label}
                </button>
              ))}
            </div>

            {modalTool === "evidence" && (
              <>
                <pre className="pre">{selected.explanationText}</pre>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Requirement</th>
                        <th>Strength</th>
                        <th>Snippet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.evidenceList.map((ev) => (
                        <tr key={ev.requirementName}>
                          <td>{ev.requirementName}</td>
                          <td>{ev.strength}</td>
                          <td>{ev.snippet}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3>Interview questions</h3>
                {selected.interviewQuestions.slice(0, 6).map((q, i) => (
                  <p key={i}>
                    <strong>{q.category}:</strong> {q.question}
                  </p>
                ))}
              </>
            )}

            {modalTool === "ats" && ats && (
              <div>
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
                <p className="muted">Missing keywords: {ats.keywordMisses.join(", ") || "none"}</p>
              </div>
            )}

            {modalTool === "optimizer" && optimizer && (
              <div>
                {optimizer.layers.map((layer) => (
                  <div className="card" key={layer.id}>
                    <h4>{layer.title}</h4>
                    <p className="muted">{layer.summary}</p>
                  </div>
                ))}
                <h4>Draft based on verified experience</h4>
                <pre className="pre">{optimizer.optimizedResume.slice(0, 2000)}</pre>
              </div>
            )}

            {modalTool === "github" && github && (
              <div>
                <p>
                  Handle: <strong>{github.username || "none"}</strong> · confidence {github.confidence}%
                </p>
                {github.proofNotes.map((n, i) => (
                  <p key={i} className="muted">
                    {n}
                  </p>
                ))}
              </div>
            )}

            {modalTool === "cover" && cover && (
              <div>
                <pre className="pre">{cover.letter}</pre>
                <CopyButton text={cover.letter} label="Copy letter" />
              </div>
            )}

            {toolBusy && <p className="muted">Loading tool…</p>}
          </div>
        </div>
      )}
    </div>
  );
}
