import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { FitReport } from "../srs-models";
import type { JobDescription } from "../models";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, color: "#555", marginBottom: 16 },
  h2: { fontSize: 12, marginTop: 14, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  row: { marginBottom: 3 },
  bullet: { marginBottom: 4, paddingLeft: 8 },
  muted: { color: "#666", fontSize: 9 },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  footer: { marginTop: 20, fontSize: 8, color: "#888" }
});

export function createOptimizerReportPdfDocument({
  name,
  job,
  fit
}: {
  name: string;
  job: JobDescription;
  fit: FitReport;
}) {
  const o = fit.optimizer;
  if (!o) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Career Report</Text>
          <Text>Re-analyze the job on Step 2 to generate optimizer data.</Text>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>AI Career & CV Optimizer Report</Text>
        <Text style={styles.subtitle}>
          {name} · {job.title} at {job.companyName} · {new Date().toISOString().slice(0, 10)}
        </Text>

        <Text style={styles.h2}>1. JD Match Score — {o.jdMatch.overall}/100 ({fit.label})</Text>
        {(
          [
            ["Skills", o.jdMatch.skillsMatch],
            ["Experience", o.jdMatch.experienceMatch],
            ["Technology", o.jdMatch.technologyMatch],
            ["Responsibilities", o.jdMatch.responsibilityMatch],
            ["ATS keywords", o.jdMatch.atsKeywordMatch],
            ["Education/Cert", o.jdMatch.educationCertMatch],
            ["Leadership", o.jdMatch.leadershipMatch ?? 0],
            ["Communication", o.jdMatch.communicationMatch ?? 0],
            ["AI relevance", o.jdMatch.aiRelevanceMatch ?? 0]
          ] as const
        ).map(([label, val]) => (
          <View key={label} style={styles.scoreRow}>
            <Text>{label}</Text>
            <Text>{val}%</Text>
          </View>
        ))}

        <Text style={styles.h2}>
          2. Career Opportunity Score — {o.careerOpportunityScore}/100 ({o.careerOpportunityLabel})
        </Text>

        <Text style={styles.h2}>3. Top Strengths</Text>
        {o.topStrengths.map((s) => (
          <Text key={s} style={styles.bullet}>• {s}</Text>
        ))}

        <Text style={styles.h2}>4. Missing / Weak Skills</Text>
        {o.missingWeakSkills.map((s) => (
          <Text key={s} style={styles.bullet}>• {s}</Text>
        ))}

        <Text style={styles.h2}>5. Market Trends</Text>
        <Text style={styles.row}>Fast-growing: {o.marketTrends.fastGrowing.join(", ")}</Text>
        <Text style={styles.row}>Emerging: {o.marketTrends.emerging.join(", ")}</Text>
        <Text style={styles.row}>In demand: {o.marketTrends.increasingDemand.join(", ")}</Text>
        <Text style={styles.muted}>Live feed merged with curated baseline when available.</Text>

        <Text style={styles.h2}>7. Career Opportunities</Text>
        {o.opportunities.slice(0, 6).map((op) => (
          <Text key={op.role} style={styles.bullet}>
            • {op.role} ({op.matchPercent}%) — {op.why}
          </Text>
        ))}

        <Text style={styles.h2}>9. Skill Gap Plan</Text>
        {o.skillGapPlan.slice(0, 10).map((g) => (
          <Text key={g.skill} style={styles.bullet}>
            {g.emoji} {g.skill} ({g.priority}) — {g.whyItMatters}
          </Text>
        ))}

        <Text style={styles.h2}>11. Summary Suggestion</Text>
        <Text style={styles.row}>{o.summarySuggestion || "(none)"}</Text>

        <Text style={styles.footer}>{fit.disclaimer}</Text>
        <Text style={styles.footer}>ResumeProof — evidence only. Nothing invented.</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>10. Recommended CV Changes</Text>
        {o.recommendedCvChanges.map((c, i) => (
          <Text key={i} style={styles.bullet}>
            • {c.area}: {c.change}{c.truthful ? "" : " (verify first)"}
          </Text>
        ))}

        <Text style={styles.h2}>12. Why This CV Is More Competitive</Text>
        {o.whyMoreCompetitive.map((w) => (
          <Text key={w} style={styles.bullet}>• {w}</Text>
        ))}

        <Text style={styles.h2}>13. Next Best Actions</Text>
        {o.nextBestActions.map((a) => (
          <Text key={a.title} style={styles.bullet}>• {a.title}: {a.detail}</Text>
        ))}

        {o.responsibilityHighlights?.length ? (
          <>
            <Text style={styles.h2}>Responsibility Evidence Map</Text>
            {o.responsibilityHighlights.map((h) => (
              <Text key={h.responsibility} style={styles.bullet}>
                • {h.coverage}% — {h.responsibility}
              </Text>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}
