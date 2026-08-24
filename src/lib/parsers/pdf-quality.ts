/** A pasted or typed single-page resume yields hundreds of characters of
 *  extracted text at minimum. A scanned/image-only PDF that pdf-parse could
 *  find no text layer in yields little or nothing (sometimes a handful of
 *  stray characters from embedded metadata). This threshold mirrors the
 *  40-char "too short to use" gate already used elsewhere in this codebase
 *  (see bulk-candidates' per-row minimum) — well below anything a real
 *  extracted page of resume text would produce. */
const MIN_MEANINGFUL_CHARS = 40;

export function looksLikeScannedPdf(extractedText: string): boolean {
  return extractedText.replace(/\s+/g, "").length < MIN_MEANINGFUL_CHARS;
}
