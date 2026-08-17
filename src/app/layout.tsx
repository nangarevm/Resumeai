import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeProof — Examine the evidence",
  description:
    "Evidence-based candidate matching, claim verification, honest resume optimization, ATS scoring, and interview intelligence."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
