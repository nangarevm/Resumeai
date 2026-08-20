"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type Mode = "signin" | "register" | "forgot" | "reset";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [devLink, setDevLink] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [magicMessage, setMagicMessage] = useState("");
  const [magicDevLink, setMagicDevLink] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setBusy(true);
      signIn("magic-link", { token, callbackUrl: "/candidate" });
      return;
    }
    const rt = params.get("resetToken");
    if (rt) {
      setResetToken(rt);
      setMode("reset");
    }
  }, []);

  function resetMessages() {
    setMessage("");
    setError("");
    setDevLink("");
  }

  async function handleSignIn() {
    resetMessages();
    setBusy(true);
    const res = await signIn("password", { email, password, redirect: false, callbackUrl: "/candidate" });
    setBusy(false);
    if (res?.error) {
      setError("Incorrect email or password.");
      return;
    }
    window.location.href = "/candidate";
  }

  async function handleRegister() {
    resetMessages();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(data.error || "Could not create account.");
      return;
    }
    // Auto sign-in right after a successful registration.
    const signInRes = await signIn("password", { email, password, redirect: false, callbackUrl: "/candidate" });
    setBusy(false);
    if (signInRes?.error) {
      setMode("signin");
      setMessage("Account created — sign in below.");
      return;
    }
    window.location.href = "/candidate";
  }

  async function handleForgotPassword() {
    resetMessages();
    setBusy(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not process that request.");
      return;
    }
    setMessage(data.message);
    if (data.devLink) setDevLink(data.devLink);
  }

  async function handleResetPassword() {
    resetMessages();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not reset password.");
      return;
    }
    setMode("signin");
    setEmail(data.email || "");
    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated — sign in with your new password.");
  }

  async function requestMagicLink() {
    setBusy(true);
    setMagicMessage("");
    setMagicDevLink("");
    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: magicEmail })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMagicMessage(data.error || "Could not send link.");
      return;
    }
    setMagicMessage(data.message || "Link sent.");
    if (data.devLink) setMagicDevLink(data.devLink);
  }

  return (
    <main className="page" style={{ maxWidth: 480, margin: "40px auto" }}>
      <h1>
        {mode === "signin" && "Sign in to ResumeProof"}
        {mode === "register" && "Create your account"}
        {mode === "forgot" && "Reset your password"}
        {mode === "reset" && "Choose a new password"}
      </h1>
      <p className="muted">Your Career Vault is saved per account. Guests use a browser cookie until you sign in.</p>

      {error && (
        <p style={{ color: "#f85149", marginTop: 12 }}>{error}</p>
      )}
      {message && <p style={{ marginTop: 12 }}>{message}</p>}
      {devLink && (
        <p className="muted" style={{ marginTop: 8 }}>
          <a href={devLink}>Open reset link</a>
        </p>
      )}

      {(mode === "signin" || mode === "register") && (
        <>
          <label className="muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <label className="muted">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", marginBottom: 8 }}
          />
          {mode === "register" && (
            <>
              <label className="muted">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", marginBottom: 8 }}
              />
            </>
          )}

          <button className="btn-primary" type="button" disabled={busy} onClick={mode === "signin" ? handleSignIn : handleRegister}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <p style={{ marginTop: 12 }}>
            {mode === "signin" ? (
              <>
                <a href="#" onClick={(e) => { e.preventDefault(); resetMessages(); setMode("register"); }}>
                  Create an account
                </a>
                {" · "}
                <a href="#" onClick={(e) => { e.preventDefault(); resetMessages(); setMode("forgot"); }}>
                  Forgot password?
                </a>
              </>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); resetMessages(); setMode("signin"); }}>
                Already have an account? Sign in
              </a>
            )}
          </p>
        </>
      )}

      {mode === "forgot" && (
        <>
          <label className="muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button className="btn-primary" type="button" disabled={busy} onClick={handleForgotPassword}>
            Send reset link
          </button>
          <p style={{ marginTop: 12 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); resetMessages(); setMode("signin"); }}>
              Back to sign in
            </a>
          </p>
        </>
      )}

      {mode === "reset" && (
        <>
          <label className="muted">New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <label className="muted">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button className="btn-primary" type="button" disabled={busy} onClick={handleResetPassword}>
            Set new password
          </button>
        </>
      )}

      {(mode === "signin" || mode === "register") && (
        <>
          <hr style={{ margin: "24px 0", borderColor: "#333" }} />

          <label className="muted">Email magic link (no password)</label>
          <input
            type="email"
            value={magicEmail}
            onChange={(e) => setMagicEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button className="btn-ghost" type="button" disabled={busy} onClick={requestMagicLink}>
            Send magic link
          </button>
          {magicMessage && <p style={{ marginTop: 8 }}>{magicMessage}</p>}
          {magicDevLink && (
            <p className="muted" style={{ marginTop: 8 }}>
              <a href={magicDevLink}>Open sign-in link</a>
            </p>
          )}

          <hr style={{ margin: "24px 0", borderColor: "#333" }} />

          <button className="btn-ghost" type="button" onClick={() => signIn("google", { callbackUrl: "/candidate" })}>
            Sign in with Google
          </button>
          <p className="muted" style={{ marginTop: 8, marginBottom: 12, fontSize: 12 }}>
            Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment.
          </p>

          <button className="btn-ghost" type="button" onClick={() => signIn("github", { callbackUrl: "/candidate" })}>
            Sign in with GitHub
          </button>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Requires GITHUB_ID and GITHUB_SECRET in environment.
          </p>
        </>
      )}

      <p style={{ marginTop: 24 }}>
        <a href="/candidate">Continue as guest</a>
      </p>
    </main>
  );
}
