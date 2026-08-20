import { describe, expect, it } from "vitest";
import { POST as parsePost } from "@/app/api/parse/route";

function formDataWithFile(name: string, content: string, type = "text/plain"): FormData {
  const form = new FormData();
  const blob = new Blob([content], { type });
  form.append("file", blob, name);
  return form;
}

// Deliberately malformed — a PDF header/objects with a wrong startxref
// offset, which pdf-parse's underlying engine throws on rather than
// gracefully returning empty text for. This is what surfaced the crash.
const MALFORMED_PDF = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> >>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<< /Size 4 /Root 1 0 R >>
startxref
201
%%EOF`;

describe("POST /api/parse", () => {
  it("parses a plain .txt upload", async () => {
    const res = await parsePost(
      new Request("http://localhost/api/parse", {
        method: "POST",
        body: formDataWithFile("resume.txt", "NAME: Test\nEMAIL: t@example.com")
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.text).toContain("NAME: Test");
    expect(data.profile.email).toBe("t@example.com");
  });

  it("rejects an unsupported file extension with a clear error, not a crash", async () => {
    const res = await parsePost(
      new Request("http://localhost/api/parse", {
        method: "POST",
        body: formDataWithFile("resume.doc", "some content")
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/Supported uploads/);
  });

  it("returns a clean JSON error instead of crashing on a malformed PDF", async () => {
    const res = await parsePost(
      new Request("http://localhost/api/parse", {
        method: "POST",
        body: formDataWithFile("scanned.pdf", MALFORMED_PDF, "application/pdf")
      })
    );
    // Before the fix, this threw unhandled inside the route and the client
    // got a bodiless 500 that failed to even parse as JSON.
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("requires a file field", async () => {
    const res = await parsePost(new Request("http://localhost/api/parse", { method: "POST", body: new FormData() }));
    expect(res.status).toBe(400);
  });
});
