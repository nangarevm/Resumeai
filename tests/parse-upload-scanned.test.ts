import { describe, expect, it, vi } from "vitest";

// pdf-parse itself is a third-party binary-ish parser that's hard to feed a
// genuinely valid "scanned, no text layer" PDF without a full PDF-generation
// pipeline — mocking it lets this test exercise the route's own detection
// logic (looksLikeScannedPdf, unit-tested directly in pdf-quality.test.ts)
// without depending on pdf-parse's internal behavior for a specific byte
// layout.
vi.mock("pdf-parse", () => ({
  default: vi.fn(async (buffer: Buffer) => {
    const marker = buffer.toString("utf8");
    if (marker.includes("SCANNED_MARKER")) return { text: "", numpages: 1 };
    return {
      text: "NAME: Jane Doe\nEMAIL: jane@example.com\n\nWORK EXPERIENCE\nAcme, Engineer, 2022-Present\n- Did real work",
      numpages: 1
    };
  })
}));

import { POST as parsePost } from "@/app/api/parse/route";

function formDataWithFile(name: string, content: string, type = "application/pdf"): FormData {
  const form = new FormData();
  const blob = new Blob([content], { type });
  form.append("file", blob, name);
  return form;
}

describe("POST /api/parse — scanned PDF detection", () => {
  it("rejects a PDF whose extracted text is empty, with a clear actionable error", async () => {
    const res = await parsePost(
      new Request("http://localhost/api/parse", {
        method: "POST",
        body: formDataWithFile("scanned.pdf", "%PDF-1.4 SCANNED_MARKER")
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/scanned image/i);
    expect(data.error).toMatch(/paste the resume text directly/i);
  });

  it("accepts a PDF with a normal amount of extracted text", async () => {
    const res = await parsePost(
      new Request("http://localhost/api/parse", {
        method: "POST",
        body: formDataWithFile("real-resume.pdf", "%PDF-1.4 REAL_RESUME")
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.email).toBe("jane@example.com");
  });
});
