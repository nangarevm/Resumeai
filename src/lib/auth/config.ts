import { createHash } from "crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { verifyMagicToken } from "./magic-link";

export function userIdFromEmail(email: string): string {
  return `user-${createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 24)}`;
}

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
