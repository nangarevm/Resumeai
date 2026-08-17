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
            <li>Import resume</li>
            <li>Analyze a job</li>
            <li>Tailor → verify → apply</li>
          </ol>
          <strong>Open candidate workspace →</strong>
        </Link>

        <Link href="/agency" className="door door-agency">
          <span className="door-kicker">Recruiter / agency / coach</span>
          <h2>I hire or I manage clients</h2>
          <p>
            Post a role, rank a candidate pool with snippet-level evidence, generate interview questions, and run a simple client desk with branding.
          </p>
          <ol>
            <li>Brand your desk</li>
            <li>Set job requirements</li>
            <li>Rank & interview</li>
          </ol>
          <strong>Open agency command center →</strong>
        </Link>
      </section>

      <section className="card landing-note">
        <h3>How a new user should start</h3>
        <p className="muted">
          Candidates: you only need a resume (paste or upload) and a job description. Agencies: pick a job template and click a candidate row to see proof — not a black-box percentage.
        </p>
      </section>
    </div>
  );
}
