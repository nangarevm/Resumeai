"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [devLink, setDevLink] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setBusy(true);
      signIn("magic-link", { token, callbackUrl: "/candidate" });
    }
  }, []);

  async function requestLink() {
    setBusy(true);
    setMessage("");
    setDevLink("");
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Could not send link.");
      return;
    }
    setMessage(data.message || "Link sent.");
    if (data.devLink) setDevLink(data.devLink);
  }

  return (
    <main className="page" style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>Sign in to ResumeProof</h1>
      <p className="muted">Your Career Vault is saved per account. Guests use a browser cookie until you sign in.</p>

      <label className="muted">Email magic link</label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button className="btn-primary" type="button" disabled={busy} onClick={requestLink}>
        Send magic link
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      {devLink && (
        <p className="muted" style={{ marginTop: 8 }}>
          <a href={devLink}>Open sign-in link</a>
        </p>
      )}

      <hr style={{ margin: "24px 0", borderColor: "#333" }} />

      <button
        className="btn-ghost"
        type="button"
        onClick={() => signIn("github", { callbackUrl: "/candidate" })}
      >
        Sign in with GitHub
      </button>
      <p className="muted" style={{ marginTop: 12, fontSize: 12 }}>
        GitHub OAuth requires GITHUB_ID and GITHUB_SECRET in environment.
      </p>

      <p style={{ marginTop: 24 }}>
        <a href="/candidate">Continue as guest</a>
      </p>
    </main>
  );
}
