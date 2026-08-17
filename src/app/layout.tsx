import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeProof — AI Job Application Copilot",
  description:
    "Career Vault, transparent fit scores, evidence-based tailoring, verification, application tracking, interview prep, and an agency hiring desk. Never fabricates experience."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
