import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { verifyMagicToken } from "./magic-link";
import { verifyCredentials } from "./accounts";
import { userIdFromEmail } from "./user-id";
import { checkRateLimit } from "./rate-limit";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export { userIdFromEmail } from "./user-id";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "magic-link",
    name: "Magic Link",
    credentials: {
      token: { label: "Token", type: "text" }
    },
    async authorize(credentials) {
      const token = credentials?.token;
      if (!token) return null;
      const email = await verifyMagicToken(token);
      if (!email) return null;
      const id = userIdFromEmail(email);
      return { id, email, name: email.split("@")[0] };
    }
  }),
  CredentialsProvider({
    id: "password",
    name: "Email & Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = credentials?.email;
      const password = credentials?.password;
      if (!email || !password) return null;

      // Keyed by email, not IP — the harm being prevented is brute-forcing
      // one account's password, which is the same regardless of which IP
      // the attempts come from. Every attempt counts (not just failures) —
      // simpler than a peek-then-record split, and a legitimate user who
      // mistypes once still has plenty of budget left in a 5/15min window.
      const limit = checkRateLimit(`login:${email.toLowerCase()}`, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS);
      if (!limit.allowed) {
        throw new Error("rate_limited");
      }

      const account = await verifyCredentials(email, password);
      if (!account) return null;
      return { id: account.id, email: account.email, name: account.email.split("@")[0] };
    }
  })
];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET
    })
  );
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.sub = user.id;
      if (account?.provider === "github" && user) {
        token.sub = `github-${account.providerAccountId}`;
      }
      if (account?.provider === "google" && user) {
        token.sub = `google-${account.providerAccountId}`;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "resumeproof-dev-secret-change-in-production"
};
