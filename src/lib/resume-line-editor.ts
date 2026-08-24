const HEADER_RE =
  /^(NAME|EMAIL|PHONE|LINKEDIN|GITHUB|PREFERRED ROLE|PREFERRED DOMAIN|DREAM COMPANIES):|^(SUMMARY|PROFILE SUMMARY|PROFILE|OBJECTIVE|CONTACT|SKILLS|TECHNICAL SKILLS|KEY SKILLS|WORK EXPERIENCE|EXPERIENCE|PROJECTS|EDUCATION|CERTIFICATIONS):?$/i;

export function isHeaderLine(line: string): boolean {
  return HEADER_RE.test(line.trim());
}

export interface ResumeSegment {
  headerIndex: number | null;
  rowIndices: number[];
}

/** Groups plain-text resume lines into sections — one segment per header
 *  line plus the non-header lines that follow it, until the next header. */
export function segmentLines(lines: string[]): ResumeSegment[] {
  const segments: ResumeSegment[] = [];
  let current: ResumeSegment = { headerIndex: null, rowIndices: [] };
  lines.forEach((line, idx) => {
    if (!line.trim()) return;
    if (isHeaderLine(line)) {
      if (current.headerIndex !== null || current.rowIndices.length) segments.push(current);
      current = { headerIndex: idx, rowIndices: [] };
    } else {
      current.rowIndices.push(idx);
    }
  });
  if (current.headerIndex !== null || current.rowIndices.length) segments.push(current);
  return segments;
}

/** Swaps a line's content with the adjacent line within the same section —
 *  a no-op at the top/bottom edge of that section. */
export function moveLineInText(text: string, segmentIndex: number, linePos: number, direction: -1 | 1): string {
  const lines = text.split("\n");
  const segments = segmentLines(lines);
  const seg = segments[segmentIndex];
  if (!seg) return text;
  const otherPos = linePos + direction;
  if (otherPos < 0 || otherPos >= seg.rowIndices.length) return text;
  const idxA = seg.rowIndices[linePos];
  const idxB = seg.rowIndices[otherPos];
  const next = [...lines];
  [next[idxA], next[idxB]] = [next[idxB], next[idxA]];
  return next.join("\n");
}

/** Swaps an entire section (header + its lines) with the adjacent section —
 *  a no-op at the top/bottom of the document. Rebuilds the document with a
 *  single blank line between sections, which normalizes spacing but never
 *  drops or invents content. */
export function moveSegmentInText(text: string, segmentIndex: number, direction: -1 | 1): string {
  const lines = text.split("\n");
  const segments = segmentLines(lines);
  const otherIndex = segmentIndex + direction;
  if (segmentIndex < 0 || segmentIndex >= segments.length || otherIndex < 0 || otherIndex >= segments.length) return text;
  const blocks = segments.map((seg) => {
    const idxs = [seg.headerIndex, ...seg.rowIndices].filter((i): i is number => i !== null).sort((a, b) => a - b);
    return idxs.map((i) => lines[i]);
  });
  [blocks[segmentIndex], blocks[otherIndex]] = [blocks[otherIndex], blocks[segmentIndex]];
  return blocks.map((b) => b.join("\n")).join("\n\n");
}
