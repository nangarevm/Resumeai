import { describe, expect, it } from "vitest";
import { moveLineInText, moveSegmentInText, segmentLines } from "@/lib/resume-line-editor";

const RESUME = `NAME: Alex Chen
EMAIL: alex.chen@example.com

SUMMARY
Recent CS graduate.

SKILLS
- Python
- SQL
- Selenium

EDUCATION
- B.S. Computer Science, State University, 2026`;

describe("segmentLines", () => {
  it("groups each header with the non-header lines that follow it", () => {
    const lines = RESUME.split("\n");
    const segments = segmentLines(lines);
    const skillsSeg = segments.find((s) => s.headerIndex !== null && lines[s.headerIndex] === "SKILLS");
    expect(skillsSeg).toBeTruthy();
    expect(skillsSeg!.rowIndices.map((i) => lines[i])).toEqual(["- Python", "- SQL", "- Selenium"]);
  });
});

describe("moveLineInText", () => {
  it("swaps a bullet with the one below it", () => {
    const lines = RESUME.split("\n");
    const segments = segmentLines(lines);
    const skillsIndex = segments.findIndex((s) => s.headerIndex !== null && lines[s.headerIndex] === "SKILLS");
    const next = moveLineInText(RESUME, skillsIndex, 0, 1);
    const nextLines = next.split("\n");
    const nextSegments = segmentLines(nextLines);
    const nextSkills = nextSegments[skillsIndex];
    expect(nextSkills.rowIndices.map((i) => nextLines[i])).toEqual(["- SQL", "- Python", "- Selenium"]);
  });

  it("swaps a bullet with the one above it", () => {
    const lines = RESUME.split("\n");
    const segments = segmentLines(lines);
    const skillsIndex = segments.findIndex((s) => s.headerIndex !== null && lines[s.headerIndex] === "SKILLS");
    const next = moveLineInText(RESUME, skillsIndex, 2, -1);
    const nextLines = next.split("\n");
    const nextSegments = segmentLines(nextLines);
    expect(nextSegments[skillsIndex].rowIndices.map((i) => nextLines[i])).toEqual(["- Python", "- Selenium", "- SQL"]);
  });

  it("is a no-op at the top of a section", () => {
    const lines = RESUME.split("\n");
    const segments = segmentLines(lines);
    const skillsIndex = segments.findIndex((s) => s.headerIndex !== null && lines[s.headerIndex] === "SKILLS");
    expect(moveLineInText(RESUME, skillsIndex, 0, -1)).toBe(RESUME);
  });

  it("is a no-op at the bottom of a section", () => {
    const lines = RESUME.split("\n");
    const segments = segmentLines(lines);
    const skillsIndex = segments.findIndex((s) => s.headerIndex !== null && lines[s.headerIndex] === "SKILLS");
    const lastPos = segments[skillsIndex].rowIndices.length - 1;
    expect(moveLineInText(RESUME, skillsIndex, lastPos, 1)).toBe(RESUME);
  });

  it("is a no-op for an out-of-range segment index", () => {
    expect(moveLineInText(RESUME, 99, 0, 1)).toBe(RESUME);
  });
});

describe("moveSegmentInText", () => {
  it("swaps two adjacent sections, header and content together", () => {
    const lines = RESUME.split("\n");
    const segments = segmentLines(lines);
    const skillsIndex = segments.findIndex((s) => s.headerIndex !== null && lines[s.headerIndex] === "SKILLS");
    const eduIndex = segments.findIndex((s) => s.headerIndex !== null && lines[s.headerIndex] === "EDUCATION");
    expect(eduIndex).toBe(skillsIndex + 1);

    const next = moveSegmentInText(RESUME, skillsIndex, 1);
    const nextLines = next.split("\n");
    const nextSegments = segmentLines(nextLines);

    // EDUCATION now comes before SKILLS
    const headers = nextSegments.map((s) => (s.headerIndex !== null ? nextLines[s.headerIndex] : null));
    const eduPos = headers.indexOf("EDUCATION");
    const skillsPos = headers.indexOf("SKILLS");
    expect(eduPos).toBeLessThan(skillsPos);

    // content of each section travels with its header, nothing lost
    const movedSkills = nextSegments[headers.indexOf("SKILLS")];
    expect(movedSkills.rowIndices.map((i) => nextLines[i])).toEqual(["- Python", "- SQL", "- Selenium"]);
    const movedEdu = nextSegments[headers.indexOf("EDUCATION")];
    expect(movedEdu.rowIndices.map((i) => nextLines[i])).toEqual(["- B.S. Computer Science, State University, 2026"]);
  });

  it("preserves every non-blank line — reordering never drops content", () => {
    const before = RESUME.split("\n").filter((l) => l.trim()).sort();
    const next = moveSegmentInText(RESUME, 1, 1);
    const after = next.split("\n").filter((l) => l.trim()).sort();
    expect(after).toEqual(before);
  });

  it("is a no-op at the top of the document", () => {
    expect(moveSegmentInText(RESUME, 0, -1)).toBe(RESUME);
  });

  it("is a no-op at the bottom of the document", () => {
    const segments = segmentLines(RESUME.split("\n"));
    expect(moveSegmentInText(RESUME, segments.length - 1, 1)).toBe(RESUME);
  });

  it("is a no-op for an out-of-range segment index", () => {
    expect(moveSegmentInText(RESUME, 99, 1)).toBe(RESUME);
  });
});
