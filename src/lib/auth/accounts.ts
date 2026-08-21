import fs from "fs";
import path from "path";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { userIdFromEmail } from "./user-id";
import { dataDir } from "../data-dir";

function accountsFilePath(): string {
  return process.env.RESUMEPROOF_ACCOUNTS_FILE || path.join(dataDir(), "accounts", "accounts.json");
}

interface Account {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface AccountsFile {
  accounts: Record<string, Account>; // keyed by userIdFromEmail(email)
}

// Same in-memory-cache-in-front-of-disk pattern as every other file-backed
// store in this codebase (workspace-store.ts, store.ts, market-intelligence.ts).
let memCache: AccountsFile | null = null;

/** Test isolation — mirrors resetWorkspaceCache() in workspace-store.ts. */
export function resetAccountsCache(): void {
  memCache = null;
}

function readAccounts(): AccountsFile {
  if (memCache) return memCache;
  const file = accountsFilePath();
  try {
    if (fs.existsSync(/* turbopackIgnore: true */ file)) {
      memCache = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ file, "utf8")) as AccountsFile;
      return memCache;
    }
  } catch {
    /* ignore — fall through to empty store */
  }
  memCache = { accounts: {} };
  return memCache;
}

function writeAccounts(file: AccountsFile): void {
  const filePath = accountsFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
  memCache = file;
}

const SCRYPT_KEY_LEN = 64;

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEY_LEN).toString("hex");
}

export interface AccountResult {
  id: string;
  email: string;
}

export type CreateAccountError = "invalid_email" | "weak_password" | "already_registered";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Minimum bar, not a full strength meter — this app never blocks a user
 *  from getting in over a password policy dispute, just rules out the
 *  most obviously guessable inputs. */
function isAcceptablePassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8;
}

export async function createAccount(rawEmail: string, password: string): Promise<AccountResult | CreateAccountError> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) return "invalid_email";
  if (!isAcceptablePassword(password)) return "weak_password";

  const file = readAccounts();
  const id = userIdFromEmail(email);
  if (file.accounts[id]) return "already_registered";

  const salt = randomBytes(16).toString("hex");
  const account: Account = {
    id,
    email,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString()
  };
  file.accounts[id] = account;
  writeAccounts(file);
  return { id, email };
}

export async function findAccountByEmail(rawEmail: string): Promise<AccountResult | null> {
  const email = normalizeEmail(rawEmail);
  const account = readAccounts().accounts[userIdFromEmail(email)];
  return account ? { id: account.id, email: account.email } : null;
}

export async function verifyCredentials(rawEmail: string, password: string): Promise<AccountResult | null> {
  const email = normalizeEmail(rawEmail);
  const account = readAccounts().accounts[userIdFromEmail(email)];
  if (!account) return null;
  const candidateHash = hashPassword(password, account.salt);
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(account.passwordHash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id: account.id, email: account.email };
}

/** Used by the password-reset flow. Silently no-ops if the email has no
 *  account — callers must not let that distinction leak back to the caller
 *  (see /api/auth/forgot-password, which always returns the same message). */
export async function setPassword(rawEmail: string, newPassword: string): Promise<boolean> {
  if (!isAcceptablePassword(newPassword)) return false;
  const email = normalizeEmail(rawEmail);
  const file = readAccounts();
  const id = userIdFromEmail(email);
  const account = file.accounts[id];
  if (!account) return false;

  const salt = randomBytes(16).toString("hex");
  account.passwordHash = hashPassword(newPassword, salt);
  account.salt = salt;
  writeAccounts(file);
  return true;
}
