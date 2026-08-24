"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="brand-row">
          <div className="logo">🔍</div>
          <div>
            <h1>ResumeProof</h1>
            <p>AI Job Application Copilot — built from your real career evidence.</p>
          </div>
        </div>
        <p className="promise">
          We tailor applications to a job, explain every recommendation, and never invent employers, titles, dates, skills, or metrics.
        </p>
      </header>

      <section className="door-grid">
        <Link href="/candidate" className="door door-seeker">
          <span className="door-kicker">Job seeker</span>
          <h2>I am applying for jobs</h2>
          <p>
            Import your resume into a Career Vault, paste a job, see a transparent Fit Score, accept or reject evidence-backed edits, then export an application kit.
          </p>
          <ol>
            <li>Import your resume (paste, upload, or LinkedIn)</li>
            <li>Paste or fetch a job description</li>
            <li>Tailor → verify → copy WhatsApp / apply</li>
          </ol>
          <strong>Open candidate workspace →</strong>
        </Link>

        <Link href="/agency" className="door door-agency">
          <span className="door-kicker">Recruiter / agency / coach</span>
          <h2>I hire or I manage clients</h2>
          <p>
            Post a role, rank a candidate pool with snippet-level evidence, compare two people, copy a shortlist, and keep recruiter notes on seats.
          </p>
          <ol>
            <li>Brand your desk</li>
            <li>Set job requirements</li>
            <li>Rank, compare, interview</li>
          </ol>
          <strong>Open agency command center →</strong>
        </Link>
      </section>

      <section className="card landing-note">
        <h3>How a new user should start</h3>
        <p className="muted">
          Candidates: import your resume, save the vault, then analyze a job — a Fit Score in a few minutes. Agencies: pick a job template and click a candidate row for proof, not a black-box percentage.
        </p>
      </section>

      <section className="card landing-note">
        <h3>Market upgrades in this build</h3>
        <p className="muted">
          2026 hiring is paste-first, WhatsApp/LinkedIn-first, and skeptical of ATS scores. ResumeProof now matches that workflow without fabricating experience.
        </p>
        <ul className="muted" style={{ margin: "12px 0 0 18px", lineHeight: 1.7 }}>
          <li>Career Vault completeness + archive</li>
          <li>JD seniority/location + required vs preferred chips</li>
          <li>Fit Score next actions, delta, and honest score movers</li>
          <li>Copy-ready WhatsApp, referral, and 24h thank-you notes</li>
          <li>Kanban tracker with 3-day follow-up copy</li>
          <li>Agency search, side-by-side compare, seat notes, copy shortlist</li>
          <li>Export / delete workspace (privacy)</li>
        </ul>
      </section>
    </div>
  );
}
