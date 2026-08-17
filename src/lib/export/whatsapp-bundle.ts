import type { ApplicationKit } from "@/lib/srs-models";

/** Single WhatsApp-friendly message bundling the apply kit for India-first sharing. */
export function buildWhatsAppBundle(kit: ApplicationKit, jobTitle: string, company: string, referredBy?: string): string {
  return [
    `Hi — applying for *${jobTitle}* at *${company}*.`,
    "",
    "*3-line pitch:*",
    kit.shortCover,
    "",
    "*Key highlights:*",
    ...kit.highlights.slice(0, 4).map((h) => `• ${h}`),
    "",
    "*WhatsApp follow-up:*",
    kit.whatsappNote,
    referredBy ? `\nReferred by: ${referredBy}` : "",
    "",
    "_Resume attached separately — all claims are from my vault._"
  ]
    .filter(Boolean)
    .join("\n");
}
