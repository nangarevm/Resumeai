"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AgencyWorkspace } from "@/lib/srs-models";
import type { EvaluationModeName, EvaluationResult, JobDescription } from "@/lib/models";
import { EVALUATION_MODES } from "@/lib/models";

type Tab = "overview" | "hiring" | "clients" | "brand";

export default function AgencyApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const [agency, setAgency] = useState<AgencyWorkspace | null>(null);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [mode, setMode] = useState<EvaluationModeName>("BALANCED");
  const [results, setResults] = useState<EvaluationResult[]>([]);
  const [selected, setSelected] = useState<EvaluationResult | null>(null);
  const [jobForm, setJobForm] = useState({ title: "", companyName: "", domain: "", mandatoryText: "", preferredText: "" });
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const loadAgency = useCallback(async () => {
    setAgency(await fetch("/api/agency").then((r) => r.json()));
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
  }, [mode]);

  useEffect(() => {
    loadAgency();
    runAnalysis("BALANCED");
  }, []);

  async function saveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!agency) return;
    const next = await fetch("/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agency)
    }).then((r) => r.json());
    setAgency(next);
  }

  async function submitJob(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(jobForm) });
    await runAnalysis(mode);
    setTab("hiring");
  }

  const shortlisted = results.filter((r) => r.isShortlisted).length;
  const color = agency?.brandColor || "#58a6ff";
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

  async function saveSeatNotes(clientId: string) {
    const next = await fetch("/api/agency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, notes: notesDraft[clientId] || "" })
    }).then((r) => r.json());
    setAgency(next);
    setNotice("Seat notes saved.");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="logo" style={{ background: color }}>
            {agency?.logoText || "RP"}
          </div>
          <div>
            <h1>Agency</h1>
            <span>{agency?.name || "Command center"}</span>
          </div>
        </Link>
        <button className={`nav-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
          🏠 Overview
        </button>
        <button className={`nav-btn ${tab === "hiring" ? "active" : ""}`} onClick={() => setTab("hiring")}>
          💼 Hiring desk
        </button>
        <button className={`nav-btn ${tab === "clients" ? "active" : ""}`} onClick={() => setTab("clients")}>
          👥 Client seats
        </button>
        <button className={`nav-btn ${tab === "brand" ? "active" : ""}`} onClick={() => setTab("brand")}>
          🎨 White-label
        </button>
        <Link href="/candidate" className="sidebar-foot" style={{ textDecoration: "none" }}>
          Switch to candidate workspace →
        </Link>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="label">{agency?.tier} desk</div>
            <h2>{agency?.name}</h2>
            <p className="muted">Rank people from evidence snippets. Do not treat scores as a hiring decision.</p>
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

        {notice && <div className="banner">{notice}</div>}

        {tab === "overview" && (
          <>
            <div className="banner">
              New agency user: set your brand, pick a job template on Hiring desk, then click a candidate for proof — not a black-box %.
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
            <section className="card">
              <h3>Active role</h3>
              <p>
                {job?.title} · {job?.companyName}
              </p>
              <p className="muted">{EVALUATION_MODES[mode].description}</p>
              <button className="btn-primary" onClick={() => setTab("hiring")}>
                Open hiring desk
              </button>
            </section>
          </>
        )}

        {tab === "brand" && agency && (
          <section className="card">
            <h3>White-label (MVP)</h3>
            <p className="muted">Logo text and brand color apply to this desk. SSO and custom domains are later.</p>
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
            <p className="muted">
              Phase 3 B2B meters $/active client. Recruiter notes stay on the seat — Ashby/Greenhouse pattern, no invented candidate claims.
            </p>
            <input
              className="search"
              placeholder="Search clients or notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
              <p className="muted">Search, compare two people, copy the shortlist. Click a row for snippets — scores are not a hiring decision.</p>
              <input className="search" placeholder="Search name, strengths, or gaps…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                <button className="btn-ghost" type="button" onClick={copyShortlist}>
                  Copy shortlist
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
                  {[aRow, bRow].map((r) => (
                    <article key={r.candidateId} className="card">
                      <h4>{r.candidateName}</h4>
                      <p>
                        {Math.round(r.qualificationScore)}% · {r.isShortlisted ? "Shortlisted" : "Rejected"} · {r.preferenceAlignment}
                      </p>
                      <p className="muted">Strong: {r.strongAreas.slice(0, 5).join(", ") || "—"}</p>
                      <p className="muted">Missing: {r.missingRequirements.slice(0, 5).join(", ") || "—"}</p>
                    </article>
                  ))}
                </div>
              )}
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
            </section>
          </>
        )}
      </main>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>{selected.candidateName}</h2>
              <button className="close" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <pre className="pre">{selected.explanationText}</pre>
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
            <h3>Interview questions</h3>
            {selected.interviewQuestions.slice(0, 6).map((q, i) => (
              <p key={i}>{q.question}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
