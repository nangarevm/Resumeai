import { createHash } from "crypto";

export function userIdFromEmail(email: string): string {
  return `user-${createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 24)}`;
}
