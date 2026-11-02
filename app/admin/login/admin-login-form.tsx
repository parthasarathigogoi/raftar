"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setError(payload?.error?.message ?? "Invalid email or password.");
      setStatus("idle");
      return;
    }

    const role = payload?.data?.user?.role;
    if (role !== "admin" && role !== "staff") {
      // A valid customer session was just created — discard it so the admin area stays closed.
      await fetch("/api/auth/logout", { method: "POST" });
      setError("This account does not have admin access.");
      setStatus("idle");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login">
      <div className="admin-login-card">
        <Link href="/" className="wordmark">
          RAF<span>TAR</span>
        </Link>
        <h1>Management studio</h1>
        <p className="hint">Sign in with your administrator account to manage trips, registrations, finance and media.</p>

        <form onSubmit={submit}>
          <label className="admin-field">
            <span>Email</span>
            <input
              className="admin-input"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>Password</span>
            <input
              className="admin-input"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <div className="admin-note error">{error}</div>}

          <button className="admin-btn primary" type="submit" disabled={status === "loading"}>
            {status === "loading" ? (
              <>
                <Loader2 className="spin" /> Signing in…
              </>
            ) : (
              <>
                <Lock /> Sign in
              </>
            )}
          </button>
        </form>

        <Link className="back" href="/">
          ← Back to website
        </Link>
      </div>
    </main>
  );
}
