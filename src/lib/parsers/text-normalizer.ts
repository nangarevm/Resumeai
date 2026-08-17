export function normalize(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

export function cleanToken(token: string | null | undefined): string {
  if (!token) return "";
  return token.replace(/[^a-zA-Z0-9+#]/g, "").toLowerCase();
}

export function containsPhrase(text: string | null | undefined, phrase: string | null | undefined): boolean {
  if (!text || !phrase) return false;
  return text.toLowerCase().includes(phrase.toLowerCase());
}

export function splitSentences(content: string): string[] {
  return content
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function splitList(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p.toLowerCase() !== "and");
}
