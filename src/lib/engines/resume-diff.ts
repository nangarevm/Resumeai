/** Line-level diff between two resume snapshots. Hand-rolled classic LCS
 *  (longest common subsequence) diff rather than adding a dependency —
 *  resume text is at most a few hundred lines, well within the O(n*m)
 *  table this builds, and the algorithm itself is a well-understood,
 *  directly-testable one (no move/rename detection, which a version-to-
 *  version resume diff doesn't need anyway). */

export type DiffLineType = "added" | "removed" | "unchanged";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

export interface DiffSummary {
  added: number;
  removed: number;
  unchanged: number;
}

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const m = oldLines.length;
  const n = newLines.length;

  // dp[i][j] = length of the LCS of oldLines[i..] and newLines[j..].
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "unchanged", text: oldLines[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: oldLines[i] });
      i++;
    } else {
      result.push({ type: "added", text: newLines[j] });
      j++;
    }
  }
  while (i < m) {
    result.push({ type: "removed", text: oldLines[i] });
    i++;
  }
  while (j < n) {
    result.push({ type: "added", text: newLines[j] });
    j++;
  }

  return result;
}

export function summarizeDiff(lines: DiffLine[]): DiffSummary {
  const summary: DiffSummary = { added: 0, removed: 0, unchanged: 0 };
  for (const line of lines) summary[line.type]++;
  return summary;
}
