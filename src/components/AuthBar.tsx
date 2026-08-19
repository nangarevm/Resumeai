"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

function AuthBarInner() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="muted" style={{ fontSize: 12 }}>Account…</span>;
  }

  if (session?.user) {
    return (
      <div className="chips" style={{ alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {session.user.email || session.user.name || "Signed in"}
        </span>
        <button className="chip" type="button" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <a className="chip" href="/login">
      Sign in (save vault)
    </a>
  );
}

export default function AuthBar() {
  return (
    <SessionProvider>
      <AuthBarInner />
    </SessionProvider>
  );
}
