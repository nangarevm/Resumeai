"use client";

import type { CareerOptimizerReport } from "@/lib/srs-models";

export default function OptimizerReportPanel({ report }: { report: CareerOptimizerReport }) {
  return (
    <div className="optimizer-report" style={{ marginTop: 20 }}>
      <h3>AI Career & CV Optimizer</h3>
      <p className="muted">Based on your verified experience — market signals are curated guides, not invented skills.</p>
      <p className="muted" style={{ fontSize: 13 }}>
        <strong>JD Match</strong> below is your Fit Score from above, repeated here for reference. <strong>Career Opportunity</strong>{" "}
        is a wider view — it also weighs market demand for this role and skills you could transfer in, so it can read higher or
        lower than the Fit Score alone.
      </p>

      <div className="metrics" style={{ marginTop: 12 }}>
        <div className="metric">
          <span>CAREER OPPORTUNITY</span>
          <strong>{report.careerOpportunityScore}</strong>
        </div>
        <div className="metric">
          <span>LABEL</span>
          <strong>{report.careerOpportunityLabel}</strong>
        </div>
        <div className="metric">
          <span>JD MATCH</span>
          <strong>{report.jdMatch.overall}</strong>
        </div>
      </div>

      <details open className="opt-section">
        <summary>How your resume matches this job</summary>
        <div className="grid-2" style={{ marginTop: 8 }}>
          {(
            [
              ["Skills", report.jdMatch.skillsMatch],
              ["Experience", report.jdMatch.experienceMatch],
              ["Technology", report.jdMatch.technologyMatch],
              ["Responsibilities", report.jdMatch.responsibilityMatch],
              ["ATS keywords", report.jdMatch.atsKeywordMatch],
              ["Education/Cert", report.jdMatch.educationCertMatch],
              ["Leadership", report.jdMatch.leadershipMatch ?? 0],
              ["Communication", report.jdMatch.communicationMatch ?? 0],
              ["AI relevance", report.jdMatch.aiRelevanceMatch ?? 0]
            ] as const
          ).map(([label, val]) => (
            <div key={label}>
              <span className="muted">{label}</span>
              <div className="progress">
                <span style={{ width: `${val}%` }} />
              </div>
              <strong>{val}%</strong>
            </div>
          ))}
        </div>
        {report.jdMatch.responsibilityTotalCount ? (
          <p className="muted" style={{ marginTop: 8 }}>
            {report.jdMatch.responsibilityMatchedCount ?? 0} of {report.jdMatch.responsibilityTotalCount} JD duty lines
            have resume/vault keyword overlap (not scored as separate requirements).
          </p>
        ) : null}
        {report.jdMatch.dimensionNotes && (
          <div style={{ marginTop: 8 }}>
            <p className="muted"><strong>Leadership:</strong> {report.jdMatch.dimensionNotes.leadership}</p>
            <p className="muted"><strong>Communication:</strong> {report.jdMatch.dimensionNotes.communication}</p>
            <p className="muted"><strong>AI relevance:</strong> {report.jdMatch.dimensionNotes.aiRelevance}</p>
          </div>
        )}
      </details>

      {report.responsibilityHighlights?.length ? (
        <details className="opt-section">
          <summary>Responsibility evidence map</summary>
          {report.responsibilityHighlights.map((h) => (
            <div key={h.responsibility} className="chain-item" style={{ marginBottom: 8 }}>
              <strong>{h.coverage}% overlap</strong> — {h.responsibility}
              <p className="muted">{h.evidenceSnippet}</p>
            </div>
          ))}
          {report.responsibilityGaps?.length ? (
            <p className="muted">
              <strong>Gaps:</strong> {report.responsibilityGaps.join(" · ")}
            </p>
          ) : null}
        </details>
      ) : null}

      <details className="opt-section">
        <summary>Skill gap plan</summary>
        <div style={{ marginTop: 8 }}>
          {report.skillGapPlan.map((g) => (
            <div key={g.skill} className="chain-item" style={{ marginBottom: 8 }}>
              <strong>{g.emoji} {g.skill}</strong>
              <span className={`badge ${g.priority === "High" ? "no" : g.priority === "Medium" ? "mid" : "ok"}`}>{g.priority}</span>
              <p className="muted">{g.whyItMatters}</p>
              <p className="muted">{g.marketNote}</p>
              <p className="muted"><em>{g.learningApproach}</em></p>
            </div>
          ))}
        </div>
      </details>

      <details className="opt-section">
        <summary>Market intelligence (2026 curated)</summary>
        <p className="muted" style={{ marginTop: 8 }}>
          <strong>Fast-growing:</strong> {report.marketTrends.fastGrowing.join(", ")}
        </p>
        <p className="muted">
          <strong>Emerging:</strong> {report.marketTrends.emerging.join(", ")}
        </p>
        <p className="muted">
          <strong>In demand:</strong> {report.marketTrends.increasingDemand.join(", ")}
        </p>
        <p className="muted">
          <strong>Declining emphasis:</strong> {report.marketTrends.declining.join(", ")}
        </p>
        <p className="muted">
          <strong>AI opportunities:</strong> {report.marketTrends.aiOpportunities.join("; ")}
        </p>
        {report.marketTrends.liveSource && (
          <p className="muted" style={{ fontSize: 11 }}>
            Live feed: {report.marketTrends.liveSource}
            {report.marketTrends.liveFetchedAt ? ` · ${report.marketTrends.liveFetchedAt.slice(0, 10)}` : ""}
          </p>
        )}
      </details>

      <details className="opt-section">
        <summary>Opportunity detector</summary>
        {report.opportunities.map((op) => (
          <div key={op.role} className="chain-item" style={{ marginBottom: 8 }}>
            <strong>{op.role}</strong> · {op.matchPercent}% · <span className="badge mid">{op.category.replace("_", " ")}</span>
            <p className="muted">{op.why}</p>
            {op.skillsToAdd?.length && <p className="muted">Skills to add: {op.skillsToAdd.join(", ")}</p>}
          </div>
        ))}
      </details>

      <details className="opt-section">
        <summary>Recommended CV changes</summary>
        {report.recommendedCvChanges.map((c, i) => (
          <p key={i}>
            <strong>{c.area}:</strong> {c.change}
            {!c.truthful && <span className="badge mid"> verify first</span>}
          </p>
        ))}
      </details>

      {report.summarySuggestion && (
        <div className="chain-item green" style={{ marginTop: 12 }}>
          <strong>Suggested summary line</strong>
          <p>{report.summarySuggestion}</p>
        </div>
      )}

      <details className="opt-section">
        <summary>Why this CV is more competitive</summary>
        <ul className="muted" style={{ margin: "8px 0 0 18px" }}>
          {report.whyMoreCompetitive.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
