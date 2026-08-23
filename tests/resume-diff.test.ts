import { describe, expect, it } from "vitest";
import { computeLineDiff, summarizeDiff } from "@/lib/engines/resume-diff";

describe("computeLineDiff", () => {
  it("returns all-unchanged for identical text", () => {
    const text = "line one\nline two\nline three";
    const diff = computeLineDiff(text, text);
    expect(diff.every((l) => l.type === "unchanged")).toBe(true);
    expect(diff.map((l) => l.text)).toEqual(["line one", "line two", "line three"]);
  });

  it("detects a single added line", () => {
    const oldText = "A\nB\nC";
    const newText = "A\nB\nX\nC";
    const diff = computeLineDiff(oldText, newText);
    expect(diff).toEqual([
      { type: "unchanged", text: "A" },
      { type: "unchanged", text: "B" },
      { type: "added", text: "X" },
      { type: "unchanged", text: "C" }
    ]);
  });

  it("detects a single removed line", () => {
    const oldText = "A\nB\nC";
    const newText = "A\nC";
    const diff = computeLineDiff(oldText, newText);
    expect(diff).toEqual([
      { type: "unchanged", text: "A" },
      { type: "removed", text: "B" },
      { type: "unchanged", text: "C" }
    ]);
  });

  it("detects a line replaced (edit) as remove + add", () => {
    const oldText = "SUMMARY\nOld summary line.";
    const newText = "SUMMARY\nNew summary line.";
    const diff = computeLineDiff(oldText, newText);
    const summary = summarizeDiff(diff);
    expect(summary.removed).toBe(1);
    expect(summary.added).toBe(1);
    expect(summary.unchanged).toBe(1);
  });

  it("handles a completely empty old text (everything added)", () => {
    const diff = computeLineDiff("", "line one\nline two");
    // "".split("\n") is [""], so the first entry is a remove of an empty
    // line — matches the real behavior of diffing against a blank resume.
    expect(diff.filter((l) => l.type === "added").map((l) => l.text)).toEqual(["line one", "line two"]);
  });

  it("handles a completely empty new text (everything removed)", () => {
    const diff = computeLineDiff("line one\nline two", "");
    expect(diff.filter((l) => l.type === "removed").map((l) => l.text)).toEqual(["line one", "line two"]);
  });

  it("real resume snapshot diff: bullet added under WORK EXPERIENCE", () => {
    const v1 = `NAME: Jordan Lee
EMAIL: jordan@example.com

WORK EXPERIENCE
Acme Corp, Engineer, 2022-Present
- Built the payments service`;
    const v2 = `NAME: Jordan Lee
EMAIL: jordan@example.com

WORK EXPERIENCE
Acme Corp, Engineer, 2022-Present
- Built the payments service
- Reduced latency by 30 percent`;
    const diff = computeLineDiff(v1, v2);
    const summary = summarizeDiff(diff);
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(0);
    expect(diff[diff.length - 1]).toEqual({ type: "added", text: "- Reduced latency by 30 percent" });
  });
});

describe("summarizeDiff", () => {
  it("counts each line type correctly", () => {
    const diff = computeLineDiff("A\nB\nC", "A\nX\nC");
    const summary = summarizeDiff(diff);
    expect(summary.added + summary.removed + summary.unchanged).toBe(diff.length);
    expect(summary.unchanged).toBe(2);
  });
});
